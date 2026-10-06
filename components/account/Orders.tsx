'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ButtonLink, Input, Pagination, StatusBadge, Table, Tabs, type Column } from '@/components/ui'
import { useApi } from '@/lib/useApi'
import { fmtDate, fmtNGN } from '@/lib/format'
import type { MyOrder } from '@/lib/subscriptions'
import { ROUTES } from '@/lib/routes'
import { PageHead, PanelEmpty, PanelError, RowsSkeleton } from './AccountShell'
import { itemsSummary, PAYMENT_LABEL } from './orderBits'
import { OrderRow } from './Overview'
import s from './account.module.css'

const TABS = [
  { value: '', label: 'All' },
  { value: 'processing', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]
const PER_PAGE = 20

export default function Orders() {
  const router = useRouter()
  const params = useSearchParams()
  const status = TABS.some(t => t.value === params.get('status')) ? params.get('status') || '' : ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [q, setQ] = useState(params.get('q') || '')
  const [debounced, setDebounced] = useState(q)
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(t) }, [q])

  const href = (patch: Record<string, string | number | null>) => {
    const p = new URLSearchParams()
    const next = { status, page: page > 1 ? page : null, q: debounced || null, ...patch }
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, String(v))
    const qs = p.toString()
    return qs ? `${ROUTES.account.orders}?${qs}` : ROUTES.account.orders
  }
  useEffect(() => {
    if ((params.get('q') || '') !== debounced) router.replace(href({ q: debounced || null, page: null }), { scroll: false })
    // href reads the current params; only the debounced query should trigger this.
  }, [debounced])

  const qs = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) })
  if (status) qs.set('status', status)
  if (debounced) qs.set('q', debounced)
  const { data, meta, error, loading, reload } = useApi<MyOrder[]>(`/v2/me/orders?${qs}`)
  const pg = meta?.pagination

  const cols: Column<MyOrder>[] = [
    { key: 'order', header: 'Order', hideOnCard: true, cell: o => (
      <div className={s.orderCell}>
        <Link href={ROUTES.account.order(o.order_ref)} className={s.rowTitle} style={{ color: 'var(--bs-text-primary)' }}>{o.order_items?.length ? itemsSummary(o) : `Order ${o.order_ref}`}</Link>
        <span className={s.rowSub}>{o.order_items?.length ? o.order_ref : 'Items not recorded'}</span>
      </div>
    ) },
    { key: 'date', header: 'Date', cell: o => <span className={s.secondary}>{fmtDate(o.created_at)}</span> },
    { key: 'pay', header: 'Payment', cell: o => <span className={s.secondary}>{PAYMENT_LABEL[o.payment_method] || o.payment_method}</span> },
    { key: 'total', header: 'Total', align: 'right', cell: o => <span className={s.rowAmount}>{fmtNGN(o.total_ngn)}</span> },
    { key: 'status', header: 'Status', align: 'right', cell: o => <StatusBadge status={o.status} /> },
  ]

  return (
    <>
      <PageHead title="Orders" lede="Everything you’ve ordered, newest first." />
      <div className={s.section}>
        <div className={`${s.toolbar} ${s.tabsBar}`}>
          <Tabs label="Order status" value={status} items={TABS.map(t => ({ ...t, href: href({ status: t.value || null, page: null }) }))} />
          <div className={s.search}>
            <Input icon="search" fieldSize="md" placeholder="Search by order number" aria-label="Search by order number" value={q} onChange={e => setQ(e.target.value)} />
          </div>
        </div>
        <div className={s.panel}>
          {loading ? <RowsSkeleton n={5} />
            : error ? <PanelError message={error} onRetry={reload} />
            : !data?.length ? (
              debounced || status
                ? <PanelEmpty title="No matching orders">Try another tab or clear the search.</PanelEmpty>
                : <PanelEmpty title="No orders yet" action={<ButtonLink href={ROUTES.shop} variant="secondary" size="md">Browse the shop</ButtonLink>}>Orders you place will show here with their status.</PanelEmpty>
            ) : (
              <>
                {/* A table on desktop; on phones the same compact rows as the overview. */}
                <div className="bs-desktop-only" style={{ padding: '0 var(--bs-space-2)' }}>
                  <Table caption="Your orders" columns={cols} rows={data} rowKey={o => o.id} responsive={false}
                    onRowClick={o => router.push(ROUTES.account.order(o.order_ref))} />
                </div>
                <ul className={`${s.rows} bs-mobile-only`}>{data.map(o => <OrderRow key={o.id} o={o} />)}</ul>
              </>
            )}
        </div>
        {pg && <Pagination page={pg.page} pages={pg.pages} total={pg.total} size="md" onPage={p => router.push(href({ page: p > 1 ? p : null }))} />}
      </div>
    </>
  )
}
