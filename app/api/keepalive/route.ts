import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

// Supabase pauses Free plan projects after 7 days of low activity. A daily
// query keeps the project awake. Delete this route on a paid plan.
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { error } = await createServiceClient()
    .from("emails")
    .select("id")
    .limit(1)

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    )
  }
  return NextResponse.json({ ok: true })
}
