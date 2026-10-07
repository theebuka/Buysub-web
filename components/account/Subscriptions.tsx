'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ButtonLink, SegmentedControl } from '@/components/ui'
import { useApi } from '@/lib/useApi'
import { subscriptionsFrom, ENDING_SOON_DAYS, type MyOrder, type Subscription } from '@/lib/subscriptions'
import { ROUTES } from '@/lib/routes'
import { PageHead, PanelEmpty, PanelError } from './AccountShell'
import { useReorder } from './orderBits'
import { PlanCard, PlanCardSkeleton, PlanGrid } from './cards'
import s from './account.module.css'

/**
 * ?renew=<order item id>: the "Renew now" link in the reminder email and the
 * inbox. Adds that plan to the cart and goes to checkout, once.
 */
function useRenewLink(subs: Subscription[], ready: boolean) {
  const reorder = useReorder()
  const done = useRef(false)
  useEffect(() => {
    if (done.current || !ready) return
    const id = new URLSearchParams(window.location.search).get('renew')
    if (!id) return
    done.current = true
    window.history.replaceState({}, '', window.location.pathname)
    const hit = subs.find(x => x.item.id === id)
    if (hit) reorder([hit.item])
  }, [subs, ready, reorder])
}

export default function Subscriptions() {
  // One page of up to 100 orders covers any realistic account; subscriptions
  // are derived client-side from paid orders (lib/subscriptions.ts).
  const { data, error, loading, reload } = useApi<MyOrder[]>('/v2/me/orders?limit=100&status=completed')
  const [view, setView] = useState<'active' | 'ended'>('active')
  const subs = useMemo(() => subscriptionsFrom(data || []), [data])
  useRenewLink(subs, !loading && !!data)
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
        {loading ? <PlanGrid>{[0, 1, 2].map(i => <PlanCardSkeleton key={i} />)}</PlanGrid>
          : error ? <div className={s.panel}><PanelError message={error} onRetry={reload} /></div>
          : list.length === 0 ? (
            <div className={s.panel}>
              {view === 'active'
                ? <PanelEmpty title="No active plans" action={<ButtonLink href={ROUTES.shop} variant="secondary" size="md">Browse the shop</ButtonLink>}>Paid subscriptions appear here with their end date.</PanelEmpty>
                : <PanelEmpty title="Nothing has ended yet">Plans that run out move here, with a quick way to buy them again.</PanelEmpty>}
            </div>
          ) : <PlanGrid>{list.map(x => <PlanCard key={x.key} sub={x} />)}</PlanGrid>}
        <p className={s.muted}>Renewing adds the same plan to your cart at today’s price. Nothing renews automatically.</p>
      </div>
    </>
  )
}
