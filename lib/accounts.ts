/**
 * Mailbox helpers.
 *
 * A single Resend API key can receive on any number of addresses and domains,
 * so the app works from a list of mailboxes rather than one identity. The list
 * itself lives in the `mailboxes` table and is managed from the UI — these are
 * the pure functions that parse and route against whatever list is passed in.
 */

export interface MailAccount {
  address: string
  /** Display name used on outbound mail and in the mailbox switcher. */
  name: string | null
}

/** Splits on commas that are not inside quotes or angle brackets. */
function splitEntries(spec: string): string[] {
  const entries: string[] = []
  let current = ""
  let inQuotes = false
  let inAngles = false

  for (const char of spec) {
    if (char === '"') inQuotes = !inQuotes
    else if (char === "<" && !inQuotes) inAngles = true
    else if (char === ">" && !inQuotes) inAngles = false
    else if (char === "," && !inQuotes && !inAngles) {
      entries.push(current)
      current = ""
      continue
    }
    current += char
  }
  entries.push(current)
  return entries
}

/** Parses `Name <a@b.com>`, `"Doe, John" <a@b.com>` or a bare `a@b.com`. */
export function parseAddress(input: string): MailAccount | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const angled = trimmed.match(/^(.*)<([^>]*)>\s*$/)
  if (angled) {
    const address = angled[2].trim()
    if (!address) return null
    const name = angled[1]
      .trim()
      .replace(/^"([\s\S]*)"$/, "$1")
      .trim()
    return { address, name: name || null }
  }

  return { address: trimmed, name: null }
}

/** Parses a comma-separated `Name <address>` list. */
export function parseAccounts(spec: string | undefined): MailAccount[] {
  if (!spec) return []

  const accounts: MailAccount[] = []
  const seen = new Set<string>()

  for (const entry of splitEntries(spec)) {
    const account = parseAddress(entry)
    if (!account) continue
    const key = account.address.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    accounts.push({ address: account.address, name: account.name })
  }
  return accounts
}

/**
 * Optional one-time seed for the `mailboxes` table, seeding an existing
 * deployment from the env vars this feature used to read. Once the table has a
 * row, the table is the only source of truth.
 */
export const seedAccounts: MailAccount[] = (() => {
  // Must stay literal `process.env.X` member expressions to be inlined.
  const configured = parseAccounts(process.env.NEXT_PUBLIC_MAIL_ACCOUNTS)
  if (configured.length > 0) return configured
  return parseAccounts(process.env.NEXT_PUBLIC_FROM_ADDRESSES)
})()

function domainOf(address: string): string {
  const at = address.lastIndexOf("@")
  return at === -1 ? "" : address.slice(at + 1).toLowerCase()
}

/** Case-insensitive lookup of a mailbox. */
export function findAccount(
  accounts: MailAccount[],
  address: string | null | undefined
): MailAccount | undefined {
  if (!address) return undefined
  const key = address.trim().toLowerCase()
  return accounts.find((a) => a.address.toLowerCase() === key)
}

/** Human label for a mailbox — its display name, else the bare address. */
export function accountLabel(
  accounts: MailAccount[],
  address: string | null | undefined
): string {
  if (!address) return "Unknown"
  return findAccount(accounts, address)?.name ?? address
}

/** Canonical form used for the `mailbox` column, so filters compare cleanly. */
export function normalizeMailbox(address: string): string {
  return address.trim().toLowerCase()
}

/** Rejects anything that clearly is not a single deliverable address. */
export function isValidAddress(address: string): boolean {
  return /^[^\s@,<>]+@[^\s@,<>.]+(\.[^\s@,<>.]+)+$/.test(address.trim())
}

export interface MailboxMatch {
  /** Configured mailbox this message belongs to, or null if none matched. */
  account: MailAccount | null
  /** The actual recipient address that routed it (may differ on a catch-all). */
  recipient: string | null
}

/**
 * Picks which mailbox a message was addressed to.
 *
 * Exact address match wins. Failing that, a recipient on a domain we own is
 * treated as catch-all and routed to the first mailbox on that domain, so mail
 * to an address you never listed still lands somewhere visible.
 */
export function routeRecipients(
  accounts: MailAccount[],
  recipients: string[]
): MailboxMatch {
  const parsed = recipients
    .map((r) => parseAddress(r))
    .filter((r): r is MailAccount => r !== null)

  for (const recipient of parsed) {
    const account = findAccount(accounts, recipient.address)
    if (account) return { account, recipient: recipient.address }
  }

  for (const recipient of parsed) {
    const domain = domainOf(recipient.address)
    if (!domain) continue
    const account = accounts.find((a) => domainOf(a.address) === domain)
    if (account) return { account, recipient: recipient.address }
  }

  return { account: null, recipient: parsed[0]?.address ?? null }
}

/** `Name <address>` for the Resend `from` field. */
export function formatSender(
  accounts: MailAccount[],
  address: string,
  fallbackName?: string
): string {
  const name = findAccount(accounts, address)?.name ?? fallbackName
  return name ? `${name} <${address}>` : address
}

/** Sidebar bucket for mail that did not match any configured mailbox. */
export const OTHER_MAILBOX = "__other__"
