"use client"

import { useState } from "react"
import {
  Inbox,
  Send,
  FileText,
  Trash2,
  AtSign,
  Mails,
  Settings2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { OTHER_MAILBOX } from "@/lib/accounts"
import { Composer } from "./composer"
import { useMailboxes } from "./mailbox-provider"
import { MailboxSettings } from "./mailbox-settings"

const folders = [
  { label: "Inbox", icon: Inbox, value: "inbox" },
  { label: "Sent", icon: Send, value: "sent" },
  { label: "Drafts", icon: FileText, value: "drafts" },
  { label: "Trash", icon: Trash2, value: "trash" },
]

interface SidebarProps {
  active: string
  onSelect: (folder: string) => void
  unreadCount: number
  draftCount: number
  /** Selected mailbox address, OTHER_MAILBOX, or null for all mail. */
  activeMailbox: string | null
  onMailboxSelect: (mailbox: string | null) => void
  /** Unread inbox count keyed by mailbox address (and OTHER_MAILBOX). */
  unreadByMailbox: Record<string, number>
  /** Whether any message failed to route to a configured mailbox. */
  hasOther: boolean
  hideBorder?: boolean
  className?: string
}

export function Sidebar({
  active,
  onSelect,
  unreadCount,
  draftCount,
  activeMailbox,
  onMailboxSelect,
  unreadByMailbox,
  hasOther,
  hideBorder,
  className,
}: SidebarProps) {
  const { mailboxes } = useMailboxes()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const buckets = [
    { key: null, label: "All mail", title: "Every mailbox", icon: Mails },
    ...mailboxes.map((mailbox) => ({
      key: mailbox.address.toLowerCase(),
      label: mailbox.name ?? mailbox.address,
      title: mailbox.address,
      icon: AtSign,
    })),
    ...(hasOther
      ? [
          {
            key: OTHER_MAILBOX,
            label: "Other",
            title: "Delivered to an address that is not one of your mailboxes",
            icon: AtSign,
          },
        ]
      : []),
  ]

  // With a single bucket the switcher would only ever show "All mail".
  const showBuckets = buckets.length > 2

  return (
    <aside
      className={cn(
        "flex h-full flex-col gap-0.5 overflow-y-auto bg-muted/30 px-2 py-5",
        !hideBorder && "border-r",
        className
      )}
    >
      <div className="mb-4 flex items-center gap-2 px-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mail_icon.png" alt="Mail" width={22} height={22} />
        <span className="font-heading text-sm font-semibold">
          Mail
          {process.env.NEXT_PUBLIC_APP_DOMAIN ? (
            <>
              <span className="text-white/50"> | </span>
              {process.env.NEXT_PUBLIC_APP_DOMAIN}
            </>
          ) : null}
        </span>
      </div>
      <Composer />
      {folders.map(({ label, icon: Icon, value }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          className={cn(
            "flex min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
            active === value
              ? "bg-background font-medium text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
          )}
        >
          <Icon className="size-4 shrink-0" />
          <span className="flex-1 truncate text-left">{label}</span>
          {value === "inbox" && unreadCount > 0 && (
            <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground tabular-nums">
              {unreadCount}
            </span>
          )}
          {value === "drafts" && draftCount > 0 && (
            <span className="shrink-0 rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
              {draftCount}
            </span>
          )}
        </button>
      ))}

      {/* One Resend key serves every address, so the mailbox filter stacks on
          top of the folder filter instead of replacing it. */}
      <div className="mt-5 flex flex-col gap-0.5">
        <div className="flex items-center gap-1 pr-1 pl-3">
          <p className="flex-1 truncate text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Mailboxes
          </p>
          <button
            onClick={() => setSettingsOpen(true)}
            title="Manage mailboxes"
            aria-label="Manage mailboxes"
            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
          >
            <Settings2 className="size-3.5" />
          </button>
        </div>

        {mailboxes.length === 0 ? (
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-lg px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
          >
            Add a mailbox to start sending
          </button>
        ) : (
          showBuckets &&
          buckets.map(({ key, label, title, icon: Icon }) => {
            const unread = key === null ? 0 : (unreadByMailbox[key] ?? 0)
            return (
              <button
                key={key ?? "all"}
                onClick={() => onMailboxSelect(key)}
                title={title}
                className={cn(
                  "flex min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  activeMailbox === key
                    ? "bg-background font-medium text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1 truncate text-left">{label}</span>
                {unread > 0 && (
                  <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground tabular-nums">
                    {unread}
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>

      <MailboxSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </aside>
  )
}
