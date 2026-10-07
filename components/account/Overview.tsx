'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ButtonLink, Icon, Skeleton } from '@/components/ui'
import { useApi } from '@/lib/useApi'
import { useSession } from '@/lib/useSession'
import { fmtNGN } from '@/lib/format'
import { orderBucket } from '@/lib/status'
import { subscriptionsFrom, type MyOrder } from '@/lib/subscriptions'
import { ROUTES } from '@/lib/routes'
import { PageHead, PanelEmpty, PanelError, RowsSkeleton } from './AccountShell'
import s from './account.module.css'
import c from './cards.module.css'
import { OrderLine, PlanCard, PlanCardSkeleton, PlanGrid } from './cards'
import { markedRead } from './readState'

export default function Overview() {
  const session = useSession()
  const orders = useApi<MyOrder[]>('/v2/me/orders?limit=50')
  const wallet = useApi<{ balance_ngn: number | string }>('/v2/me/wallet')
  const messages = useApi<any[]>('/v2/me/messages')

  const subs = useMemo(() => subscriptionsFrom(orders.data || []), [orders.data])
  const live = subs.filter(x => x.state !== 'ended')
  const ending = live.filter(x => x.state === 'ending')
  const inProgress = (orders.data || []).filter(o => orderBucket(o.status) === 'processing')
  const unread = (messages.data || []).filter(m => !m.is_read && !markedRead.has(m.id))
  const first = (session.user?.full_name || '').split(' ')[0]

  return (
    <>
      <PageHead title={first ? `Hi, ${first}` : 'Your account'} lede="Your plans, orders and wallet in one place." />

      {unread.length > 0 && (
        <Link href={ROUTES.account.messages} className={s.notice}>
          <Icon name="message" size={16} />
          <span style={{ flex: 1, minWidth: 0 }}>
            {unread.length === 1 ? <>New message: <b>{unread[0].subject}</b></> : <><b>{unread.length} new messages</b> from BuySub</>}
          </span>
          <Icon name="chevronRight" size={16} />
        </Link>
      )}

      <div className={`${s.panel} ${s.stats}`}>
        <div className={s.stat}>
          <span className={s.statLabel}>Wallet balance</span>
          <span className={s.statValue}>{wallet.loading ? <Skeleton width={110} height={28} /> : fmtNGN(wallet.data?.balance_ngn ?? 0)}</span>
          <Link href={ROUTES.account.wallet} className={`${s.textLink} ${s.statFoot}`}>View transactions</Link>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>Active plans</span>
          <span className={s.statValue}>{orders.loading ? <Skeleton width={40} height={28} /> : live.length}</span>
          <span className={`${s.statFoot} ${ending.length ? s.warn : ''}`}>
            {ending.length ? `${ending.length} ${ending.length === 1 ? 'ends' : 'end'} this week` : 'None ending this week'}
          </span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>Orders in progress</span>
          <span className={s.statValue}>{orders.loading ? <Skeleton width={40} height={28} /> : inProgress.length}</span>
          <span className={s.statFoot}>Awaiting payment or confirmation</span>
        </div>
      </div>

      <section className={s.section}>
        <div className={s.sectionHead}>
          <h2 className={s.h2}>Your plans</h2>
          {subs.length > 0 && <Link href={ROUTES.account.subscriptions} className={s.textLink}>All subscriptions</Link>}
        </div>
        {orders.loading ? <PlanGrid>{[0, 1, 2].map(i => <PlanCardSkeleton key={i} />)}</PlanGrid>
          : orders.error ? <div className={s.panel}><PanelError message={orders.error} onRetry={orders.reload} /></div>
          : live.length === 0 ? (
            <div className={s.panel}>
              <PanelEmpty title="No active plans" action={<ButtonLink href={ROUTES.shop} variant="secondary" size="md">Browse the shop</ButtonLink>}>
                Subscriptions you pay for show here with their end date, so you can renew in time.
              </PanelEmpty>
            </div>
          ) : <PlanGrid>{live.slice(0, 3).map(x => <PlanCard key={x.key} sub={x} />)}</PlanGrid>}
      </section>

      <section className={s.section}>
        <div className={s.sectionHead}>
          <h2 className={s.h2}>Recent orders</h2>
          {(orders.data?.length || 0) > 0 && <Link href={ROUTES.account.orders} className={s.textLink}>All orders</Link>}
        </div>
        <div className={s.panel}>
          {orders.loading ? <RowsSkeleton n={4} />
            : orders.error ? <PanelError message={orders.error} onRetry={orders.reload} />
            : !orders.data?.length ? <PanelEmpty title="No orders yet">Orders you place on BuySub will appear here.</PanelEmpty>
            : <ul className={c.lines}>{orders.data.slice(0, 5).map(o => <OrderLine key={o.id} o={o} />)}</ul>}
        </div>
      </section>
    </>
  )
}
