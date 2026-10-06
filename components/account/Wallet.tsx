'use client'

import { Skeleton } from '@/components/ui'
import { useApi } from '@/lib/useApi'
import { fmtDateTime, fmtNGN } from '@/lib/format'
import { PageHead, PanelEmpty, PanelError, RowsSkeleton } from './AccountShell'
import s from './account.module.css'

type Txn = {
  id: string; type: string; amount_ngn: number | string; source: string
  reference: string | null; note: string | null; balance_after?: number | string | null; created_at: string
}

const SOURCE: Record<string, string> = {
  refund: 'Refund', admin_topup: 'Credit from BuySub', topup: 'Top-up', order: 'Order payment',
  commission: 'Commission', adjustment: 'Adjustment', bonus: 'Bonus',
}

function describe(t: Txn): { title: string; sub: string } {
  const title = t.note || SOURCE[t.source] || (t.type === 'credit' ? 'Credit' : 'Debit')
  const ref = t.reference && t.reference !== t.source ? t.reference : ''
  return { title, sub: [fmtDateTime(t.created_at), ref].filter(Boolean).join(' · ') }
}

export default function Wallet() {
  const wallet = useApi<{ balance_ngn: number | string }>('/v2/me/wallet')
  const txns = useApi<Txn[]>('/v2/me/wallet/transactions')

  return (
    <>
      <PageHead title="Wallet" lede="Your BuySub balance and every change to it." />
      <div className={`${s.panel} ${s.stats}`} style={{ gridTemplateColumns: '1fr' }}>
        <div className={s.stat}>
          <span className={s.statLabel}>Available balance</span>
          <span className={s.statValue} style={{ fontSize: 'var(--bs-text-3xl)' }}>
            {wallet.loading ? <Skeleton width={160} height={36} /> : wallet.error ? 'Unavailable' : fmtNGN(wallet.data?.balance_ngn ?? 0)}
          </span>
          <span className={s.statFoot}>Refunds and credits from BuySub are added here.</span>
        </div>
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
