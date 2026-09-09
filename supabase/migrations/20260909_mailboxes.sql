-- Mailboxes are managed from the app UI rather than an env var, so the list
-- lives here. One Resend API key still serves every row.
CREATE TABLE IF NOT EXISTS mailboxes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  address    text        NOT NULL,
  name       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One row per address, case-insensitive. Also what makes seeding idempotent
-- when two requests race on an empty table.
CREATE UNIQUE INDEX IF NOT EXISTS mailboxes_address_key
  ON mailboxes (lower(address));

ALTER TABLE mailboxes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_only" ON mailboxes;
CREATE POLICY "authenticated_only" ON mailboxes
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mailboxes
  TO authenticated, service_role;

-- Realtime: mailbox edits reach open tabs without a refresh. Guarded so the
-- migration can be re-run; ADD TABLE errors if the table is already published.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE mailboxes;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
