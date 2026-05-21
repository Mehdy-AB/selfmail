# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (Next.js with Turbopack)
pnpm build        # Production build
pnpm lint         # ESLint
pnpm format       # Prettier (formats all .ts/.tsx files)
pnpm typecheck    # tsc --noEmit
```

Adding shadcn components:
```bash
pnpm dlx shadcn@latest add <component>
```

## Project

A self-hosted email client for managing custom domain email via Resend + Supabase. Built with Next.js 16 App Router, shadcn/ui (radix-nova style, mist base color), and Tailwind CSS v4.

## Architecture

- `app/` — Next.js App Router pages and server actions
  - `app/api/inbound/route.ts` — Resend inbound webhook; verifies svix signature, inserts email + attachments to Supabase
  - `app/actions/send-email.ts` — Server actions for sending (`sendEmail`) and draft management (`saveDraft`) via Resend SDK
  - `app/auth/callback/route.ts` — Supabase magic-link callback; enforces `ALLOWED_EMAIL` env var
  - `app/layout.tsx` — Root layout; uses `NEXT_PUBLIC_APP_DOMAIN` for dynamic title/description
- `components/mail/` — Core UI: `Sidebar`, `EmailList`, `EmailCard`, `EmailView`, `Composer`, `SplashScreen`
- `components/ui/` — shadcn/ui primitives (added via CLI, not hand-authored)
- `components/theme-provider.tsx` — next-themes wrapper; `d` hotkey toggles dark/light mode
- `lib/supabase/` — SSR-aware Supabase client, server, and middleware helpers
- `proxy.ts` — Next.js middleware: redirects unauthenticated users to `/login`
- `supabase/migrations/` — All database migrations in order

## Environment variables

See `.env.example` for all required variables with descriptions.

Key variables:
- `ALLOWED_EMAIL` — email address permitted to authenticate (server-only)
- `FROM_NAME` — display name on outbound emails (server-only)
- `NEXT_PUBLIC_FROM_ADDRESSES` — comma-separated from-addresses in the composer (build-time)
- `NEXT_PUBLIC_APP_DOMAIN` — domain used for UI branding (build-time)
- `RESEND_API_KEY` — Resend API key for sending
- `RESEND_WEBHOOK_SECRET` — Resend webhook signing secret for inbound
- `SUPABASE_SERVICE_ROLE_KEY` — service-role key for server actions and API routes (bypasses RLS, server-only)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/publishable key (browser-safe)

## Key conventions

- Tailwind v4 — config lives in `app/globals.css` (CSS-first), not `tailwind.config.js`
- RSC-first: pages and layouts are Server Components by default; add `"use client"` only when needed
- Email HTML rendered in `<iframe srcdoc>` to prevent style bleed into the app shell
- `NEXT_PUBLIC_` prefix required for any env var used in client components (inlined at build time)
