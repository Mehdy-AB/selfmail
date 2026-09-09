"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { accountLabel } from "@/lib/accounts"
import { useMailboxes } from "./mailbox-provider"
import type { Email } from "@/lib/types"

interface EmailCardProps {
  email: Email
  selected: boolean
  folder?: string
  showMailbox?: boolean
  onClick: () => void
}

function initials(name: string | null, address: string) {
  const source = name ?? address
  return source
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("")
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

export function EmailCard({
  email,
  selected,
  folder,
  showMailbox,
  onClick,
}: EmailCardProps) {
  const { mailboxes } = useMailboxes()
  const isOutbound = email.direction === "outbound"
  const displayName = isOutbound
    ? `To: ${email.to_address}`
    : (email.from_name ?? email.from_address)

  const snippet =
    email.body_text?.slice(0, 120).replace(/\s+/g, " ").trim() ?? ""

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full overflow-hidden rounded-lg px-3 py-3 text-left transition-colors",
        selected ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted/60",
        !email.is_read && !selected && "bg-background"
      )}
    >
      <div className="flex flex-1 items-start gap-3">
        <Avatar className="mt-0.5 size-8 shrink-0">
          <AvatarFallback className="text-[11px]">
            {isOutbound ? "TO" : initials(email.from_name, email.from_address)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "truncate text-sm",
                !email.is_read ? "font-semibold" : "font-medium"
              )}
            >
              {displayName}
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {relativeTime(email.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {showMailbox && email.mailbox && (
              <span
                className="max-w-28 shrink-0 truncate rounded bg-muted px-1 py-px text-[10px] font-medium text-muted-foreground"
                title={email.mailbox}
              >
                {accountLabel(mailboxes, email.mailbox)}
              </span>
            )}
            {folder === "trash" && (
              <span
                className={cn(
                  "shrink-0 rounded px-1 py-px text-[10px] font-medium",
                  email.direction === "outbound"
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                )}
              >
                {email.direction === "outbound" ? "Sent" : "Received"}
              </span>
            )}
            <p
              className={cn(
                "truncate text-xs",
                !email.is_read ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {email.subject}
            </p>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {snippet}
          </p>
        </div>
        {!email.is_read && (
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
        )}
      </div>
    </button>
  )
}
