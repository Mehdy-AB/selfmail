"use client"

import { Inbox, Send, FileText, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Composer } from "./composer"

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
  hideBorder?: boolean
  className?: string
}

export function Sidebar({
  active,
  onSelect,
  unreadCount,
  draftCount,
  hideBorder,
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col gap-0.5 bg-muted/30 px-2 py-5",
        !hideBorder && "border-r",
        className
      )}
    >
      <div className="mb-4 flex items-center gap-2 px-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mail_icon.png" alt="Mail" width={22} height={22} />
        <span className="font-heading text-sm font-semibold">
          Mail{process.env.NEXT_PUBLIC_APP_DOMAIN ? (
            <><span className="text-white/50"> | </span>{process.env.NEXT_PUBLIC_APP_DOMAIN}</>
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
    </aside>
  )
}
