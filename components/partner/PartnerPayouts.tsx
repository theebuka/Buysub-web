'use client'

// Payout details on file, what has been paid, and what is waiting. There is
// no payout-request endpoint: payouts are sent by BuySub, so this page
// reports rather than requests.

import Link from 'next/link'
import { Skeleton } from '@/components/ui'
import { useApi } from '@/lib/useApi'
import { fmtDate, fmtNGN } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { PageHead, PanelEmpty, PanelError, RowsSkeleton } from '@/components/account/AccountShell'
import { usePartner, type Commission, type PartnerStats } from './usePartner'
import s from '@/components/account/account.module.css'

const mask = (n?: string | null) => (n ? `•••• ${String(n).slice(-4)}` : '')
const shortAddr = (a?: string | null) => (a && a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || '')

export default function PartnerPayouts() {
  const { profile } = usePartner()
  const stats = useApi<PartnerStats>('/v2/partners/me/stats')
  // Paid commissions are the payout history; 50 covers a long record.
  const comms = useApi<Commission[]>('/v2/affiliates/me/commissions?limit=50')
  const paid = (comms.data || []).filter(c => c.status === 'paid')
  const st = stats.data
  const isCrypto = /crypto/i.test(profile?.payout_method || '')
  const hasDetails = isCrypto ? !!profile?.wallet_address : !!profile?.account_number

  const money = (v: number | string | undefined) => stats.loading ? <Skeleton width={90} height={28} /> : fmtNGN(v ?? 0)

  return (
    <>
      <PageHead title="Payouts" lede="BuySub sends your commission to the account below." />
      <div className={`${s.panel} ${s.stats}`}>
        <div className={s.stat}>
          <span className={s.statLabel}>Paid to date</span>
          <span className={s.statValue}>{money(st?.earnings_ngn)}</span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>Approved, not yet paid</span>
          <span className={s.statValue}>{money(st?.approved_ngn)}</span>
        </div>
        <div className={s.stat}>
          <span className={s.statLabel}>Pending review</span>
          <span className={s.statValue}>{money(st?.pending_ngn)}</span>
        </div>
      </div>

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
                <span className={s.muted}>{profile.payout_frequency ? `${profile.payout_frequency} payouts` : ''}</span>
              </li>
            </ul>
          )}
        </div>
      </section>

      <section className={s.section}>
        <h2 className={s.h2}>Paid commissions</h2>
        <div className={s.panel}>
          {comms.loading ? <RowsSkeleton n={3} />
            : comms.error ? <PanelError message={comms.error} onRetry={comms.reload} />
            : !paid.length ? <PanelEmpty title="Nothing paid out yet">Commissions move here once BuySub has sent them to you.</PanelEmpty>
            : (
              <ul className={s.rows}>
                {paid.map(c => (
                  <li key={c.id} className={s.row}>
                    <div className={s.rowMain}>
                      <span className={s.rowTitle}>{c.orders?.order_ref ? `Order ${c.orders.order_ref}` : 'Commission'}</span>
                      <span className={s.rowSub}>Paid {fmtDate(c.paid_at || c.created_at)}</span>
                    </div>
                    <span className={s.rowAmount}>{fmtNGN(c.amount_ngn)}</span>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </section>
    </>
  )
}
