-- Explicit grants required from May 30 2026 (new projects) / Oct 30 2026 (existing projects).
-- Without these, PostgREST/supabase-js returns a 42501 error for tables in the public schema.
grant select, insert, update, delete on public.emails      to anon, authenticated, service_role;
grant select, insert, update, delete on public.attachments to anon, authenticated, service_role;
