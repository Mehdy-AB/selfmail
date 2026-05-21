-- Personal tool: middleware enforces auth, so allow all DB operations.
CREATE POLICY "allow_all" ON emails
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all" ON attachments
  FOR ALL USING (true) WITH CHECK (true);
