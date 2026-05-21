-- Replace unconditional "allow_all" policies with authenticated-only policies.
-- Server actions use the service-role key (bypasses RLS), so this gate only
-- applies to direct API access with the publishable/anon key.

DROP POLICY IF EXISTS "allow_all" ON emails;
DROP POLICY IF EXISTS "allow_all" ON attachments;

CREATE POLICY "authenticated_only" ON emails
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_only" ON attachments
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Revoke anon access. Authenticated users and service_role retain full access.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.emails      FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.attachments FROM anon;
