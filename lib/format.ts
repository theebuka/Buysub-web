// ============================================================
// BUYSUB — Formatting (one copy)
// ============================================================
// Replaces the fmt / fmtDate / fmtFull copies in app/dashboard, app/admin and
// app/partners/dashboard as each surface is rebuilt. Same output as those:
// en-NG grouping, "6 Oct 2026" dates, and an em-dash for anything unparseable.
// Storefront prices with currency conversion keep using `format` from
// lib/constants.ts (it rounds to the half unit the checkout charges).

// A plain hyphen for missing values; no em dashes in visible UI copy.
const DASH = '-'

/** ₦12,500. Strings are accepted because some endpoints send amounts as text. */
export function fmtNGN(n: number | string | null | undefined): string {
  const v = Number(n)
  if (n === null || n === undefined || n === '' || !Number.isFinite(v)) return DASH
  return `₦${v.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`
}

function toDate(iso: string | number | Date | null | undefined): Date | null {
  if (iso === null || iso === undefined || iso === '') return null
  const d = iso instanceof Date ? iso : new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/** 6 Oct 2026 */
export function fmtDate(iso: string | number | Date | null | undefined): string {
  const d = toDate(iso)
  return d ? d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : DASH
}

/** 6 Oct 2026, 14:05 */
export function fmtDateTime(iso: string | number | Date | null | undefined): string {
  const d = toDate(iso)
  return d
    ? d.toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : DASH
}

/** "3 min ago", "yesterday", then a date. For feeds and notifications. */
export function fmtRelative(iso: string | number | Date | null | undefined, now = Date.now()): string {
  const d = toDate(iso)
  if (!d) return DASH
  const s = Math.round((now - d.getTime()) / 1000)
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  if (s < 172800) return 'yesterday'
  if (s < 604800) return `${Math.round(s / 86400)} days ago`
  return fmtDate(d)
}

/** "Ada Okonkwo" → "AO"; falls back to the first letter of an email. */
export function initials(nameOrEmail: string | null | undefined): string {
  const s = String(nameOrEmail || '').trim()
  if (!s) return '?'
  if (s.includes('@') && !s.includes(' ')) return s[0].toUpperCase()
  return s.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

/** "music streaming" → "Music streaming" */
export function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

const CATEGORY_LABELS: Record<string, string> = { ai: 'AI', vpn: 'VPN' }

/** Display name for a lower-case category key: "ai" → "AI", "music streaming" → "Music streaming". */
export function categoryLabel(key: string): string {
  return CATEGORY_LABELS[key] ?? titleCase(key)
}

/**
 * A payout period from its boundary dates ('YYYY-MM-DD'; the end is the 1st
 * that closes it): "September 2026" for one month, "Jul – Sep 2026" for longer.
 */
export function fmtPayoutPeriod(start: string | null | undefined, end: string): string {
  const cal = (d: string) => new Date(d + 'T12:00:00Z')
  const last = cal(end); last.setUTCMonth(last.getUTCMonth() - 1)
  const first = start ? cal(start) : last
  const mon = (d: Date) => d.toLocaleDateString('en-NG', { month: 'short', timeZone: 'UTC' })
  if (first.getTime() === last.getTime()) return last.toLocaleDateString('en-NG', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const sameYear = first.getUTCFullYear() === last.getUTCFullYear()
  return `${mon(first)}${sameYear ? '' : ` ${first.getUTCFullYear()}`} – ${mon(last)} ${last.getUTCFullYear()}`
}
