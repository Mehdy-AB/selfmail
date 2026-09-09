-- Multi-mailbox support: which configured address a message belongs to.
--   inbound  → the recipient that matched a mailbox in NEXT_PUBLIC_MAIL_ACCOUNTS
--   outbound → the address the message was sent from
-- Stored lowercase so filters can compare without a function call.
ALTER TABLE emails ADD COLUMN IF NOT EXISTS mailbox text;

UPDATE emails
SET mailbox = lower(
  CASE WHEN direction = 'outbound' THEN from_address ELSE to_address END
)
WHERE mailbox IS NULL;

CREATE INDEX IF NOT EXISTS emails_mailbox_idx ON emails (mailbox);
