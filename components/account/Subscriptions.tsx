'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Button, ButtonLink, SegmentedControl } from '@/components/ui'
import { useApi } from '@/lib/useApi'
import { fmtDate } from '@/lib/format'
import { subscriptionsFrom, endsLabel, ENDING_SOON_DAYS, type MyOrder, type Subscription } from '@/lib/subscriptions'
import { ROUTES } from '@/lib/routes'
import { PageHead, PanelEmpty, PanelError, RowsSkeleton } from './AccountShell'
import { ItemLogo, useReorder } from './orderBits'
import s from './account.module.css'

function Row({ sub }: { sub: Subscription }) {
  const reorder = useReorder()
  const ended = sub.state === 'ended'
  return (
    <li className={`${s.row} ${s.rowWrap}`}>
      <ItemLogo item={sub.item} />
      <div className={s.rowMain}>
        <span className={s.rowTitle}>{sub.item.product_name}</span>
        <span className={s.rowSub}>
          {sub.item.billing_period} · {fmtDate(sub.start)} to {fmtDate(sub.end)} · <Link href={ROUTES.account.order(sub.order.order_ref)} style={{ color: 'inherit', textDecoration: 'underline' }}>{sub.order.order_ref}</Link>
        </span>
      </div>
      <div className={s.rowEnd}>
        <span className={`${s.muted} ${sub.state === 'ending' ? s.warn : ''}`}>{endsLabel(sub)}</span>
        <Button variant={sub.state === 'ending' ? 'primary' : 'secondary'} size="md" onClick={() => reorder([sub.item])}>
          {ended ? 'Buy again' : 'Renew'}
        </Button>
      </div>
    </li>
  )
}

export default function Subscriptions() {
  // One page of up to 100 orders covers any realistic account; subscriptions
  // are derived client-side from paid orders (lib/subscriptions.ts).
  const { data, error, loading, reload } = useApi<MyOrder[]>('/v2/me/orders?limit=100&status=completed')
  const [view, setView] = useState<'active' | 'ended'>('active')
  const subs = useMemo(() => subscriptionsFrom(data || []), [data])
  const live = subs.filter(x => x.state !== 'ended')
  const ended = subs.filter(x => x.state === 'ended')
  const list = view === 'active' ? live : ended

  return (
    <>
      <PageHead
        title="Subscriptions"
        lede={`Each plan runs from the day it was paid. Plans ending within ${ENDING_SOON_DAYS} days are marked so you can renew in time.`}
      />
      <div className={s.section}>
        <div className={s.toolbar}>
          <SegmentedControl label="Show" value={view} onChange={setView}
            options={[{ value: 'active', label: `Active (${live.length})` }, { value: 'ended', label: `Ended (${ended.length})` }]} />
        </div>
        <div className={s.panel}>
          {loading ? <RowsSkeleton n={3} />
            : error ? <PanelError message={error} onRetry={reload} />
            : list.length === 0 ? (
              view === 'active'
                ? <PanelEmpty title="No active plans" action={<ButtonLink href={ROUTES.shop} variant="secondary" size="md">Browse the shop</ButtonLink>}>Paid subscriptions appear here with their end date.</PanelEmpty>
                : <PanelEmpty title="Nothing has ended yet">Plans that run out move here, with a quick way to buy them again.</PanelEmpty>
            ) : <ul className={s.rows}>{list.map(x => <Row key={x.key} sub={x} />)}</ul>}
        </div>
        <p className={s.muted}>Renewing adds the same plan to your cart at today’s price. Nothing renews automatically.</p>
      </div>
    </>
  )
}
