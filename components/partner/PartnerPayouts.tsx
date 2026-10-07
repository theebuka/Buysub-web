'use client'

// Balance, payout requests and the details payouts go to
// (buysub-api-deploy/src/features/payouts.ts). Commissions become available
// to request once their order has been paid for hold_days (the refund
// window). A request takes everything available; BuySub pays it and marks it
// paid, or declines it with a reason and the money becomes available again.

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge, Button, Skeleton } from '@/components/ui'
import { useApi, invalidate } from '@/lib/useApi'
import { authFetch } from '@/lib/apiAuth'
import { fmtDate, fmtNGN } from '@/lib/format'
import { payoutStatus } from '@/lib/status'
import { ROUTES } from '@/lib/routes'
import { PageHead, PanelEmpty, PanelError, RowsSkeleton } from '@/components/account/AccountShell'
import { usePartner, type Commission } from './usePartner'
import s from '@/components/account/account.module.css'

type Payout = { id: string; amount_ngn: number; status: string; created_at: string; processed_at: string | null; admin_note: string | null; reference: string | null }
type Payouts = {
  enabled: boolean; min_ngn: number; hold_days: number
  available_ngn: number; on_hold_ngn: number
  open: Payout | null; history: Payout[]
}

const mask = (n?: string | null) => (n ? `•••• ${String(n).slice(-4)}` : '')
const shortAddr = (a?: string | null) => (a && a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || '')

function RequestPanel({ p, hasDetails, onDone }: { p: Payouts; hasDetails: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const request = async () => {
    setBusy(true)
    const r = await authFetch('/v2/partners/me/payouts', { method: 'POST' })
    setBusy(false)
    if (!r.ok) { toast.error(r.error || 'Couldn’t request the payout'); return }
    toast.success('Payout requested')
    onDone()
  }

  let body: React.ReactNode
  if (!p.enabled) body = <p className={s.secondary}>Payout requests are paused right now. Approved commission is still paid by BuySub.</p>
  else if (p.open) body = <p className={s.secondary}>You asked for <b className={s.num}>{fmtNGN(p.open.amount_ngn)}</b> on {fmtDate(p.open.created_at)}. We’ll send it to the account below and let you know.</p>
  else if (!hasDetails) body = <p className={s.secondary}>Add your payout details below before requesting a payout.</p>
  else if (p.available_ngn < p.min_ngn) body = <p className={s.secondary}>You can request a payout once you have {fmtNGN(p.min_ngn)} available.</p>
  else body = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bs-space-3)', flexWrap: 'wrap' }}>
      <Button loading={busy} onClick={request}>Request {fmtNGN(p.available_ngn)}</Button>
      <span className={s.muted}>Usually paid within 3 working days.</span>
    </div>
  )

  return (
    <div className={s.panelPad} style={{ borderTop: '1px solid var(--bs-border-subtle)', display: 'grid', gap: 'var(--bs-space-2)' }}>
      {body}
      <p className={s.muted}>Commission becomes available {p.hold_days} days after the order is paid, so refunds can settle first.</p>
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
  const refresh = () => { invalidate('/v2/partners/me/payouts'); invalidate('/v2/affiliates/me/commissions') }

  return (
    <>
      <PageHead title="Payouts" lede="Request what you’ve earned. We pay it to the account on your profile." />
      {payouts.error ? <div className={s.panel}><PanelError message={payouts.error} onRetry={payouts.reload} /></div> : (
        <div className={s.panel}>
          <div className={s.stats}>
            <div className={s.stat}>
              <span className={s.statLabel}>Available to request</span>
              <span className={s.statValue}>{money(p?.available_ngn)}</span>
            </div>
            <div className={s.stat}>
              <span className={s.statLabel}>On hold</span>
              <span className={s.statValue}>{money(p?.on_hold_ngn)}</span>
              <span className={s.statFoot}>{p ? `Released ${p.hold_days} days after payment` : ''}</span>
            </div>
            <div className={s.stat}>
              <span className={s.statLabel}>Paid to date</span>
              <span className={s.statValue}>{comms.loading && !comms.data ? <Skeleton width={90} height={28} /> : fmtNGN(paidTotal)}</span>
            </div>
          </div>
          {p && <RequestPanel p={p} hasDetails={hasDetails} onDone={refresh} />}
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
        <h2 className={s.h2}>Requests</h2>
        <div className={s.panel}>
          {payouts.loading && !p ? <RowsSkeleton n={2} />
            : !p?.history.length ? <PanelEmpty title="No requests yet">Your payout requests and their status show here.</PanelEmpty>
            : (
              <ul className={s.rows}>
                {p.history.map(h => {
                  const st = payoutStatus(h.status)
                  return (
                    <li key={h.id} className={`${s.row} ${s.rowWrap}`}>
                      <div className={s.rowMain}>
                        <span className={s.rowTitle}>{fmtNGN(h.amount_ngn)}</span>
                        <span className={s.rowSub} style={{ whiteSpace: 'normal' }}>
                          Requested {fmtDate(h.created_at)}
                          {h.status === 'paid' && h.processed_at ? ` · Paid ${fmtDate(h.processed_at)}` : ''}
                          {h.reference ? ` · Ref ${h.reference}` : ''}
                          {h.status === 'rejected' && h.admin_note ? ` · ${h.admin_note}` : ''}
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
