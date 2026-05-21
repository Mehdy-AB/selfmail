export interface Email {
  id: string
  resend_id: string
  from_address: string
  from_name: string | null
  to_address: string
  subject: string
  body_html: string | null
  body_text: string | null
  is_read: boolean
  direction: "inbound" | "outbound"
  archived: boolean
  is_draft: boolean
  created_at: string
}
