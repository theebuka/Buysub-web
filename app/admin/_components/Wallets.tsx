'use client'

// /admin/wallets: every wallet movement across customers, newest first.

import { DataTable, TableState, type DTColumn } from '@/components/admin/DataTable'
import { AdminHead, CellTitle, adminStyles as s } from '@/components/admin/AdminUI'
import { fmtDateTime, fmtNGN } from '@/lib/format'
import { useAdminList } from '../_lib/useAdminList'

type Txn = { id: string; type: string; amount_ngn: number; balance_after?: number; source?: string; reference?: string; note?: string; created_at: string; customer_name?: string; customer_email?: string; customers?: { name?: string; email?: string } | null }

const SOURCE: Record<string, string> = { admin_topup: 'Manual top-up', refund: 'Refund', promotion: 'Promotion', compensation: 'Compensation', order: 'Order payment', admin_debit: 'Manual debit' }

export function WalletsTab() {
  const list = useAdminList<Txn>('/v2/admin/wallets', { limit: 25 })
  const columns: DTColumn<Txn>[] = [
    { key: 'when', header: 'Date', width: 170, cell: t => <span className={s.secondary}>{fmtDateTime(t.created_at)}</span> },
    { key: 'who', header: 'Customer', cell: t => { const n = t.customers?.name || t.customer_name; const e = t.customers?.email || t.customer_email; return n || e ? <div className={s.clip}><CellTitle title={n || e} sub={n ? e : ''} /></div> : <span className={s.muted}>-</span> } },
    { key: 'what', header: 'Description', cell: t => <div className={s.clip}><CellTitle title={SOURCE[t.source || ''] || (t.source || '').replace(/_/g, ' ') || '-'} sub={t.reference || t.note} /></div> },
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
