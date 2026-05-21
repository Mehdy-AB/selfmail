"use server"

import { Resend } from "resend"
import { supabase } from "@/lib/supabase"

const resend = new Resend(process.env.RESEND_API_KEY)

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
  const { fromAddress, to, subject, body, draftId } = input

  const { data, error } = await resend.emails.send({
    from: `${process.env.FROM_NAME ?? "Mail"} <${fromAddress}>`,
    to,
    subject,
    text: body,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  if (draftId) {
    // Convert the existing draft row into the sent email record
    await supabase
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
    await supabase.from("emails").insert({
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
  const { fromAddress, to, subject, body, draftId } = input

  if (draftId) {
    const { error } = await supabase
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

  const { data, error } = await supabase
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
