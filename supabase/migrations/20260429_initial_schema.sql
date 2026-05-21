-- emails: one row per inbound message
CREATE TABLE emails (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_id    text        UNIQUE NOT NULL,
  from_address text        NOT NULL,
  from_name    text,
  to_address   text        NOT NULL,
  subject      text        NOT NULL,
  body_html    text,
  body_text    text,
  is_read      boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- attachments: files linked to an email, stored in Supabase Storage
CREATE TABLE attachments (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id     uuid        NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  filename     text        NOT NULL,
  content_type text        NOT NULL,
  size_bytes   integer,
  storage_path text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS (policies added when auth is wired up in Phase 6)
ALTER TABLE emails      ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Realtime: push new emails to the frontend without polling
ALTER PUBLICATION supabase_realtime ADD TABLE emails;
