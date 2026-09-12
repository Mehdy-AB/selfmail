"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AVATAR_BUCKET } from "@/lib/accounts"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

/** Public URL for a stored mailbox photo. Builds a string; makes no request. */
export function avatarUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl
}

function initials(name: string | null, address: string): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (words.length > 0) {
    return words
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
  }
  return (address[0] ?? "?").toUpperCase()
}

interface MailboxAvatarProps {
  mailbox: { address: string; name: string | null; avatar_path?: string | null }
  className?: string
  fallbackClassName?: string
}

/** A mailbox's photo, or its initials until it has one. */
export function MailboxAvatar({
  mailbox,
  className,
  fallbackClassName,
}: MailboxAvatarProps) {
  return (
    <Avatar className={className}>
      <AvatarImage src={avatarUrl(mailbox.avatar_path)} alt="" />
      <AvatarFallback
        className={cn("text-[10px] font-medium", fallbackClassName)}
      >
        {initials(mailbox.name, mailbox.address)}
      </AvatarFallback>
    </Avatar>
  )
}
