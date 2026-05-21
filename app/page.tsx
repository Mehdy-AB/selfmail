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
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export default function Page() {
  const [allEmails, setAllEmails] = useState<Email[]>([])
  const [selected, setSelected] = useState<Email | null>(null)
  const [folder, setFolder] = useState("inbox")
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

  const emails = allEmails.filter((e) => {
    if (folder === "inbox")
      return e.direction === "inbound" && !e.archived && !e.is_draft
    if (folder === "sent")
      return e.direction === "outbound" && !e.archived && !e.is_draft
    if (folder === "drafts") return e.is_draft && !e.archived
    if (folder === "trash") return e.archived
    return false
  })

  const unreadCount = allEmails.filter(
    (e) => !e.is_read && e.direction === "inbound" && !e.archived && !e.is_draft
  ).length

  const draftCount = allEmails.filter((e) => e.is_draft && !e.archived).length

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
          />
        </ResizablePanel>
      </ResizablePanelGroup>
      <SplashScreen visible={loading} />
    </>
  )
}
