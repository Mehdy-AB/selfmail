import type { SupabaseClient } from "@supabase/supabase-js"

// Server-only: reads RESEND_API_KEY and writes with the service-role client.

/** One item from GET /emails/receiving/{id}/attachments. */
interface ReceivedAttachment {
  id: string
  filename?: string
  size: number
  content_type: string
  /** Signed, expires after an hour — fetch it straight away. */
  download_url: string
}

interface AttachmentPage {
  has_more: boolean
  data: ReceivedAttachment[]
}

const RESEND_API = "https://api.resend.com"

/**
 * Storage key for an attachment. Keys reject many characters (spaces, accents,
 * slashes) and must be unique per email, where two files can share a name, so
 * the attachment id is part of the key. The original name stays in the DB row.
 */
export function storageKey(
  emailRowId: string,
  attachment: Pick<ReceivedAttachment, "id" | "filename">
): string {
  const safeName =
    (attachment.filename ?? "attachment")
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .slice(-100) || "attachment"
  return `${emailRowId}/${attachment.id}-${safeName}`
}

async function listAttachments(
  resendEmailId: string
): Promise<ReceivedAttachment[]> {
  const all: ReceivedAttachment[] = []
  let after: string | undefined

  // 100 is the API's page maximum; more than that on one email is rare.
  for (;;) {
    const params = new URLSearchParams({ limit: "100" })
    if (after) params.set("after", after)

    const res = await fetch(
      `${RESEND_API}/emails/receiving/${resendEmailId}/attachments?${params}`,
      { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } }
    )
    if (!res.ok) throw new Error(`listing attachments failed: HTTP ${res.status}`)

    const page = (await res.json()) as AttachmentPage
    all.push(...page.data)
    if (!page.has_more || page.data.length === 0) return all
    after = page.data[page.data.length - 1].id
  }
}

/**
 * Downloads a received email's attachments from Resend and stores them.
 *
 * The email.received webhook carries attachment metadata only; the files come
 * from the Attachments API as signed URLs. A failing attachment is logged and
 * skipped rather than failing the rest — the email row already exists by now,
 * so a webhook retry would be deduplicated and could not recover it anyway.
 *
 * Returns how many attachments were saved.
 */
export async function saveAttachments(
  db: SupabaseClient,
  emailRowId: string,
  resendEmailId: string
): Promise<number> {
  let attachments: ReceivedAttachment[]
  try {
    attachments = await listAttachments(resendEmailId)
  } catch (err) {
    console.error("[inbound] attachment list error", resendEmailId, err)
    return 0
  }

  let saved = 0
  for (const attachment of attachments) {
    try {
      // No Authorization header: the URL is already signed, and the API key
      // has no business going to the CDN host.
      const file = await fetch(attachment.download_url)
      if (!file.ok) throw new Error(`download failed: HTTP ${file.status}`)
      const body = Buffer.from(await file.arrayBuffer())
      const path = storageKey(emailRowId, attachment)

      const { error: uploadError } = await db.storage
        .from("attachments")
        .upload(path, body, { contentType: attachment.content_type })
      if (uploadError) throw uploadError

      const { error: rowError } = await db.from("attachments").insert({
        email_id: emailRowId,
        filename: attachment.filename ?? "attachment",
        content_type: attachment.content_type,
        size_bytes: attachment.size,
        storage_path: path,
      })
      if (rowError) throw rowError

      saved++
    } catch (err) {
      console.error("[inbound] attachment error", attachment.id, err)
    }
  }
  return saved
}
