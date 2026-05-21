"use server"

import { Resend } from "resend"
import { createServiceClient } from "@/lib/supabase/service"
import { createClient } from "@/lib/supabase/server"

const resend = new Resend(process.env.RESEND_API_KEY)

async function requireAuth() {
  const auth = await createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) throw new Error("Unauthorized")
}

function validateFromAddress(fromAddress: string) {
  const allowed = (process.env.NEXT_PUBLIC_FROM_ADDRESSES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (allowed.length > 0 && !allowed.includes(fromAddress)) {
    throw new Error("Invalid sender address")
  }
}

interface SendEmailInput {
  fromAddress: string
  to: string
  subject: string
  body: string
  draftId?: string
}

interface SaveDraftInput {
  fromAddress: string
  to: string
  subject: string
  body: string
  draftId?: string
}

export async function sendEmail(input: SendEmailInput) {
  await requireAuth()
  const { fromAddress, to, subject, body, draftId } = input
  validateFromAddress(fromAddress)

  const { data, error } = await resend.emails.send({
    from: `${process.env.FROM_NAME ?? "Mail"} <${fromAddress}>`,
    to,
    subject,
    text: body,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const db = createServiceClient()

  if (draftId) {
    await db
      .from("emails")
      .update({
        resend_id: data!.id,
        is_draft: false,
        to_address: to,
        subject,
        body_text: body,
        is_read: true,
      })
      .eq("id", draftId)
  } else {
    await db.from("emails").insert({
      resend_id: data!.id,
      from_address: fromAddress,
      from_name: process.env.FROM_NAME ?? "Mail",
      to_address: to,
      subject,
      body_text: body,
      direction: "outbound",
      is_read: true,
    })
  }

  return { success: true }
}

export async function saveDraft(input: SaveDraftInput) {
  await requireAuth()
  const { fromAddress, to, subject, body, draftId } = input
  validateFromAddress(fromAddress)

  const db = createServiceClient()

  if (draftId) {
    const { error } = await db
      .from("emails")
      .update({
        from_address: fromAddress,
        to_address: to || "",
        subject: subject || "",
        body_text: body,
      })
      .eq("id", draftId)

    if (error) return { success: false, error: error.message }
    return { success: true, draftId }
  }

  const { data, error } = await db
    .from("emails")
    .insert({
      from_address: fromAddress,
      from_name: process.env.FROM_NAME ?? "Mail",
      to_address: to || "",
      subject: subject || "",
      body_text: body,
      direction: "outbound",
      is_read: true,
      is_draft: true,
    })
    .select("id")
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, draftId: data.id as string }
}
