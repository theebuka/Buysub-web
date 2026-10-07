'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button, Field, Input, Skeleton } from '@/components/ui'
import { useApi, invalidate } from '@/lib/useApi'
import { authFetch } from '@/lib/apiAuth'
import { loadWallet } from '@/lib/useSession'
import { useSiteStatus } from '@/lib/siteStatus'
import { fmtDateTime, fmtNGN } from '@/lib/format'
import { PageHead, PanelEmpty, PanelError, RowsSkeleton } from './AccountShell'
import s from './account.module.css'

type Txn = {
  id: string; type: string; amount_ngn: number | string; source: string
  reference: string | null; note: string | null; balance_after?: number | string | null; created_at: string
}

const SOURCE: Record<string, string> = {
  refund: 'Refund', admin_topup: 'Credit from BuySub', topup: 'Top-up', order: 'Order payment',
  order_payment: 'Order payment', admin: 'Credit from BuySub', referral: 'Referral reward',
  commission: 'Commission', adjustment: 'Adjustment', bonus: 'Bonus',
}

function describe(t: Txn): { title: string; sub: string } {
  const title = t.note || SOURCE[t.source] || (t.type === 'credit' ? 'Credit' : 'Debit')
  const ref = t.reference && t.reference !== t.source ? t.reference : ''
  return { title, sub: [fmtDateTime(t.created_at), ref].filter(Boolean).join(' · ') }
}

const QUICK = [2000, 5000, 10000, 20000]

/** "Add money": Paystack top-up. Paystack sends the shopper back here with ?reference=. */
function AddMoney({ min, max }: { min: number; max: number }) {
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const n = Math.round(Number(amount.replace(/[^\d.]/g, '')))

  const go = async () => {
    if (!(n >= min && n <= max)) { setError(`Enter an amount between ${fmtNGN(min)} and ${fmtNGN(max)}.`); return }
    setBusy(true); setError('')
    const r = await authFetch<{ authorization_url: string }>('/v2/me/wallet/fund', {
      method: 'POST', body: { amount_ngn: n, callback_url: `${window.location.origin}/account/wallet` },
    })
    if (!r.ok || !r.data?.authorization_url) { setBusy(false); setError(r.error || 'Couldn’t start the payment. Try again.'); return }
    window.location.href = r.data.authorization_url
  }

  return (
    <div className={s.panelPad} style={{ borderTop: '1px solid var(--bs-border-subtle)', display: 'grid', gap: 'var(--bs-space-3)' }}>
      <h2 className={s.h2}>Add money</h2>
      <div className={s.chips}>
        {QUICK.filter(q => q >= min && q <= max).map(q => (
          <button key={q} type="button" className={s.chip} aria-pressed={n === q} onClick={() => { setAmount(String(q)); setError('') }}>{fmtNGN(q)}</button>
        ))}
      </div>
      <div className={s.fundRow}>
        <Field label="Amount (₦)" hint={`${fmtNGN(min)} to ${fmtNGN(max)}. Paid securely with Paystack.`} error={error || undefined}>
          {p => <Input {...p} inputMode="numeric" value={amount} placeholder="5000"
            onChange={e => { setAmount(e.target.value); setError('') }}
            onKeyDown={e => { if (e.key === 'Enter') go() }} />}
        </Field>
        <Button size="lg" icon="lock" loading={busy} onClick={go} style={{ alignSelf: 'start', marginTop: 26 }}>Continue</Button>
      </div>
    </div>
  )
}

/** Settles a top-up when Paystack returns here with ?reference=. Runs once. */
function useTopupReturn(onDone: () => void) {
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const q = new URLSearchParams(window.location.search)
    const ref = q.get('reference') || q.get('trxref')
    if (!ref) return
    window.history.replaceState({}, '', window.location.pathname)
    const id = toast.loading('Confirming your top-up…')
    authFetch<{ amount_ngn: number }>(`/v2/me/wallet/fund/verify?reference=${encodeURIComponent(ref)}`).then(r => {
      if (r.ok) toast.success(`${fmtNGN(r.data?.amount_ngn ?? 0)} added to your wallet`, { id })
      else toast.error(r.error || 'We couldn’t confirm that payment yet. If you were charged, it will show here shortly.', { id })
      onDone()
    })
  }, [onDone])
}

export default function Wallet() {
  const wallet = useApi<{ balance_ngn: number | string; is_active?: boolean }>('/v2/me/wallet')
  const txns = useApi<Txn[]>('/v2/me/wallet/transactions')
  const status = useSiteStatus()
  const refresh = useRef(() => { invalidate('/v2/me/wallet'); loadWallet() }).current
  useTopupReturn(refresh)
  const frozen = wallet.data?.is_active === false

  return (
    <>
      <PageHead title="Wallet" lede="Your BuySub balance and every change to it." />
      <div className={`${s.panel} ${s.stats}`} style={{ gridTemplateColumns: '1fr' }}>
        <div className={s.stat}>
          <span className={s.statLabel}>Available balance</span>
          <span className={s.statValue} style={{ fontSize: 'var(--bs-text-3xl)' }}>
            {wallet.loading ? <Skeleton width={160} height={36} /> : wallet.error ? 'Unavailable' : fmtNGN(wallet.data?.balance_ngn ?? 0)}
          </span>
          <span className={s.statFoot}>
            {frozen ? 'Your wallet is frozen. Contact support to use it.' : 'Spend it at checkout. Refunds and credits from BuySub are added here.'}
          </span>
        </div>
        {status.services.wallet_funding && !frozen && <AddMoney min={status.wallet_funding.min_ngn} max={status.wallet_funding.max_ngn} />}
      </div>
      <section className={s.section}>
        <h2 className={s.h2}>Transactions</h2>
        <div className={s.panel}>
          {txns.loading ? <RowsSkeleton n={4} />
            : txns.error ? <PanelError message={txns.error} onRetry={txns.reload} />
            : !txns.data?.length ? <PanelEmpty title="No transactions yet">Credits and payments from your wallet will be listed here.</PanelEmpty>
            : (
              <ul className={s.rows}>
                {txns.data.map(t => {
                  const d = describe(t)
                  const credit = t.type === 'credit'
                  return (
                    <li key={t.id} className={s.row}>
                      <div className={s.rowMain}>
                        <span className={s.rowTitle}>{d.title}</span>
                        <span className={s.rowSub}>{d.sub}</span>
                      </div>
                      <span className={`${s.rowAmount} ${credit ? s.pos : ''}`}>{credit ? '+' : '−'}{fmtNGN(t.amount_ngn)}</span>
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
