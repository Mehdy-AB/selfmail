# selfmail

A self-hosted email client for managing custom domain email. Built with [Next.js](https://nextjs.org), [shadcn/ui](https://ui.shadcn.com), [Tailwind CSS v4](https://tailwindcss.com), [Supabase](https://supabase.com), and [Resend](https://resend.com).

## Features

- Unlimited mailboxes across any number of domains, all on **one Resend API key**, added and edited from the UI
- Inbound email via Resend webhooks, routed to the mailbox it was addressed to
- Outbound email sending via Resend SDK, with a display name per mailbox
- Magic link authentication (single-user)
- Draft saving and editing
- Real-time updates via Supabase Realtime
- Reply and forward with quoted text
- Dark / light mode (toggle with `d`)
- PWA-ready — installable on mobile
- Attachment support

## Architecture

```
Resend (inbound webhook) → /api/inbound → route to mailbox → Supabase (emails table)
Resend (send API)        ← /actions/send-email ← Composer UI
Supabase Auth (magic link OTP) → /auth/callback
```

## Prerequisites

- [Resend](https://resend.com) account with one or more verified custom domains
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
| `FROM_NAME` | Fallback display name for mailboxes saved without one |
| `NEXT_PUBLIC_MAIL_ACCOUNTS` | Optional one-time import into the mailboxes table — see [Mailboxes](#mailboxes) |
| `MAILBOX_STRICT` | Optional. `true` sends inbound mail addressed to a non-configured address straight to Trash |
| `NEXT_PUBLIC_FROM_ADDRESSES` | Deprecated — same one-time import, read only if `NEXT_PUBLIC_MAIL_ACCOUNTS` is unset |
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

1. Verify each domain in the [Resend dashboard](https://resend.com/domains)
2. For each one, set up inbound routing pointing to
   `https://your-deployment.com/api/inbound`
3. Copy the webhook signing secret into `RESEND_WEBHOOK_SECRET`

One Resend API key covers every domain on the account, so adding a mailbox is a
Resend domain plus one more entry in `NEXT_PUBLIC_MAIL_ACCOUNTS`.

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

## Mailboxes

A single Resend key can receive on any number of addresses and domains, so the
app works from a list of mailboxes. **Add and edit them in the app** — in the
sidebar, under *Mailboxes*, click the gear icon. Each one has an address and an
optional display name, and changes take effect immediately in every open tab.

Adding a mailbox is one entry here plus a Resend domain; you never rebuild or
touch an env var.

What this gives you:

- **Sidebar switcher** — All mail, or one mailbox at a time, with its own unread
  count. It stacks on top of the folder filter, so you can view Inbox for one
  address or across every address at once.
- **Routing on receipt** — the To *and* Cc lists are matched against your
  mailboxes. A recipient on a domain you own but never listed (a catch-all
  address) is routed to the first mailbox on that domain; anything else lands in
  an **Other** bucket, which only appears once something is in it. Set
  `MAILBOX_STRICT=true` to send that unrouted mail straight to Trash instead.
- **Reply from the right address** — a reply or forward defaults to the mailbox
  the message arrived on, and sends with that mailbox's display name.

Only a saved mailbox may be used as a sender; the server action rejects
anything else.

Removing a mailbox never deletes mail. Messages already filed against it are
kept and move to the **Other** bucket.

### Upgrading an existing deployment

Run both migrations: `20260908_add_mailbox.sql` backfills the `mailbox` column
on your existing messages, and `20260909_mailboxes.sql` adds the table.

If you were already using `NEXT_PUBLIC_MAIL_ACCOUNTS` (or the older
`NEXT_PUBLIC_FROM_ADDRESSES`), leave it set for one deploy: the first time the
app reads an empty mailboxes table it imports those entries as real mailboxes.
After that the table is the only source of truth and you can drop the env var.

## Branding

After cloning, replace these files with your own:

- `public/icon-192.png`, `public/icon-512.png` — PWA icons
- `public/mail_icon.png` — sidebar and splash screen icon
- `public/manifest.json` — update `name` and `description`

## License

[MIT](LICENSE)
