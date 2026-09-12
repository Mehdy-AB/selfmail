"use server"

import { revalidatePath } from "next/cache"
import { createServiceClient } from "@/lib/supabase/service"
import { createClient } from "@/lib/supabase/server"
import { AVATAR_BUCKET, isValidAddress } from "@/lib/accounts"

async function requireAuth() {
  const auth = await createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) throw new Error("Unauthorized")
}

interface Result {
  success: boolean
  error?: string
}

function clean(address: string, name: string | null | undefined) {
  return {
    address: address.trim(),
    name: name?.trim() ? name.trim() : null,
  }
}

/** Postgres unique-violation on `mailboxes_address_key`. */
function duplicateError(code?: string) {
  return code === "23505"
}

// The browser resizes photos to a small JPEG before uploading; these limits are
// the backstop, and the bucket enforces the same ones.
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"]
const AVATAR_MAX_BYTES = 1024 * 1024

const AVATAR_MIGRATION_HINT =
  "Photos need a database update: run supabase/migrations/20260912_mailbox_avatars.sql in the Supabase SQL Editor"

/** True when the avatar column or bucket has not been created yet. */
function avatarSchemaMissing(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    /bucket not found/i.test(error.message ?? "")
  )
}

export async function createMailbox(input: {
  address: string
  name?: string | null
}): Promise<Result> {
  await requireAuth()
  const { address, name } = clean(input.address, input.name)

  if (!isValidAddress(address)) {
    return { success: false, error: "Enter a valid email address" }
  }

  const db = createServiceClient()
  const { error } = await db.from("mailboxes").insert({ address, name })

  if (error) {
    return {
      success: false,
      error: duplicateError(error.code)
        ? "That address is already a mailbox"
        : error.message,
    }
  }

  revalidatePath("/")
  return { success: true }
}

export async function updateMailbox(input: {
  id: string
  address: string
  name?: string | null
}): Promise<Result> {
  await requireAuth()
  const { address, name } = clean(input.address, input.name)

  if (!isValidAddress(address)) {
    return { success: false, error: "Enter a valid email address" }
  }

  const db = createServiceClient()
  const { error } = await db
    .from("mailboxes")
    .update({ address, name })
    .eq("id", input.id)

  if (error) {
    return {
      success: false,
      error: duplicateError(error.code)
        ? "That address is already a mailbox"
        : error.message,
    }
  }

  revalidatePath("/")
  return { success: true }
}

/**
 * Removes a mailbox and its photo. Messages already filed against it are left
 * alone — they keep their `mailbox` value and show up under "Other".
 */
export async function deleteMailbox(id: string): Promise<Result> {
  await requireAuth()
  const db = createServiceClient()

  // `*` rather than naming avatar_path, so deleting still works on a database
  // that has not had the avatar migration yet.
  const { data: mailbox } = await db
    .from("mailboxes")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  const { error } = await db.from("mailboxes").delete().eq("id", id)
  if (error) return { success: false, error: error.message }

  // Best effort: an orphaned file is harmless, a failed delete is not worth
  // reporting once the mailbox itself is gone.
  if (mailbox?.avatar_path) {
    await db.storage.from(AVATAR_BUCKET).remove([mailbox.avatar_path])
  }

  revalidatePath("/")
  return { success: true }
}

/** Sets a mailbox's photo from a `FormData` carrying `id` and `file`. */
export async function setMailboxAvatar(formData: FormData): Promise<Result> {
  await requireAuth()

  const id = formData.get("id")
  const file = formData.get("file")
  if (typeof id !== "string" || !(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose a photo first" }
  }
  if (!AVATAR_TYPES.includes(file.type)) {
    return { success: false, error: "Use a JPEG, PNG or WebP image" }
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { success: false, error: "That photo is too large (max 1 MB)" }
  }

  const db = createServiceClient()
  const { data: mailbox, error: readError } = await db
    .from("mailboxes")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (readError) return { success: false, error: readError.message }
  if (!mailbox) return { success: false, error: "Mailbox not found" }

  // A fresh path per upload: public URLs are cached hard by browsers and the
  // CDN, so overwriting in place would keep showing the old photo.
  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
  const path = `${id}/${Date.now()}.${ext}`

  const { error: uploadError } = await db.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type })

  if (uploadError) {
    return {
      success: false,
      error: avatarSchemaMissing(uploadError)
        ? AVATAR_MIGRATION_HINT
        : uploadError.message,
    }
  }

  const { error: updateError } = await db
    .from("mailboxes")
    .update({ avatar_path: path })
    .eq("id", id)

  if (updateError) {
    // Do not leave the upload behind with nothing pointing at it.
    await db.storage.from(AVATAR_BUCKET).remove([path])
    return {
      success: false,
      error: avatarSchemaMissing(updateError)
        ? AVATAR_MIGRATION_HINT
        : updateError.message,
    }
  }

  if (mailbox.avatar_path) {
    await db.storage.from(AVATAR_BUCKET).remove([mailbox.avatar_path])
  }

  revalidatePath("/")
  return { success: true }
}

export async function removeMailboxAvatar(id: string): Promise<Result> {
  await requireAuth()
  const db = createServiceClient()

  const { data: mailbox, error: readError } = await db
    .from("mailboxes")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (readError) return { success: false, error: readError.message }
  if (!mailbox?.avatar_path) return { success: true }

  const { error } = await db
    .from("mailboxes")
    .update({ avatar_path: null })
    .eq("id", id)

  if (error) return { success: false, error: error.message }

  await db.storage.from(AVATAR_BUCKET).remove([mailbox.avatar_path])

  revalidatePath("/")
  return { success: true }
}
