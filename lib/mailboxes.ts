// Server-only: uses the service-role key. Never import from a client component.
import { createServiceClient } from "@/lib/supabase/service"
import { seedAccounts, type MailAccount } from "@/lib/accounts"

export interface MailboxRow extends MailAccount {
  id: string
  created_at: string
}

/**
 * The mailbox list, from the database.
 *
 * On a completely empty table the legacy `NEXT_PUBLIC_MAIL_ACCOUNTS` /
 * `NEXT_PUBLIC_FROM_ADDRESSES` env vars are imported once so an existing
 * deployment keeps working after upgrading. After that the table is the only
 * source of truth and the env vars are ignored.
 */
export async function getMailboxes(): Promise<MailboxRow[]> {
  const db = createServiceClient()

  const { data, error } = await db
    .from("mailboxes")
    .select("id, address, name, created_at")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[mailboxes] read error", error)
    return []
  }
  if (data.length > 0 || seedAccounts.length === 0) {
    return data as MailboxRow[]
  }

  // Empty table with env vars still set — import them. The unique index makes
  // this safe if two requests get here at once.
  const { error: seedError } = await db
    .from("mailboxes")
    .insert(seedAccounts.map((a) => ({ address: a.address, name: a.name })))

  if (seedError && seedError.code !== "23505") {
    console.error("[mailboxes] seed error", seedError)
    return []
  }

  const { data: seeded } = await db
    .from("mailboxes")
    .select("id, address, name, created_at")
    .order("created_at", { ascending: true })

  return (seeded ?? []) as MailboxRow[]
}
