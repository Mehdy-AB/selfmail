"use server"

import { revalidatePath } from "next/cache"
import { createServiceClient } from "@/lib/supabase/service"
import { createClient } from "@/lib/supabase/server"
import { isValidAddress } from "@/lib/accounts"

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
 * Removes a mailbox. Messages already filed against it are left alone — they
 * keep their `mailbox` value and show up under "Other" in the sidebar.
 */
export async function deleteMailbox(id: string): Promise<Result> {
  await requireAuth()

  const db = createServiceClient()
  const { error } = await db.from("mailboxes").delete().eq("id", id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/")
  return { success: true }
}
