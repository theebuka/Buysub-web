'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ButtonLink, Input, Pagination, Tabs } from '@/components/ui'
import { useApi } from '@/lib/useApi'
import type { MyOrder } from '@/lib/subscriptions'
import { ROUTES } from '@/lib/routes'
import { PageHead, PanelEmpty, PanelError } from './AccountShell'
import { OrderCard, OrderCardSkeleton } from './cards'
import c from './cards.module.css'
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
        {loading ? <div className={c.orders}>{[0, 1, 2].map(i => <OrderCardSkeleton key={i} />)}</div>
          : error ? <div className={s.panel}><PanelError message={error} onRetry={reload} /></div>
          : !data?.length ? (
            <div className={s.panel}>
              {debounced || status
                ? <PanelEmpty title="No matching orders">Try another tab or clear the search.</PanelEmpty>
                : <PanelEmpty title="No orders yet" action={<ButtonLink href={ROUTES.shop} variant="secondary" size="md">Browse the shop</ButtonLink>}>Orders you place will show here with their status.</PanelEmpty>}
            </div>
          ) : <div className={c.orders}>{data.map(o => <OrderCard key={o.id} o={o} />)}</div>}
        {pg && <Pagination page={pg.page} pages={pg.pages} total={pg.total} size="md" onPage={p => router.push(href({ page: p > 1 ? p : null }))} />}
      </div>
    </>
  )
}
