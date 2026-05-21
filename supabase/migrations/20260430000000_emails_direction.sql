ALTER TABLE emails
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'inbound'
    CHECK (direction IN ('inbound', 'outbound')),
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
