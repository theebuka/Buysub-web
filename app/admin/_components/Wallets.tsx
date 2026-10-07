'use client'

// /admin/wallets: every wallet movement across customers, newest first.

import { DataTable, TableState, type DTColumn } from '@/components/admin/DataTable'
import { AdminHead, CellTitle, adminStyles as s } from '@/components/admin/AdminUI'
import { fmtDateTime, fmtNGN } from '@/lib/format'
import { useAdminList } from '../_lib/useAdminList'

type Txn = { id: string; type: string; amount_ngn: number; balance_after?: number; source?: string; reference?: string; note?: string; created_at: string; customer_name?: string | null; customer_email?: string | null; actor_id?: string | null; actor_name?: string | null; actor_email?: string | null }

// wallet_tx_source values. 'admin' is a staff change either way, so the type picks the label.
const SOURCE: Record<string, string> = { refund: 'Refund', order_payment: 'Order payment', topup: 'Top-up', referral: 'Referral reward' }
const describe = (t: Txn) => t.source === 'admin' ? (t.type === 'credit' ? 'Manual credit' : 'Manual debit') : SOURCE[t.source || ''] || (t.source || '').replace(/_/g, ' ') || '-'

function Person({ name, email }: { name?: string | null; email?: string | null }) {
  return name || email ? <div className={s.clip}><CellTitle title={name || email} sub={name ? email : ''} /></div> : <span className={s.muted}>-</span>
}

export function WalletsTab() {
  const list = useAdminList<Txn>('/v2/admin/wallets', { limit: 25 })
  const columns: DTColumn<Txn>[] = [
    { key: 'when', header: 'Date', width: 170, cell: t => <span className={s.secondary}>{fmtDateTime(t.created_at)}</span> },
    { key: 'who', header: 'Customer', cell: t => <Person name={t.customer_name} email={t.customer_email} /> },
    { key: 'what', header: 'Description', cell: t => <div className={s.clip}><CellTitle title={describe(t)} sub={t.reference || t.note} /></div> },
    { key: 'by', header: 'By', cell: t => t.actor_id || t.actor_email ? <Person name={t.actor_name} email={t.actor_email} /> : <span className={s.muted}>{t.source === 'admin' ? 'Staff (not recorded)' : t.source === 'order_payment' || t.source === 'topup' ? 'Customer' : 'System'}</span> },
    { key: 'amount', header: 'Amount', align: 'right', cell: t => <span style={{ color: t.type === 'credit' ? 'var(--bs-success)' : 'var(--bs-text-primary)' }}>{t.type === 'credit' ? '+' : '−'}{fmtNGN(t.amount_ngn)}</span> },
    { key: 'after', header: 'Balance after', align: 'right', cell: t => <span className={s.secondary}>{t.balance_after != null ? fmtNGN(t.balance_after) : '-'}</span> },
  ]
  return (
    <>
      <AdminHead title="Wallets" lede="Top-ups, refunds and wallet payments across all customers. To change a balance, open the customer." />
      <DataTable
        caption="Wallet transactions"
        columns={columns}
        rows={list.rows}
        rowKey={t => t.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        pagination={list.pagination}
        onPage={p => list.setParams({ page: String(p) })}
        empty={<TableState title="No wallet activity yet">Top-ups and wallet payments will appear here.</TableState>}
      />
    </>
  )
}
