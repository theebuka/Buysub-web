'use client'

// /admin: today at a glance. Numbers that need someone link to the queue
// that clears them.

import { useState } from 'react'
import { Button, StatusBadge } from '@/components/ui'
import { AdminHead, ListRow, Panel, PanelLink, Stats, adminStyles as s } from '@/components/admin/AdminUI'
import { TableState } from '@/components/admin/DataTable'
import { useApi } from '@/lib/useApi'
import { fmtDate, fmtDateTime, fmtNGN } from '@/lib/format'
import { orderHref } from '../_lib/orders'

type Stats = {
  total_revenue: number; revenue_today: number; revenue_this_month: number
  orders_total?: number; orders_today: number; orders_pending_manual: number; orders_paid?: number; orders_rejected_pending?: number
  products_active: number; products_total: number; customers_total: number; partners_pending: number
  top_products?: { name: string; slug?: string; order_count: number; revenue: number }[]
  recent_orders?: { order_ref: string; status: string; total_ngn: number; customer_name?: string; customer_email?: string; created_at: string }[]
  revenue_by_day?: { day: string; revenue: number; orders: number }[]
}

/** admin_dashboard_stats returns only days with paid orders; lay them on a full 30-day axis. */
function fillDays(rows: NonNullable<Stats['revenue_by_day']>) {
  const byDay = new Map(rows.map(r => [String(r.day).slice(0, 10), r]))
  const out: NonNullable<Stats['revenue_by_day']> = []
  const today = new Date()
  for (let i = 30; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - i)).toISOString().slice(0, 10)
    const hit = byDay.get(d)
    out.push({ day: d, revenue: Number(hit?.revenue) || 0, orders: Number(hit?.orders) || 0 })
  }
  return out
}

function RevenueChart({ days }: { days: NonNullable<Stats['revenue_by_day']> }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...days.map(d => Number(d.revenue) || 0))
  const total = days.reduce((a, d) => a + (Number(d.revenue) || 0), 0)
  const orders = days.reduce((a, d) => a + (Number(d.orders) || 0), 0)
  return (
    <Panel title="Revenue, last 30 days" action={<span className={s.muted} style={{ fontSize: 'var(--bs-text-xs)' }}>{fmtNGN(total)} · {orders.toLocaleString()} orders</span>}>
      <div className={s.bars} role="img" aria-label={`Daily revenue for the last ${days.length} days, ${fmtNGN(total)} in total`}>
        {days.map((d, i) => (
          <div key={d.day} className={s.bar} tabIndex={0}
            style={{ height: `${Math.max(1.5, (Number(d.revenue) / max) * 100)}%`, opacity: hover === null ? undefined : hover === i ? 1 : .35 }}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
            aria-label={`${fmtDate(d.day)}: ${fmtNGN(d.revenue)}, ${d.orders} orders`}>
            {hover === i && (
              <span className={s.tip} style={i < 4 ? { left: 0, transform: 'none' } : i > days.length - 5 ? { left: 'auto', right: 0, transform: 'none' } : undefined}>
                <span className={s.muted}>{fmtDate(d.day)}</span>
                <span className={s.strong}>{fmtNGN(d.revenue)}</span>
                <span className={s.muted}>{d.orders} {d.orders === 1 ? 'order' : 'orders'}</span>
              </span>
            )}
          </div>
        ))}
      </div>
      <div className={s.barAxis}><span>{fmtDate(days[0].day)}</span><span>{fmtDate(days[days.length - 1].day)}</span></div>
    </Panel>
  )
}

export function OverviewTab() {
  const { data: st, loading, error, reload } = useApi<Stats>('/v2/admin/stats')

  if (loading && !st) {
    return (
      <>
        <AdminHead title="Overview" />
        <div className={s.stats}>{Array.from({ length: 8 }, (_, i) => <div key={i} className={s.stat}><span className={s.skel} style={{ width: '50%' }} /><span className={s.skel} style={{ width: '70%', height: 20, marginTop: 6 }} /></div>)}</div>
      </>
    )
  }
  if (!st) {
    return (
      <>
        <AdminHead title="Overview" />
        <Panel><TableState error title="Couldn’t load the dashboard" action={<Button size="sm" variant="secondary" onClick={reload}>Try again</Button>}>{error}</TableState></Panel>
      </>
    )
  }

  const top = st.top_products || []
  const recent = st.recent_orders || []
  const days = fillDays(st.revenue_by_day || [])

  return (
    <>
      <AdminHead title="Overview" lede={new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
      <Stats items={[
        { label: 'Revenue today', value: fmtNGN(st.revenue_today), sub: `${(st.orders_today || 0).toLocaleString()} orders today` },
        { label: 'Revenue this month', value: fmtNGN(st.revenue_this_month) },
        { label: 'Revenue, all time', value: fmtNGN(st.total_revenue) },
        { label: 'Customers', value: (st.customers_total || 0).toLocaleString(), href: '/admin/customers' },
        { label: 'Orders needing approval', value: st.orders_pending_manual || 0, href: '/admin/orders?status=pending_manual', attention: st.orders_pending_manual > 0 },
        { label: 'Rejected, awaiting confirmation', value: st.orders_rejected_pending || 0, href: '/admin/rejected', attention: (st.orders_rejected_pending || 0) > 0 },
        { label: 'Partner applications', value: st.partners_pending || 0, href: '/admin/partners?status=pending_review', attention: st.partners_pending > 0 },
        { label: 'Products live', value: `${(st.products_active || 0).toLocaleString()} of ${(st.products_total || 0).toLocaleString()}`, href: '/admin/products' },
      ]} />

      <RevenueChart days={days} />

      <div className={s.grid2}>
        <Panel title="Recent orders" action={<PanelLink href="/admin/orders">All orders</PanelLink>}>
          {recent.length === 0 ? <TableState title="No orders yet" /> : (
            <ul className={s.list}>
              {recent.map(o => (
                <ListRow key={o.order_ref} href={orderHref(o.order_ref)}
                  title={<><span className={s.mono}>{o.order_ref}</span><StatusBadge status={o.status} audience="admin" /></>}
                  sub={`${o.customer_name || o.customer_email || 'Guest'} · ${fmtDateTime(o.created_at)}`}
                  end={fmtNGN(o.total_ngn)} />
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Top products by revenue" action={<PanelLink href="/admin/products">Products</PanelLink>}>
          {top.length === 0 ? <TableState title="No sales yet" /> : (
            <ul className={s.list}>
              {top.map((p, i) => (
                <ListRow key={p.slug || i}
                  lead={<span className={s.muted} style={{ width: 16, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>}
                  title={p.name} sub={`${p.order_count.toLocaleString()} orders`} end={fmtNGN(p.revenue)} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}
