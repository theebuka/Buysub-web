// ============================================================
// BUYSUB — Status vocabulary (one copy)
// ============================================================
// Label, tone and tab bucket for every status string the API sends. Tones map
// onto the opaque --bs-badge-* tokens (see CSS_VARS), never rgba tints.
//
// rejected_pending is stage one of a two-stage rejection — reversible via
// /v2/admin/orders/:id/undo-reject and awaiting a confirm — so it is
// action-needed: tone 'pending' (the dimmer warning), never 'error' and never
// the neutral fallback. Terminal rejected and cancelled are 'error'.
// See the workspace CLAUDE.md, contract 5.

export type Tone = 'success' | 'warning' | 'pending' | 'error' | 'neutral' | 'info'

/** Customer-facing order buckets, for /account/orders?status= tabs. */
export type OrderBucket = 'processing' | 'completed' | 'cancelled'

type Def = { label: string; tone: Tone; bucket?: OrderBucket }

const DEFS: Record<string, Def> = {
  // orders
  pending:          { label: 'Awaiting payment', tone: 'warning', bucket: 'processing' },
  pending_manual:   { label: 'Processing',       tone: 'warning', bucket: 'processing' },
  paid:             { label: 'Paid',             tone: 'success', bucket: 'completed' },
  failed:           { label: 'Failed',           tone: 'error',   bucket: 'cancelled' },
  refunded:         { label: 'Refunded',         tone: 'neutral', bucket: 'cancelled' },
  cancelled:        { label: 'Cancelled',        tone: 'error',   bucket: 'cancelled' },
  rejected_pending: { label: 'Under review',     tone: 'pending', bucket: 'processing' },
  rejected:         { label: 'Rejected',         tone: 'error',   bucket: 'cancelled' },
  // partners, affiliates, commissions
  pending_review:   { label: 'Pending review',   tone: 'warning' },
  approved:         { label: 'Approved',         tone: 'success' },
  suspended:        { label: 'Suspended',        tone: 'error' },
  // products
  active:           { label: 'Active',           tone: 'success' },
  hidden:           { label: 'Hidden',           tone: 'neutral' },
  in_stock:         { label: 'In stock',         tone: 'success' },
  out_of_stock:     { label: 'Out of stock',     tone: 'error' },
  preorder:         { label: 'Pre-order',        tone: 'info' },
}

/** Admin sees the raw stage name for rejected_pending; customers see "Under review". */
const ADMIN_LABELS: Record<string, string> = {
  pending_manual: 'Pending (manual)',
  rejected_pending: 'Rejected (pending)',
}

function humanise(s: string): string {
  const t = s.replace(/_/g, ' ').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '—'
}

export function statusLabel(status: string | null | undefined, audience: 'customer' | 'admin' = 'customer'): string {
  const s = String(status || '')
  if (audience === 'admin' && ADMIN_LABELS[s]) return ADMIN_LABELS[s]
  return DEFS[s]?.label ?? humanise(s)
}

export function statusTone(status: string | null | undefined): Tone {
  return DEFS[String(status || '')]?.tone ?? 'neutral'
}

export function orderBucket(status: string | null | undefined): OrderBucket | null {
  return DEFS[String(status || '')]?.bucket ?? null
}

/** CSS colours for a tone, all opaque badge tokens. 'info' borrows the accent. */
export function toneColors(tone: Tone): { bg: string; fg: string } {
  switch (tone) {
    case 'success': return { bg: 'var(--bs-badge-success-bg)', fg: 'var(--bs-badge-success-fg)' }
    case 'warning': return { bg: 'var(--bs-badge-warning-bg)', fg: 'var(--bs-badge-warning-fg)' }
    case 'pending': return { bg: 'var(--bs-badge-pending-bg)', fg: 'var(--bs-badge-pending-fg)' }
    case 'error':   return { bg: 'var(--bs-badge-error-bg)',   fg: 'var(--bs-badge-error-fg)' }
    case 'info':    return { bg: 'var(--bs-badge-neutral-bg)', fg: 'var(--bs-accent-on-surface)' }
    default:        return { bg: 'var(--bs-badge-neutral-bg)', fg: 'var(--bs-badge-neutral-fg)' }
  }
}
