'use client'

// Scheduled payouts (buysub-api-deploy/src/features/payouts.ts). Partners are
// paid on the frequency they chose (Monthly, Quarterly, Biannual, Annual) on
// the 1st of the month a new period starts. A payout includes commission
// earned at least hold_days before that date; newer commission rolls into the
// following one, and so does a total under min_ngn. BuySub pays it and marks
// it paid, or declines it with a reason and the money rolls forward.

import Link from 'next/link'
import { Badge, Skeleton } from '@/components/ui'
import { useApi } from '@/lib/useApi'
import { fmtDate, fmtNGN, fmtPayoutPeriod } from '@/lib/format'
import { payoutStatus } from '@/lib/status'
import { ROUTES } from '@/lib/routes'
import { PageHead, PanelEmpty, PanelError, RowsSkeleton } from '@/components/account/AccountShell'
import { usePartner, type Commission } from './usePartner'
import s from '@/components/account/account.module.css'

type Payout = {
  id: string; amount_ngn: number; status: string; created_at: string; processed_at: string | null
  period_start: string | null; period_end: string; frequency: string
  admin_note: string | null; reference: string | null
}
type Payouts = {
  enabled: boolean; min_ngn: number; hold_days: number
  frequency: string; next_payout_date: string; cutoff_at: string
  next_ngn: number; later_ngn: number; has_details: boolean
  open: Payout[]; history: Payout[]
}

const SCHEDULE: Record<string, string> = {
  Monthly: 'on the 1st of every month',
  Quarterly: 'on 1 January, April, July and October',
  Biannual: 'on 1 January and 1 July',
  Annual: 'on 1 January',
}

const mask = (n?: string | null) => (n ? `•••• ${String(n).slice(-4)}` : '')
const shortAddr = (a?: string | null) => (a && a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || '')

// Dates are 'YYYY-MM-DD' period boundaries; read them as calendar dates, not instants.
const cal = (d: string) => new Date(d + 'T12:00:00Z')
const periodLabel = (p: Payout) => fmtPayoutPeriod(p.period_start, p.period_end)

function SchedulePanel({ p }: { p: Payouts }) {
  let status: React.ReactNode = null
  if (!p.enabled) status = <p className={s.secondary}>Payouts are paused right now. Your commission is safe and will be paid when they resume.</p>
  else if (!p.has_details) status = <p className={s.secondary}>Add your payout details below so we can pay you on {fmtDate(cal(p.next_payout_date))}.</p>
  else if (p.next_ngn < p.min_ngn) status = <p className={s.secondary}>Payouts start at {fmtNGN(p.min_ngn)}. Anything below that carries over to the next payout.</p>

  return (
    <div className={s.panelPad} style={{ borderTop: '1px solid var(--bs-border-subtle)', display: 'grid', gap: 'var(--bs-space-2)' }}>
      {p.open.map(o => (
        <p key={o.id} className={s.secondary}>
          Your {periodLabel(o)} payout of <b className={s.num}>{fmtNGN(o.amount_ngn)}</b> is being processed. We’ll let you know when it’s sent.
        </p>
      ))}
      {status}
      <p className={s.muted}>
        You’re paid {p.frequency.toLowerCase()}, {SCHEDULE[p.frequency] ?? SCHEDULE.Monthly}.{' '}
        Each payout includes commission earned at least {p.hold_days} days before, so refunds can settle first.{' '}
        <Link href={`${ROUTES.partner.profile}#payout`} className={s.textLink}>Change frequency</Link>
      </p>
    </div>
  )
}

export default function PartnerPayouts() {
  const { profile } = usePartner()
  const payouts = useApi<Payouts>('/v2/partners/me/payouts')
  const comms = useApi<Commission[]>('/v2/affiliates/me/commissions?limit=50')
  const paid = (comms.data || []).filter(c => c.status === 'paid')
  const p = payouts.data
  const isCrypto = /crypto/i.test(profile?.payout_method || '')
  const hasDetails = isCrypto ? !!profile?.wallet_address : !!profile?.account_number
  const paidTotal = paid.reduce((sum, c) => sum + (Number(c.amount_ngn) || 0), 0)
  const money = (v: number | undefined) => payouts.loading && !p ? <Skeleton width={90} height={28} /> : fmtNGN(v ?? 0)

  return (
    <>
      <PageHead title="Payouts" lede="We pay what you’ve earned on your schedule, to the account on your profile." />
      {payouts.error ? <div className={s.panel}><PanelError message={payouts.error} onRetry={payouts.reload} /></div> : (
        <div className={s.panel}>
          <div className={s.stats}>
            <div className={s.stat}>
              <span className={s.statLabel}>Next payout</span>
              <span className={s.statValue}>{money(p?.next_ngn)}</span>
              <span className={s.statFoot}>{p ? `On ${fmtDate(cal(p.next_payout_date))}, so far` : ''}</span>
            </div>
            <div className={s.stat}>
              <span className={s.statLabel}>Rolls to the payout after</span>
              <span className={s.statValue}>{money(p?.later_ngn)}</span>
              <span className={s.statFoot}>{p ? `Earned within ${p.hold_days} days of the date` : ''}</span>
            </div>
            <div className={s.stat}>
              <span className={s.statLabel}>Paid to date</span>
              <span className={s.statValue}>{comms.loading && !comms.data ? <Skeleton width={90} height={28} /> : fmtNGN(paidTotal)}</span>
            </div>
          </div>
          {p && <SchedulePanel p={p} />}
        </div>
      )}

      <section className={s.section}>
        <div className={s.sectionHead}>
          <h2 className={s.h2}>Payout details</h2>
          <Link href={`${ROUTES.partner.profile}#payout`} className={s.textLink}>Edit</Link>
        </div>
        <div className={s.panel}>
          {!profile ? <RowsSkeleton n={1} /> : !hasDetails ? (
            <PanelEmpty title="No payout details yet">Add a bank account or wallet in your profile so we can pay you.</PanelEmpty>
          ) : (
            <ul className={s.rows}>
              <li className={s.row}>
                <div className={s.rowMain}>
                  <span className={s.rowTitle}>{isCrypto ? `${profile.crypto_token || 'Crypto'}${profile.crypto_chain ? ` on ${profile.crypto_chain}` : ''}` : profile.bank_name}</span>
                  <span className={s.rowSub}>{isCrypto ? shortAddr(profile.wallet_address) : `${profile.account_name} · ${mask(profile.account_number)}`}</span>
                </div>
              </li>
            </ul>
          )}
        </div>
      </section>

      <section className={s.section}>
        <h2 className={s.h2}>History</h2>
        <div className={s.panel}>
          {payouts.loading && !p ? <RowsSkeleton n={2} />
            : !p?.history.length ? <PanelEmpty title="No payouts yet">Each payout and its status shows here.</PanelEmpty>
            : (
              <ul className={s.rows}>
                {p.history.map(h => {
                  const st = payoutStatus(h.status)
                  return (
                    <li key={h.id} className={`${s.row} ${s.rowWrap}`}>
                      <div className={s.rowMain}>
                        <span className={s.rowTitle}>{fmtNGN(h.amount_ngn)}</span>
                        <span className={s.rowSub} style={{ whiteSpace: 'normal' }}>
                          {periodLabel(h)}
                          {h.status === 'paid' && h.processed_at ? ` · Paid ${fmtDate(h.processed_at)}` : ''}
                          {h.reference ? ` · Ref ${h.reference}` : ''}
                          {h.status === 'rejected' && h.admin_note ? ` · ${h.admin_note}. Moved to your next payout` : ''}
                        </span>
                      </div>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </li>
                  )
                })}
              </ul>
            )}
        </div>
      </section>
    </>
  )
}
