"use client"

import { useEffect, useState } from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Sidebar } from "@/components/mail/sidebar"
import { EmailList } from "@/components/mail/email-list"
import { EmailView } from "@/components/mail/email-view"
import { SplashScreen } from "@/components/mail/splash-screen"
import { supabase } from "@/lib/supabase"
import type { Email } from "@/lib/types"
import { OTHER_MAILBOX } from "@/lib/accounts"
import {
  MailboxProvider,
  useMailboxes,
} from "@/components/mail/mailbox-provider"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

/** Which sidebar bucket a message belongs to. */
function mailboxKey(email: Email, known: Set<string>): string {
  const mailbox = email.mailbox?.toLowerCase() ?? ""
  return known.has(mailbox) ? mailbox : OTHER_MAILBOX
}

export default function Page() {
  return (
    <MailboxProvider>
      <Mail />
    </MailboxProvider>
  )
}

function Mail() {
  const { mailboxes } = useMailboxes()
  const [allEmails, setAllEmails] = useState<Email[]>([])
  const [selected, setSelected] = useState<Email | null>(null)
  const [folder, setFolder] = useState("inbox")
  const [mailbox, setMailbox] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    supabase
      .from("emails")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setAllEmails(data ?? [])
        setLoading(false)
      })

    const channel = supabase
      .channel("emails")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "emails" },
        (payload) => {
          setAllEmails((prev) => [payload.new as Email, ...prev])
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "emails" },
        (payload) => {
          setAllEmails((prev) =>
            prev.map((e) =>
              e.id === (payload.new as Email).id ? (payload.new as Email) : e
            )
          )
          setSelected((prev) =>
            prev?.id === (payload.new as Email).id
              ? (payload.new as Email)
              : prev
          )
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "emails" },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id
          setAllEmails((prev) => prev.filter((e) => e.id !== deletedId))
          setSelected((prev) => (prev?.id === deletedId ? null : prev))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  function handleMarkRead(id: string) {
    setAllEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, is_read: true } : e))
    )
    setSelected((prev) => (prev?.id === id ? { ...prev, is_read: true } : prev))
  }

  async function handleDelete(id: string) {
    await supabase.from("emails").update({ archived: true }).eq("id", id)
    setAllEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, archived: true } : e))
    )
    setSelected((prev) => (prev?.id === id ? null : prev))
  }

  async function handlePermanentDelete(id: string) {
    await supabase.from("emails").delete().eq("id", id)
    setAllEmails((prev) => prev.filter((e) => e.id !== id))
    setSelected((prev) => (prev?.id === id ? null : prev))
  }

  const knownMailboxes = new Set(mailboxes.map((m) => m.address.toLowerCase()))
  const bucketOf = (e: Email) => mailboxKey(e, knownMailboxes)

  // The mailbox filter stacks on top of the folder filter: Inbox for one
  // address, or Inbox across every address the Resend key receives on.
  const inMailbox = allEmails.filter(
    (e) => mailbox === null || bucketOf(e) === mailbox
  )

  const emails = inMailbox.filter((e) => {
    if (folder === "inbox")
      return e.direction === "inbound" && !e.archived && !e.is_draft
    if (folder === "sent")
      return e.direction === "outbound" && !e.archived && !e.is_draft
    if (folder === "drafts") return e.is_draft && !e.archived
    if (folder === "trash") return e.archived
    return false
  })

  const isUnreadInbox = (e: Email) =>
    !e.is_read && e.direction === "inbound" && !e.archived && !e.is_draft

  const unreadCount = inMailbox.filter(isUnreadInbox).length

  const draftCount = inMailbox.filter((e) => e.is_draft && !e.archived).length

  const unreadByMailbox = allEmails.reduce<Record<string, number>>((acc, e) => {
    if (isUnreadInbox(e)) {
      const key = bucketOf(e)
      acc[key] = (acc[key] ?? 0) + 1
    }
    return acc
  }, {})

  const hasOther = allEmails.some((e) => bucketOf(e) === OTHER_MAILBOX)

  // Only worth labelling a message when the view can mix mailboxes — the same
  // condition that makes the sidebar switcher appear.
  const showMailbox =
    mailbox === null && mailboxes.length + (hasOther ? 1 : 0) > 1

  if (isMobile) {
    return (
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
        {selected ? (
          <EmailView
            email={selected}
            folder={folder}
            onMarkRead={handleMarkRead}
            onDelete={handleDelete}
            onPermanentDelete={handlePermanentDelete}
            onBack={() => setSelected(null)}
            showMailbox={showMailbox}
            isMobile
          />
        ) : (
          <>
            <EmailList
              emails={emails}
              selectedId={null}
              loading={loading}
              folder={folder}
              onSelect={setSelected}
              onMenuClick={() => setSidebarOpen(true)}
              showMailbox={showMailbox}
              isMobile
            />
            <div
              className={cn(
                "fixed inset-0 z-50 transition-opacity duration-300",
                sidebarOpen
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0"
              )}
            >
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setSidebarOpen(false)}
              />
              <div
                className={cn(
                  "relative h-full w-64 bg-background shadow-xl transition-transform duration-300",
                  sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
              >
                <Sidebar
                  active={folder}
                  onSelect={(f) => {
                    setFolder(f)
                    setSidebarOpen(false)
                  }}
                  unreadCount={unreadCount}
                  draftCount={draftCount}
                  activeMailbox={mailbox}
                  onMailboxSelect={(m) => {
                    setMailbox(m)
                    setSidebarOpen(false)
                  }}
                  unreadByMailbox={unreadByMailbox}
                  hasOther={hasOther}
                  hideBorder
                />
              </div>
            </div>
          </>
        )}
        <SplashScreen visible={loading} />
      </div>
    )
  }

  return (
    <>
      <ResizablePanelGroup
        orientation="horizontal"
        defaultLayout={{ sidebar: 16, list: 30, view: 54 }}
        style={{ height: "100dvh", width: "100vw" }}
      >
        <ResizablePanel
          id="sidebar"
          defaultSize="16%"
          minSize="14%"
          maxSize="18%"
        >
          <Sidebar
            active={folder}
            onSelect={setFolder}
            unreadCount={unreadCount}
            draftCount={draftCount}
            activeMailbox={mailbox}
            onMailboxSelect={setMailbox}
            unreadByMailbox={unreadByMailbox}
            hasOther={hasOther}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel id="list" defaultSize="30%" minSize="24%" maxSize="35%">
          <EmailList
            emails={emails}
            selectedId={selected?.id ?? null}
            loading={loading}
            folder={folder}
            onSelect={setSelected}
            showMailbox={showMailbox}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel id="view" defaultSize="54%" minSize="28%" maxSize="62%">
          <EmailView
            email={selected}
            folder={folder}
            onMarkRead={handleMarkRead}
            onDelete={handleDelete}
            onPermanentDelete={handlePermanentDelete}
            showMailbox={showMailbox}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
      <SplashScreen visible={loading} />
    </>
  )
}
