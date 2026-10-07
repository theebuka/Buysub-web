'use client'

// /account/referrals: the customer's share link, the reward terms and what
// they've earned. Rewards are wallet credit, paid when a friend's first order
// is paid (buysub-api-deploy/src/features/referrals.ts). Off until an admin
// switches it on in Settings.

import { ButtonLink, CopyField, Skeleton } from '@/components/ui'
import { useApi } from '@/lib/useApi'
import { fmtDate, fmtNGN } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { PageHead, PanelEmpty, PanelError, RowsSkeleton } from './AccountShell'
import s from './account.module.css'

type Data = {
  enabled: boolean
  reward_ngn: number
  friend_reward_ngn: number
  min_order_ngn: number
  code?: string
  link?: string
  earned_ngn?: number
  referred?: number
  pending_orders?: number
  rewards?: { id: string; friend: string; amount_ngn: number; created_at: string }[]
}

function lede(d: Data) {
  const you = `You get ${fmtNGN(d.reward_ngn)} in your wallet`
  const friend = d.friend_reward_ngn > 0 ? ` and they get ${fmtNGN(d.friend_reward_ngn)}` : ''
  const min = d.min_order_ngn > 0 ? ` of ${fmtNGN(d.min_order_ngn)} or more` : ''
  return `${you}${friend} when a friend makes their first purchase${min} with your link.`
}

export default function Referrals() {
  const { data, error, loading, reload } = useApi<Data>('/v2/me/referrals')

  if (loading && !data) {
    return <><PageHead title="Refer and earn" /><div className={s.panel}><RowsSkeleton n={3} /></div></>
  }
  if (error) return <><PageHead title="Refer and earn" /><div className={s.panel}><PanelError message={error} onRetry={reload} /></div></>
  if (!data?.enabled) {
    return (
      <>
        <PageHead title="Refer and earn" />
        <div className={s.panel}>
          <PanelEmpty title="Not open yet" action={<ButtonLink href={ROUTES.partner.apply} variant="secondary" size="md">See the partner programme</ButtonLink>}>
            Refer and earn isn’t running right now. Businesses and creators can earn commission as BuySub partners.
          </PanelEmpty>
        </div>
      </>
    )
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(`I buy my subscriptions on BuySub and pay in Naira. Use my link: ${data.link}`)}`
  return (
    <>
      <PageHead title="Refer and earn" lede={lede(data)} />

      <div className={s.panel}>
        <div className={s.panelPad} style={{ display: 'grid', gap: 'var(--bs-space-3)' }}>
          <h2 className={s.h2}>Your link</h2>
          {data.link ? <CopyField value={data.link} label="Copy link" /> : <Skeleton height={44} />}
          <div style={{ display: 'flex', gap: 'var(--bs-space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
            <ButtonLink href={wa} external variant="secondary" size="md">Share on WhatsApp</ButtonLink>
            <span className={s.muted}>Code <b className={s.num} style={{ color: 'var(--bs-text-primary)' }}>{data.code}</b></span>
          </div>
        </div>
      </div>

      <div className={`${s.panel} ${s.stats}`}>
        <div className={s.stat}>
          <span className={s.statLabel}>Earned</span>
          <span className={s.statValue}>{fmtNGN(data.earned_ngn ?? 0)}</span>
          <span className={s.statFoot}>Paid into your wallet</span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>Friends who bought</span>
          <span className={s.statValue}>{data.referred ?? 0}</span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>Orders awaiting payment</span>
          <span className={s.statValue}>{data.pending_orders ?? 0}</span>
          <span className={s.statFoot}>Rewarded once they’re paid</span>
        </div>
      </div>

      <section className={s.section}>
        <h2 className={s.h2}>How it works</h2>
        <ol className={s.howList}>
          <li>Share your link. Anyone who opens it and buys within 30 days counts as your referral.</li>
          <li>Your friend pays for their first order{data.min_order_ngn > 0 ? ` of ${fmtNGN(data.min_order_ngn)} or more` : ''}.</li>
          <li>{fmtNGN(data.reward_ngn)} lands in your wallet{data.friend_reward_ngn > 0 ? `, and ${fmtNGN(data.friend_reward_ngn)} in theirs if they have an account` : ''}. Spend it on your next order.</li>
        </ol>
        <p className={s.muted}>One reward per new customer. Buying with your own link doesn’t count.</p>
      </section>

      <section className={s.section}>
        <h2 className={s.h2}>Rewards</h2>
        <div className={s.panel}>
          {!data.rewards?.length
            ? <PanelEmpty title="No rewards yet">When a friend’s first order is paid, it shows here.</PanelEmpty>
            : (
              <ul className={s.rows}>
                {data.rewards.map(r => (
                  <li key={r.id} className={s.row}>
                    <div className={s.rowMain}>
                      <span className={s.rowTitle}>{r.friend}</span>
                      <span className={s.rowSub}>{fmtDate(r.created_at)}</span>
                    </div>
                    <span className={`${s.rowAmount} ${s.pos}`}>+{fmtNGN(r.amount_ngn)}</span>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </section>
    </>
  )
}
