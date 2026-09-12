-- A photo per mailbox, shown in the app: sidebar, composer, message labels.
-- The path is set by the app; the public URL is derived from it client-side.
ALTER TABLE public.mailboxes ADD COLUMN IF NOT EXISTS avatar_path text;

-- Public bucket: an avatar is not sensitive, and a public URL can be rendered
-- straight into an <img> without minting signed URLs that expire. The size and
-- type limits back up the resize the browser does before uploading.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
