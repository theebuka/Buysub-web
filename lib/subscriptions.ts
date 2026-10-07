// ============================================================
// BUYSUB — Subscriptions, derived from paid orders
// ============================================================
// There is no subscriptions table. A subscription is a paid order line with a
// duration. Since migration 08 the API stores each line's starts_at and
// expires_at (what the renewal reminders read); those win when present.
// Otherwise it starts when the order was paid (created_at when paid_at is
// missing, as on older orders) and ends `duration_months` later. One-time
// lines (top-ups, gift cards) have no duration and are not subscriptions.

export type OrderItem = {
  id: string
  product_id: string | null
  product_name: string
  category?: string | null
  billing_period: string
  billing_type?: string | null
  duration_months: number | null
  quantity: number
  unit_price_ngn: number | string
  total_price_ngn: number | string
  starts_at?: string | null
  expires_at?: string | null
  products?: { slug: string; domain: string | null; image_url: string | null } | null
}

export type MyOrder = {
  id: string
  order_ref: string
  status: string
  total_ngn: number | string
  subtotal_ngn: number | string
  discount_ngn: number | string
  wallet_ngn?: number | string | null
  discount_code?: string | null
  payment_method: string
  currency: string
  fx_rate?: number | null
  display_total?: number | null
  created_at: string
  updated_at?: string
  paid_at?: string | null
  order_items?: OrderItem[]
}

export type Subscription = {
  key: string
  item: OrderItem
  order: MyOrder
  start: Date
  end: Date
  daysLeft: number
  state: 'active' | 'ending' | 'ended'
}

export const ENDING_SOON_DAYS = 7
const DAY = 86_400_000

function addMonths(d: Date, months: number): Date {
  const r = new Date(d)
  const day = r.getUTCDate()
  r.setUTCMonth(r.getUTCMonth() + months)
  // 31 Jan + 1 month lands on 3 Mar; clamp to the last day of the target month.
  if (r.getUTCDate() < day) r.setUTCDate(0)
  return r
}

export function subscriptionsFrom(orders: MyOrder[], now = Date.now()): Subscription[] {
  const out: Subscription[] = []
  for (const order of orders) {
    if (order.status !== 'paid') continue
    for (const item of order.order_items || []) {
      const months = Number(item.duration_months)
      if (!months || item.billing_type === 'one_time') continue
      const start = new Date(item.starts_at || order.paid_at || order.created_at)
      if (Number.isNaN(start.getTime())) continue
      const stored = item.expires_at ? new Date(item.expires_at) : null
      const end = stored && !Number.isNaN(stored.getTime()) ? stored : addMonths(start, months)
      const daysLeft = Math.ceil((end.getTime() - now) / DAY)
      out.push({
        key: `${order.order_ref}-${item.id}`,
        item, order, start, end, daysLeft,
        state: daysLeft <= 0 ? 'ended' : daysLeft <= ENDING_SOON_DAYS ? 'ending' : 'active',
      })
    }
  }
  // Soonest to end first among live ones; most recently ended first after.
  return out.sort((a, b) => {
    const la = a.state !== 'ended', lb = b.state !== 'ended'
    if (la !== lb) return la ? -1 : 1
    return la ? a.end.getTime() - b.end.getTime() : b.end.getTime() - a.end.getTime()
  })
}

/** "Ends in 4 days", "Ends tomorrow", "Ended 3 days ago". */
export function endsLabel(s: Pick<Subscription, 'daysLeft'>): string {
  const d = s.daysLeft
  if (d > 1) return `Ends in ${d} days`
  if (d === 1) return 'Ends tomorrow'
  if (d === 0) return 'Ends today'
  if (d === -1) return 'Ended yesterday'
  return `Ended ${-d} days ago`
}

/** cart period key for a stored billing_period ("Quarterly" → "quarterly"). */
export function periodKey(billingPeriod: string): string | null {
  const k = String(billingPeriod || '').toLowerCase()
  return ['quarterly', 'biannual', 'annual'].includes(k) ? k : null
}
