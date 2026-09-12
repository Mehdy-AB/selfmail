"use client"

import { useRef, useState, useTransition } from "react"
import {
  Camera,
  Check,
  ImageMinus,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createMailbox,
  deleteMailbox,
  removeMailboxAvatar,
  setMailboxAvatar,
  updateMailbox,
} from "@/app/actions/mailboxes"
import { resizeToSquareJpeg } from "@/lib/resize-image"
import { cn } from "@/lib/utils"
import { MailboxAvatar } from "./mailbox-avatar"
import { useMailboxes, type Mailbox } from "./mailbox-provider"

interface MailboxSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MailboxSettings({ open, onOpenChange }: MailboxSettingsProps) {
  const { mailboxes, refresh } = useMailboxes()

  const [newAddress, setNewAddress] = useState("")
  const [newName, setNewName] = useState("")
  const [addError, setAddError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAddress, setEditAddress] = useState("")
  const [editName, setEditName] = useState("")
  const [editError, setEditError] = useState<string | null>(null)

  const [pendingDelete, setPendingDelete] = useState<Mailbox | null>(null)
  const [isPending, startTransition] = useTransition()

  // One hidden file input serves every row; photoTarget says which mailbox the
  // chosen file is for.
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoTarget, setPhotoTarget] = useState<string | null>(null)
  const [photoPendingId, setPhotoPendingId] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<{
    id: string
    message: string
  } | null>(null)

  function handleAdd() {
    setAddError(null)
    startTransition(async () => {
      const result = await createMailbox({ address: newAddress, name: newName })
      if (result.success) {
        setNewAddress("")
        setNewName("")
        await refresh()
      } else {
        setAddError(result.error ?? "Could not add mailbox")
      }
    })
  }

  function startEdit(mailbox: Mailbox) {
    setEditingId(mailbox.id)
    setEditAddress(mailbox.address)
    setEditName(mailbox.name ?? "")
    setEditError(null)
  }

  function handleSaveEdit() {
    if (!editingId) return
    setEditError(null)
    startTransition(async () => {
      const result = await updateMailbox({
        id: editingId,
        address: editAddress,
        name: editName,
      })
      if (result.success) {
        setEditingId(null)
        await refresh()
      } else {
        setEditError(result.error ?? "Could not save mailbox")
      }
    })
  }

  function handleDelete(mailbox: Mailbox) {
    startTransition(async () => {
      await deleteMailbox(mailbox.id)
      setPendingDelete(null)
      await refresh()
    })
  }

  function pickPhoto(mailbox: Mailbox) {
    setPhotoError(null)
    setPhotoTarget(mailbox.id)
    fileInputRef.current?.click()
  }

  async function handlePhotoChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const id = photoTarget
    // Reset so picking the same file again still fires a change event.
    e.target.value = ""
    if (!file || !id) return

    setPhotoPendingId(id)
    try {
      const photo = await resizeToSquareJpeg(file)
      const form = new FormData()
      form.append("id", id)
      form.append("file", photo, "avatar.jpg")

      const result = await setMailboxAvatar(form)
      if (result.success) await refresh()
      else setPhotoError({ id, message: result.error ?? "Could not save photo" })
    } catch (err) {
      setPhotoError({
        id,
        message: err instanceof Error ? err.message : "Could not read that image",
      })
    } finally {
      setPhotoPendingId(null)
    }
  }

  async function handleRemovePhoto(mailbox: Mailbox) {
    setPhotoError(null)
    setPhotoPendingId(mailbox.id)
    try {
      const result = await removeMailboxAvatar(mailbox.id)
      if (result.success) await refresh()
      else
        setPhotoError({
          id: mailbox.id,
          message: result.error ?? "Could not remove photo",
        })
    } finally {
      setPhotoPendingId(null)
    }
  }

  const photoBusy = photoPendingId !== null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mailboxes</DialogTitle>
            <DialogDescription>
              Every address this app sends and receives on. They all share the
              one Resend API key — each address needs its domain verified in
              Resend, with inbound routing pointed at this app. Click a
              mailbox&rsquo;s picture to set its photo.
            </DialogDescription>
          </DialogHeader>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handlePhotoChosen}
          />

          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {mailboxes.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No mailboxes yet. Add your first one below.
              </p>
            )}

            {mailboxes.map((mailbox) => {
              if (editingId === mailbox.id) {
                return (
                  <div
                    key={mailbox.id}
                    className="flex flex-col gap-2 rounded-lg border p-3"
                  >
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Display name (optional)"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="you@yourdomain.com"
                      className="h-8 text-sm"
                      type="email"
                    />
                    {editError && (
                      <p className="text-xs text-destructive">{editError}</p>
                    )}
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => setEditingId(null)}
                        disabled={isPending}
                      >
                        <X className="size-3.5" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={handleSaveEdit}
                        disabled={isPending || !editAddress.trim()}
                      >
                        <Check className="size-3.5" />
                        Save
                      </Button>
                    </div>
                  </div>
                )
              }

              const uploading = photoPendingId === mailbox.id
              const hasPhoto = !!mailbox.avatar_path

              return (
                <div
                  key={mailbox.id}
                  className="flex flex-col rounded-lg px-3 py-2 transition-colors hover:bg-muted/60"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => pickPhoto(mailbox)}
                      disabled={photoBusy}
                      title={hasPhoto ? "Change photo" : "Add photo"}
                      aria-label={`${hasPhoto ? "Change" : "Add"} photo for ${mailbox.address}`}
                      className="group/photo relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
                    >
                      <MailboxAvatar
                        mailbox={mailbox}
                        className="size-9"
                        fallbackClassName="text-xs"
                      />
                      <span
                        className={cn(
                          "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white transition-opacity",
                          uploading
                            ? "opacity-100"
                            : "opacity-0 group-hover/photo:opacity-100 group-focus-visible/photo:opacity-100"
                        )}
                      >
                        {uploading ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Camera className="size-4" />
                        )}
                      </span>
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {mailbox.name ?? mailbox.address}
                      </p>
                      {mailbox.name && (
                        <p className="truncate text-xs text-muted-foreground">
                          {mailbox.address}
                        </p>
                      )}
                    </div>

                    {hasPhoto && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-muted-foreground"
                        onClick={() => handleRemovePhoto(mailbox)}
                        disabled={photoBusy}
                        title="Remove photo"
                        aria-label={`Remove photo for ${mailbox.address}`}
                      >
                        <ImageMinus className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-muted-foreground"
                      onClick={() => startEdit(mailbox)}
                      disabled={isPending}
                      aria-label={`Edit ${mailbox.address}`}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setPendingDelete(mailbox)}
                      disabled={isPending}
                      aria-label={`Remove ${mailbox.address}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>

                  {photoError?.id === mailbox.id && (
                    <p className="mt-1.5 text-xs text-destructive">
                      {photoError.message}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex flex-col gap-2 border-t pt-4">
            <Label className="text-xs text-muted-foreground">Add mailbox</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Display name (optional)"
              className="h-8 text-sm"
            />
            <Input
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newAddress.trim()) handleAdd()
              }}
              placeholder="contact@yourdomain.com"
              className="h-8 text-sm"
              type="email"
            />
            {addError && <p className="text-xs text-destructive">{addError}</p>}
            <Button
              size="sm"
              className="h-8 gap-1.5 self-end text-xs"
              onClick={handleAdd}
              disabled={isPending || !newAddress.trim()}
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(v) => !v && setPendingDelete(null)}
      >
        <DialogContent showCloseButton={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove mailbox?</DialogTitle>
            <DialogDescription>
              {pendingDelete?.address} will no longer be available to send from,
              and new mail addressed to it lands under &ldquo;Other&rdquo;.
              Messages already in this mailbox are kept.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => pendingDelete && handleDelete(pendingDelete)}
              disabled={isPending}
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
