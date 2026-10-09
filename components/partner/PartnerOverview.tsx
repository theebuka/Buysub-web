'use client'

import Link from 'next/link'
import { Icon, Skeleton, CommissionBadge } from '@/components/ui'
import { useApi } from '@/lib/useApi'
import { fmtDate, fmtNGN } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { PageHead, PanelEmpty, PanelError, RowsSkeleton } from '@/components/account/AccountShell'
import { MainLink } from './PartnerShell'
import { ClicksChart } from './ClicksChart'
import { setupSteps, usePartner, type Commission, type PartnerProfile, type PartnerStats, type Tier } from './usePartner'
import s from '@/components/account/account.module.css'

export function CommissionRow({ c }: { c: Commission }) {
  return (
    <li className={`${s.row} ${s.rowStack}`}>
      <div className={s.rowMain}>
        <span className={s.rowTitle}>{c.orders?.order_ref ? `Order ${c.orders.order_ref}` : 'Order'}</span>
        <span className={s.rowSub}>{fmtDate(c.created_at)}{c.orders?.total_ngn != null ? ` · order total ${fmtNGN(c.orders.total_ngn)}` : ''}</span>
      </div>
      <div className={s.rowEnd}>
        <span className={s.rowAmount}>{fmtNGN(c.amount_ngn)}</span>
        <CommissionBadge status={c.status} />
      </div>
    </li>
  )
}

/** Lifetime referred sales against the tier ladder. Only when tiers are on. */
function TierCard({ tier }: { tier: Tier }) {
  const next = tier.next
  const from = tier.current?.min_sales_ngn ?? 0
  const pct = next ? Math.min(100, Math.max(0, ((tier.sales_ngn - from) / Math.max(1, next.min_sales_ngn - from)) * 100)) : 100
  return (
    <div className={`${s.panel} ${s.panelPad}`} style={{ display: 'grid', gap: 'var(--bs-space-3)' }}>
      <div className={s.sectionHead}>
        <h2 className={s.h2}>{tier.current ? `${tier.current.name} tier` : 'Partner tier'}</h2>
        <span className={s.muted}>{tier.effective_rate}% commission</span>
      </div>
      <div className={s.meter} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}
        aria-label={next ? `Progress to ${next.name}` : 'Top tier reached'}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className={s.secondary}>
        {next
          ? <>{fmtNGN(next.remaining_ngn)} more in referred sales to reach <b>{next.name}</b> ({next.rate}%).</>
          : <>You’re on the top tier. {fmtNGN(tier.sales_ngn)} in referred sales so far.</>}
      </p>
    </div>
  )
}

/** Shown until payouts can be made: payout details and the AML declaration. */
function SetupCard({ profile }: { profile: PartnerProfile }) {
  const steps = setupSteps(profile)
  const left = steps.filter(x => !x.done).length
  if (!left) return null
  return (
    <div className={`${s.panel} ${s.panelPad}`} style={{ display: 'grid', gap: 'var(--bs-space-4)' }}>
      <div style={{ display: 'grid', gap: 4 }}>
        <h2 className={s.h2}>Finish setting up to get paid</h2>
        <p className={s.secondary}>Your link already works and your commission is counted. We hold payouts until {left === 1 ? 'this is' : 'these are'} done.</p>
      </div>
      <ul className={s.setupList}>
        {steps.map(x => (
          <li key={x.key} className={`${s.setupItem} ${x.done ? s.setupDone : ''}`}>
            <span className={s.setupMark} aria-hidden="true"><Icon name="check" size={14} /></span>
            {x.done
              ? <span className={s.setupLabel}>{x.label}<span className="sr-only"> (done)</span></span>
              : <Link href={x.href} className={s.textLink} style={{ fontSize: 'var(--bs-text-md)' }}>{x.label}</Link>}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function PartnerOverview() {
  const { affiliate, profile } = usePartner()
  const stats = useApi<PartnerStats>('/v2/partners/me/stats')
  const recent = useApi<Commission[]>('/v2/affiliates/me/commissions?limit=5')
  const st = stats.data
  const owed = (Number(st?.approved_ngn) || 0) + (Number(st?.pending_ngn) || 0)
  const rate = st?.clicks ? (st.conversions / st.clicks) * 100 : 0
  const last30 = st?.daily || []
  const clicks30 = last30.reduce((n, d) => n + d.clicks, 0)
  const orders30 = last30.reduce((n, d) => n + d.conversions, 0)
  const loading = stats.loading

  const num = (v: number | string | undefined, f: (x: any) => string = x => Number(x).toLocaleString('en-NG')) =>
    loading ? <Skeleton width={80} height={28} /> : f(v ?? 0)

  return (
    <>
      <PageHead
        title="Overview"
        lede={(st?.tier?.effective_rate ?? st?.commission_rate) != null ? `You earn ${st?.tier?.effective_rate ?? st?.commission_rate}% on every order placed through your link.` : 'Share your link. Every order placed through it earns you commission.'}
      />

      <section className={s.section}>
        <h2 className={s.h2}>Your referral link</h2>
        {affiliate && <MainLink code={affiliate.referral_code} />}
        <p className={s.muted}>Shoppers who open it are linked to you for 30 days. <Link className={s.textLink} href={ROUTES.partner.links}>Link to a product or category</Link></p>
      </section>

      {profile && <SetupCard profile={profile} />}

      {stats.error ? <div className={s.panel}><PanelError message={stats.error} onRetry={stats.reload} /></div> : (
        <div className={`${s.panel} ${s.stats}`}>
          <div className={s.stat}>
            <span className={s.statLabel}>Clicks</span>
            <span className={s.statValue}>{num(st?.clicks)}</span>
            <span className={s.statFoot}>All time</span>
          </div>
          <div className={s.stat}>
            <span className={s.statLabel}>Orders</span>
            <span className={s.statValue}>{num(st?.conversions)}</span>
            <span className={s.statFoot}>{!st?.clicks ? 'No clicks yet' : !st.conversions ? 'None yet' : `${rate < 1 ? rate.toFixed(1) : Math.round(rate)}% of clicks`}</span>
          </div>
          <div className={s.stat}>
            <span className={s.statLabel}>Awaiting payout</span>
            <span className={s.statValue}>{num(owed, fmtNGN)}</span>
            <span className={s.statFoot}>{fmtNGN(st?.earnings_ngn ?? 0)} paid to date</span>
          </div>
        </div>
      )}

      {st?.tier && <TierCard tier={st.tier} />}

      <section className={s.section}>
        <div className={s.sectionHead}>
          <h2 className={s.h2}>Last 30 days</h2>
          {last30.length > 0 && <span className={s.muted}>{clicks30.toLocaleString('en-NG')} clicks · {orders30} orders</span>}
        </div>
        <div className={`${s.panel} ${s.panelPad}`}>
          {loading ? <Skeleton height={150} />
            : last30.length && clicks30 > 0 ? <ClicksChart data={last30} />
            : <p className={s.secondary}>No clicks in the last 30 days. Share your link to start seeing activity here.</p>}
        </div>
      </section>

      <section className={s.section}>
        <div className={s.sectionHead}>
          <h2 className={s.h2}>Recent conversions</h2>
          {(recent.data?.length || 0) > 0 && <Link href={ROUTES.partner.conversions} className={s.textLink}>All conversions</Link>}
        </div>
        <div className={s.panel}>
          {recent.loading ? <RowsSkeleton n={3} />
            : recent.error ? <PanelError message={recent.error} onRetry={recent.reload} />
            : !recent.data?.length ? <PanelEmpty title="No conversions yet">When someone orders through your link, the order and your commission show here.</PanelEmpty>
            : <ul className={s.rows}>{recent.data.map(c => <CommissionRow key={c.id} c={c} />)}</ul>}
        </div>
      </section>
    </>
  )
}
