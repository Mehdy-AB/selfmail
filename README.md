# selfmail

A self-hosted email client for managing custom domain email. Built with [Next.js](https://nextjs.org), [shadcn/ui](https://ui.shadcn.com), [Tailwind CSS v4](https://tailwindcss.com), [Supabase](https://supabase.com), and [Resend](https://resend.com).

## Features

- Inbound email via Resend webhooks
- Outbound email sending via Resend SDK
- Magic link authentication (single-user)
- Draft saving and editing
- Real-time updates via Supabase Realtime
- Reply and forward with quoted text
- Dark / light mode (toggle with `d`)
- PWA-ready — installable on mobile
- Attachment support

## Architecture

```
Resend (inbound webhook) → /api/inbound → Supabase (emails table)
Resend (send API)        ← /actions/send-email ← Composer UI
Supabase Auth (magic link OTP) → /auth/callback
```

## Prerequisites

- [Resend](https://resend.com) account with a verified custom domain
- [Supabase](https://supabase.com) project
- Node.js 18+ and [pnpm](https://pnpm.io)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/hashimpk/selfmail.git
cd selfmail
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Resend API key |
| `RESEND_WEBHOOK_SECRET` | Resend inbound webhook signing secret |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (Settings → API Keys → Project URL) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (Settings → API Keys → Publishable key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret key — server-side only, never exposed to the browser (Settings → API Keys → Secret key) |
| `ALLOWED_EMAIL` | **Strongly recommended.** Email address that can sign in. If unset, any person who can receive a magic link can access the app. |
| `FROM_NAME` | Display name for outbound emails |
| `NEXT_PUBLIC_FROM_ADDRESSES` | Comma-separated from-addresses shown in the composer |
| `NEXT_PUBLIC_APP_DOMAIN` | Your domain for UI branding |
| `CRON_SECRET` | Optional. Shared secret for the daily keepalive cron; Vercel sends it as `Authorization: Bearer $CRON_SECRET`. Unset leaves `/api/keepalive` public. |

### 3. Set up the database

Run the migrations against your Supabase project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or paste each file from `supabase/migrations/` into the Supabase SQL editor in order.

### 4. Configure Resend inbound

1. Verify your domain in the [Resend dashboard](https://resend.com/domains)
2. Set up inbound routing pointing to `https://your-deployment.com/api/inbound`
3. Copy the webhook signing secret into `RESEND_WEBHOOK_SECRET`

### 5. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your email.

### 6. Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Set all environment variables in your Vercel project settings. The inbound webhook URL will be `https://your-app.vercel.app/api/inbound`.

`vercel.json` schedules a daily request to `/api/keepalive`, which runs one
query so Supabase doesn't pause the project — Free plan projects are paused
after 7 days of low activity. On a paid plan, delete `vercel.json` and
`app/api/keepalive/`.

## Branding

After cloning, replace these files with your own:

- `public/icon-192.png`, `public/icon-512.png` — PWA icons
- `public/mail_icon.png` — sidebar and splash screen icon
- `public/manifest.json` — update `name` and `description`

## License

[MIT](LICENSE)
