import { Webhook } from "svix"
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

const supabase = createServiceClient()

interface ResendAttachment {
  filename: string
  content_type: string
  size: number
  content: string // base64
}

interface ResendInboundPayload {
  type: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject: string
    html: string | null
    text: string | null
    attachments?: ResendAttachment[]
  }
}

function parseFrom(from: string): { address: string; name: string | null } {
  // Handles both "Name <email@example.com>" and "email@example.com"
  const match = from.match(/^(.+?)\s*<(.+?)>$/)
  if (match) {
    return { name: match[1].trim(), address: match[2].trim() }
  }
  return { name: null, address: from.trim() }
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

  const { email_id, from, to, subject, attachments = [] } = event.data

  const receivedRes = await fetch(
    `https://api.resend.com/emails/receiving/${email_id}`,
    { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } }
  )
  const receivedEmail = receivedRes.ok
    ? ((await receivedRes.json()) as { html?: string; text?: string })
    : {}
  const html = receivedEmail.html ?? null
  const text = receivedEmail.text ?? null
  const { name: fromName, address: fromAddress } = parseFrom(from)

  const blockedSenders = (process.env.BLOCKED_SENDERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const isBlocked = blockedSenders.some((b) =>
    fromAddress.toLowerCase().includes(b)
  )

  const { data: email, error: emailError } = await supabase
    .from("emails")
    .insert({
      resend_id: email_id,
      from_address: fromAddress,
      from_name: fromName,
      to_address: to[0],
      subject,
      body_html: html,
      body_text: text,
      archived: isBlocked,
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

  for (const att of attachments) {
    const buffer = Buffer.from(att.content, "base64")
    const storagePath = `${email.id}/${att.filename}`

    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(storagePath, buffer, { contentType: att.content_type })

    if (uploadError) {
      console.error("[inbound] attachment upload error", uploadError)
      continue
    }

    await supabase.from("attachments").insert({
      email_id: email.id,
      filename: att.filename,
      content_type: att.content_type,
      size_bytes: att.size,
      storage_path: storagePath,
    })
  }

  return NextResponse.json({ received: true })
}
