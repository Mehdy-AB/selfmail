import { Webhook } from "svix"
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { normalizeMailbox, parseAddress, routeRecipients } from "@/lib/accounts"
import { getMailboxes } from "@/lib/mailboxes"
import { saveAttachments } from "@/lib/inbound-attachments"

const supabase = createServiceClient()

// The email.received event carries metadata only: the body and the attachment
// files are fetched from Resend's Receiving API afterwards.
interface ResendInboundPayload {
  type: string
  data: {
    email_id: string
    from: string
    to: string[]
    cc?: string[]
    bcc?: string[]
    /** Addresses Resend actually received for; differs from `to` when forwarded. */
    received_for?: string[]
    subject?: string
    attachments?: { id: string }[]
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    )
  }

  const payload = await req.text()
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  }

  let event: ResendInboundPayload
  try {
    const wh = new Webhook(secret)
    event = wh.verify(payload, headers) as ResendInboundPayload
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ received: true })
  }

  const {
    email_id,
    from,
    to,
    cc = [],
    bcc = [],
    received_for = [],
    subject,
    attachments = [],
  } = event.data

  const receivedRes = await fetch(
    `https://api.resend.com/emails/receiving/${email_id}`,
    { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } }
  )
  if (!receivedRes.ok) {
    // Still store the message — the metadata is enough to show it — but make
    // the cause findable. Usually a wrong or revoked RESEND_API_KEY.
    console.error("[inbound] body fetch failed", email_id, receivedRes.status)
  }
  const receivedEmail = receivedRes.ok
    ? ((await receivedRes.json()) as { html?: string; text?: string })
    : {}
  const html = receivedEmail.html ?? null
  const text = receivedEmail.text ?? null
  const sender = parseAddress(from)
  const fromAddress = sender?.address ?? from.trim()
  const fromName = sender?.name ?? null

  // A single Resend key receives for every mailbox, so work out which one this
  // message belongs to before storing it.
  const mailboxes = await getMailboxes()
  // received_for first: on forwarded mail it is the address that received it.
  const routed = routeRecipients(mailboxes, [
    ...received_for,
    ...to,
    ...cc,
    ...bcc,
  ])
  const toAddress = routed.recipient ?? to[0] ?? ""
  const mailbox = normalizeMailbox(routed.account?.address ?? toAddress)

  const blockedSenders = (process.env.BLOCKED_SENDERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const isBlocked = blockedSenders.some((b) =>
    fromAddress.toLowerCase().includes(b)
  )

  // With MAILBOX_STRICT set, mail to an address that is not one of ours (a
  // catch-all domain collecting spam) is filed straight to Trash.
  const isUnrouted = mailboxes.length > 0 && !routed.account
  const strict = process.env.MAILBOX_STRICT === "true"

  const { data: email, error: emailError } = await supabase
    .from("emails")
    .insert({
      resend_id: email_id,
      from_address: fromAddress,
      from_name: fromName,
      to_address: toAddress,
      mailbox,
      subject: subject ?? "",
      body_html: html,
      body_text: text,
      archived: isBlocked || (strict && isUnrouted),
    })
    .select("id")
    .single()

  if (emailError) {
    // Duplicate resend_id — already processed, safe to ack
    if (emailError.code === "23505") {
      return NextResponse.json({ received: true })
    }
    console.error("[inbound] insert error", emailError)
    return NextResponse.json({ error: "DB error" }, { status: 500 })
  }

  // Skip the API call entirely for the common case of no attachments.
  if (attachments.length > 0) {
    await saveAttachments(supabase, email.id, email_id)
  }

  return NextResponse.json({ received: true })
}
