"use client"

import { useState, useTransition } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      // Access control enforced server-side in /auth/callback via ALLOWED_EMAIL env var
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        setError(error.message)
      } else {
        setSent(true)
      }
    })
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm rounded-xl border bg-background p-8 shadow-sm">
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2.5">
            <h1 className="font-heading text-xl font-semibold">Mail</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Sign in to access your inbox
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
            Check your email — a magic link is on its way.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={isPending || !email}
            >
              {isPending ? "Sending…" : "Send magic link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
