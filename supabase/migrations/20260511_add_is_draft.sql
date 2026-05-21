-- Allow resend_id to be NULL so draft rows can be created before sending
ALTER TABLE emails ALTER COLUMN resend_id DROP NOT NULL;

-- Track whether an email is still a draft (not yet sent)
ALTER TABLE emails ADD COLUMN is_draft BOOLEAN NOT NULL DEFAULT FALSE;
