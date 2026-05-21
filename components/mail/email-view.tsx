"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, Reply, Forward, Trash2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { Composer } from "./composer"
import type { Email } from "@/lib/types"

interface EmailViewProps {
  email: Email | null
  folder?: string
  onMarkRead: (id: string) => void
  onDelete?: (id: string) => void
  onPermanentDelete?: (id: string) => void
  onBack?: () => void
  isMobile?: boolean
}

function initials(name: string | null, address: string) {
  const source = name ?? address
  return source
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("")
}

export function EmailView({
  email,
  folder,
  onMarkRead,
  onDelete,
  onPermanentDelete,
  onBack,
  isMobile,
}: EmailViewProps) {
  const [iframeHeight, setIframeHeight] = useState(0)
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerData, setComposerData] = useState<{
    to?: string
    subject?: string
    body?: string
    draftId?: string
  }>({})
  const [pendingAction, setPendingAction] = useState<
    "trash" | "permanent" | "draft" | null
  >(null)

  const isTrash = folder === "trash"
  const isDraft = folder === "drafts"
  const canDelete = isTrash || isDraft ? !!onPermanentDelete : !!onDelete

  useEffect(() => {
    if (!email || email.is_read) return

    supabase
      .from("emails")
      .update({ is_read: true })
      .eq("id", email.id)
      .then(() => onMarkRead(email.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email?.id, email?.is_read])

  if (!email) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a message to read
      </div>
    )
  }

  const isOutbound = email.direction === "outbound"
  const sender = email.from_name ?? email.from_address
  const date = new Date(email.created_at).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const handleReply = () => {
    setComposerData({
      to: email.from_address,
      subject: `Re: ${email.subject}`,
      body: `\n\n--- On ${date}, ${sender} wrote ---\n\n${email.body_text}`,
    })
    setComposerOpen(true)
  }

  const handleForward = () => {
    setComposerData({
      to: "",
      subject: `Fwd: ${email.subject}`,
      body: `\n\n--- Forwarded message ---\nFrom: ${sender} <${email.from_address}>\nDate: ${date}\nSubject: ${email.subject}\n\n${email.body_text}`,
    })
    setComposerOpen(true)
  }

  const handleEditDraft = () => {
    setComposerData({
      to: email.to_address,
      subject: email.subject,
      body: email.body_text ?? "",
      draftId: email.id,
    })
    setComposerOpen(true)
  }

  const handleConfirmDelete = () => {
    if (pendingAction === "permanent" || pendingAction === "draft") {
      onPermanentDelete?.(email.id)
    } else {
      onDelete?.(email.id)
    }
    setPendingAction(null)
  }

  return (
    <div className="flex h-full flex-col">
      <div className={cn("border-b py-3", isMobile ? "px-4" : "px-6")}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 size-8 shrink-0"
                onClick={onBack}
              >
                <ChevronLeft className="size-4" />
              </Button>
            )}
            <h1 className="truncate font-heading text-base leading-snug font-semibold">
              {email.subject}
            </h1>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="text-[11px]">
              {isOutbound
                ? "TO"
                : initials(email.from_name, email.from_address)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {isOutbound ? `To: ${email.to_address}` : sender}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {isOutbound
                ? `From: ${email.from_address}`
                : `To: ${email.to_address}`}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">{date}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {email.body_html ? (
          <iframe
            srcDoc={email.body_html}
            sandbox=""
            className="w-full border-0"
            style={{ height: iframeHeight > 0 ? iframeHeight : 600 }}
            onLoad={(e) => {
              try {
                const doc = e.currentTarget.contentDocument
                if (doc) setIframeHeight(doc.documentElement.scrollHeight)
              } catch {
                // sandboxed without allow-same-origin; default height is used
              }
            }}
            title={email.subject}
          />
        ) : (
          <div
            className={cn(
              "h-full overflow-y-auto py-4",
              isMobile ? "px-4" : "px-6"
            )}
          >
            <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {email.body_text ?? "No content"}
            </pre>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t bg-muted/20 px-4 py-2">
        {isDraft ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-2 text-xs"
              onClick={handleEditDraft}
            >
              <Reply className="size-3.5" />
              Edit Draft
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-8 gap-2 text-xs text-destructive hover:text-destructive"
                onClick={() => setPendingAction("draft")}
              >
                <Trash2 className="size-3.5" />
                Delete Draft
              </Button>
            )}
          </>
        ) : (
          <>
            {!isTrash && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2 text-xs"
                  onClick={handleReply}
                >
                  <Reply className="size-3.5" />
                  Reply
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2 text-xs"
                  onClick={handleForward}
                >
                  <Forward className="size-3.5" />
                  Forward
                </Button>
              </>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 gap-2 text-xs text-destructive hover:text-destructive",
                  !isTrash && "ml-auto"
                )}
                onClick={() =>
                  setPendingAction(isTrash ? "permanent" : "trash")
                }
              >
                <Trash2 className="size-3.5" />
                {isTrash ? "Delete Permanently" : "Move to Trash"}
              </Button>
            )}
          </>
        )}
      </div>

      <Dialog
        open={pendingAction !== null}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {pendingAction === "draft"
                ? "Delete draft?"
                : pendingAction === "permanent"
                  ? "Delete permanently?"
                  : "Move to Trash?"}
            </DialogTitle>
            <DialogDescription>
              {pendingAction === "draft"
                ? "This draft will be permanently deleted."
                : pendingAction === "permanent"
                  ? "This email will be permanently deleted and cannot be recovered."
                  : "This email will be moved to Trash. You can find it there if needed."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {pendingAction === "draft"
                ? "Delete Draft"
                : pendingAction === "permanent"
                  ? "Delete Permanently"
                  : "Move to Trash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Composer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        initialData={composerData}
      >
        <></>
      </Composer>
    </div>
  )
}
