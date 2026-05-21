"use client"

import { useState } from "react"
import { Search, Menu } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { EmailCard } from "./email-card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Email } from "@/lib/types"

const folderLabel: Record<string, string> = {
  inbox: "Inbox",
  sent: "Sent",
  drafts: "Drafts",
  trash: "Trash",
}

interface EmailListProps {
  emails: Email[]
  selectedId: string | null
  loading: boolean
  folder: string
  onSelect: (email: Email) => void
  onMenuClick?: () => void
  isMobile?: boolean
}

export function EmailList({
  emails,
  selectedId,
  loading,
  folder,
  onSelect,
  onMenuClick,
  isMobile,
}: EmailListProps) {
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? emails.filter((e) => {
        const q = query.toLowerCase()
        return (
          e.subject.toLowerCase().includes(q) ||
          e.from_address.toLowerCase().includes(q) ||
          (e.from_name ?? "").toLowerCase().includes(q)
        )
      })
    : emails

  return (
    <div className={cn("flex h-full flex-col", !isMobile && "border-r")}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 size-8"
              onClick={onMenuClick}
            >
              <Menu className="size-4" />
            </Button>
          )}
          <div>
            <h2 className="font-heading text-sm font-semibold">
              {folderLabel[folder] ?? "Mail"}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {loading
                ? "Loading…"
                : `${filtered.length} message${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      </div>
      <div className="border-b px-3 py-2">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="h-7 pl-8 text-xs"
          />
        </div>
      </div>
      <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="space-y-0.5 p-2">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3 rounded-lg px-3 py-3">
                  <Skeleton className="mt-0.5 size-8 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))
            : filtered.map((email) => (
                <EmailCard
                  key={email.id}
                  email={email}
                  selected={email.id === selectedId}
                  folder={folder}
                  onClick={() => onSelect(email)}
                />
              ))}
          {!loading && filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {query.trim() ? "No results" : "No messages"}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
