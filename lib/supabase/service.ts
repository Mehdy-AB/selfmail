import { createClient } from "@supabase/supabase-js"

// Server-only client using the service-role key. Bypasses RLS — only use in
// trusted server contexts (server actions, API route handlers).
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
