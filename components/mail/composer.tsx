"use client"

import { useState, useTransition, useEffect } from "react"
import { X, Send, MoreVertical, Pencil } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { sendEmail, saveDraft } from "@/app/actions/send-email"
import { findAccount, type MailAccount } from "@/lib/accounts"
import { MailboxAvatar } from "./mailbox-avatar"
import { useMailboxes } from "./mailbox-provider"

const NO_MAILBOX: MailAccount = { address: "", name: null }

/** Falls back to the first mailbox when the requested one does not exist. */
function resolveFrom(options: MailAccount[], address?: string | null): string {
  const match = address
    ? options.find(
        (o) => o.address.toLowerCase() === address.trim().toLowerCase()
      )
    : undefined
  return (match ?? options[0] ?? NO_MAILBOX).address
}

function optionLabel(account: MailAccount): string {
  return account.name ? `${account.name} <${account.address}>` : account.address
}

interface ComposerProps {
  initialData?: {
    /** Mailbox to send from — a reply answers from the address it arrived on. */
    fromAddress?: string | null
    to?: string
    subject?: string
    body?: string
    draftId?: string
  }
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: React.ReactNode
}

export function Composer({
  initialData,
  open: externalOpen,
  onOpenChange: setExternalOpen,
  children,
}: ComposerProps) {
  const { mailboxes } = useMailboxes()
  const [internalOpen, setInternalOpen] = useState(false)

  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = (val: boolean) => {
    if (setExternalOpen) setExternalOpen(val)
    else setInternalOpen(val)
  }

  const [fromAddress, setFromAddress] = useState("")
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [isSending, startSend] = useTransition()
  const [isSaving, startSave] = useTransition()

  const hasContent = !!(to.trim() || subject.trim() || body.trim())
  const isPending = isSending || isSaving

  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setTo(initialData?.to ?? "")
      setSubject(initialData?.subject ?? "")
      setBody(initialData?.body ?? "")
      setActiveDraftId(initialData?.draftId ?? null)
      setError(null)
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, initialData])

  // The sender is settled separately from the rest of the form: the mailbox
  // list may still be loading when the window opens, and an edit to it while
  // composing must not wipe what has already been typed.
  useEffect(() => {
    if (!open) return
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setFromAddress((current) =>
      findAccount(mailboxes, current)
        ? current
        : resolveFrom(mailboxes, initialData?.fromAddress)
    )
  }, [open, initialData, mailboxes])

  function reset() {
    setTo("")
    setSubject("")
    setBody("")
    setActiveDraftId(null)
    setFromAddress(resolveFrom(mailboxes))
    setError(null)
  }

  function doClose() {
    setOpen(false)
    reset()
  }

  function handleCloseAttempt() {
    if (hasContent) {
      setShowDiscardDialog(true)
    } else {
      doClose()
    }
  }

  function handleSend() {
    setError(null)
    startSend(async () => {
      const result = await sendEmail({
        fromAddress,
        to,
        subject,
        body,
        draftId: activeDraftId ?? undefined,
      })
      if (result.success) {
        doClose()
      } else {
        setError(result.error ?? "Failed to send")
      }
    })
  }

  // Saves silently (keeps compose open) — used from ⋮ menu
  function handleSaveDraftSilent() {
    setError(null)
    startSave(async () => {
      const result = await saveDraft({
        fromAddress,
        to,
        subject,
        body,
        draftId: activeDraftId ?? undefined,
      })
      if (result.success) {
        setActiveDraftId(result.draftId ?? null)
      } else {
        setError(result.error ?? "Failed to save draft")
      }
    })
  }

  // Saves and closes — used from discard dialog
  function handleSaveDraftAndClose() {
    setShowDiscardDialog(false)
    startSave(async () => {
      const result = await saveDraft({
        fromAddress,
        to,
        subject,
        body,
        draftId: activeDraftId ?? undefined,
      })
      if (result.success) {
        doClose()
      } else {
        setError(result.error ?? "Failed to save draft")
      }
    })
  }

  function handleDiscard() {
    setShowDiscardDialog(false)
    doClose()
  }

  const canSend = !isPending && !!to && !!subject && !!body && !!fromAddress
  const selectedMailbox = findAccount(mailboxes, fromAddress)

  return (
    <>
      {children ? (
        children
      ) : (
        <Button
          onClick={() => setOpen(true)}
          className="mx-2 my-4 mt-2 w-[calc(100%-1rem)] justify-start gap-2 py-4"
          variant="default"
          size="sm"
        >
          <Pencil className="size-3.5" />
          Compose
        </Button>
      )}

      {/* Compose overlay — full-screen on mobile, large centered modal on desktop */}
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            if (hasContent) {
              setShowDiscardDialog(true)
            } else {
              doClose()
            }
          }
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/20 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={cn(
              "fixed inset-0 z-50 flex flex-col bg-background outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-4",
              "data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-4",
              // Desktop: centered modal
              "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[88vh] sm:w-full sm:max-w-2xl",
              "sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:shadow-2xl sm:ring-1 sm:ring-foreground/10",
              "sm:data-open:slide-in-from-bottom-0 sm:data-open:zoom-in-95",
              "sm:data-closed:slide-out-to-bottom-0 sm:data-closed:zoom-out-95"
            )}
          >
            <DialogPrimitive.Title className="sr-only">
              {activeDraftId ? "Edit Draft" : "New Message"}
            </DialogPrimitive.Title>

            {/* Header bar */}
            <div className="flex shrink-0 items-center gap-0.5 border-b px-2 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground"
                onClick={handleCloseAttempt}
                disabled={isPending}
                aria-label="Close"
              >
                <X className="size-4" />
              </Button>
              <span className="ml-1 flex-1 text-sm font-medium">
                {activeDraftId ? "Edit Draft" : "New Message"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "size-9 transition-colors",
                  canSend ? "text-primary" : "text-muted-foreground"
                )}
                onClick={handleSend}
                disabled={!canSend}
                aria-label="Send"
              >
                <Send className="size-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 text-muted-foreground"
                    aria-label="More options"
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                  <DropdownMenuItem
                    onClick={handleSaveDraftSilent}
                    disabled={isPending || !hasContent}
                  >
                    {activeDraftId ? "Update draft" : "Save as draft"}
                  </DropdownMenuItem>
                  {hasContent && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={handleDiscard}
                      >
                        Discard draft
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Fields */}
            <div className="flex flex-1 flex-col overflow-y-auto">
              {/* To */}
              <div className="flex items-center border-b px-4">
                <span className="w-14 shrink-0 py-2 text-sm text-muted-foreground">
                  To
                </span>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="flex-1 bg-transparent px-1 py-2 text-sm outline-none"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {/* From */}
              <div className="flex items-center border-b px-4">
                <span className="w-14 shrink-0 py-2 text-sm text-muted-foreground">
                  From
                </span>
                {mailboxes.length === 0 && (
                  <span className="flex-1 py-2 text-sm text-muted-foreground">
                    No mailboxes yet — add one under Mailboxes in the sidebar
                  </span>
                )}
                {selectedMailbox && (
                  <MailboxAvatar
                    mailbox={selectedMailbox}
                    className="mr-2 size-5"
                    fallbackClassName="text-[9px]"
                  />
                )}
                <select
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  hidden={mailboxes.length === 0}
                  className="flex-1 appearance-none bg-transparent py-2 text-sm outline-none"
                >
                  {mailboxes.map((opt) => (
                    <option
                      key={opt.address}
                      value={opt.address}
                      className="bg-popover text-popover-foreground"
                    >
                      {optionLabel(opt)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div className="border-b px-4">
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>

              {/* Body */}
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Compose email"
                className="min-h-48 flex-1 resize-none bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
              />

              {error && (
                <p className="px-4 pb-3 text-sm text-destructive">{error}</p>
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Discard confirmation — shown when user tries to close with content */}
      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent showCloseButton={false} className="max-w-xs gap-0 p-0">
          <DialogHeader className="p-4">
            <DialogTitle className="text-center text-base">
              Save draft?
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col overflow-hidden rounded-b-xl">
            <button
              className="px-4 py-2 text-center text-sm transition-colors hover:bg-muted/60"
              onClick={() => setShowDiscardDialog(false)}
            >
              Keep editing
            </button>
            <button
              className="px-4 py-2 text-center text-sm transition-colors hover:bg-muted/60 disabled:opacity-50"
              onClick={handleSaveDraftAndClose}
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : "Save draft"}
            </button>
            <button
              className="rounded-b-xl px-4 py-2 pb-4 text-center text-sm text-destructive transition-colors hover:bg-muted/60"
              onClick={handleDiscard}
            >
              Discard
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
