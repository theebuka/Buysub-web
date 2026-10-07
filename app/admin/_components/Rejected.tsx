'use client'

// /admin/rejected: stage one of the two-stage rejection (contract 5). Each
// order here can be restored (back to Needs approval) or confirmed (cancelled).

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui'
import { DataTable, TableState, type DTColumn } from '@/components/admin/DataTable'
import { AdminHead, CellTitle, adminStyles as s } from '@/components/admin/AdminUI'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { fmtDateTime, fmtNGN } from '@/lib/format'
import { useAdminList } from '../_lib/useAdminList'
import { confirmReject, orderHref, undoReject, type AdminOrder } from '../_lib/orders'

/** The reason the reject step appended to the notes, if any. */
function reasonOf(notes: string | null) {
  const m = String(notes || '').match(/Rejection reason:\s*(.+)$/m)
  return m ? m[1] : notes || ''
}

export function RejectedTab() {
  const list = useAdminList<AdminOrder>('/v2/admin/orders?status=rejected_pending', { limit: 50 })
  const [busy, setBusy] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<AdminOrder[] | null>(null)
  const drop = (refs: string[]) => list.setRows(rs => rs.filter(r => !refs.includes(r.order_ref)))

  const undo = async (o: AdminOrder) => {
    setBusy(o.order_ref)
    const r = await undoReject(o.order_ref)
    setBusy(null)
    if (r.ok) { drop([o.order_ref]); toast.success(`${o.order_ref} restored to Needs approval`) }
    else toast.error(r.error || 'Could not restore')
  }
  const confirm = async () => {
    const rows = confirming || []
    const done: string[] = []
    for (const o of rows) {
      const r = await confirmReject(o.order_ref)
      if (r.ok) done.push(o.order_ref); else toast.error(`${o.order_ref}: ${r.error || 'Could not cancel'}`)
    }
    drop(done)
    if (done.length) toast.success(done.length === 1 ? `${done[0]} cancelled` : `${done.length} orders cancelled`)
    setConfirming(null)
  }

  const columns: DTColumn<AdminOrder>[] = [
    { key: 'ref', header: 'Order', width: 170, cell: o => <CellTitle title={<Link href={orderHref(o.order_ref)} className={`${s.textLink} ${s.mono}`}>{o.order_ref}</Link>} sub={fmtDateTime(o.updated_at || o.created_at)} /> },
    { key: 'customer', header: 'Customer', cell: o => <div className={s.clip}><CellTitle title={o.customer_name || o.customer_email || 'Guest'} sub={o.customer_name ? o.customer_email : ''} /></div> },
    { key: 'reason', header: 'Reason', cell: o => <span className={`${s.secondary} ${s.clip}`} style={{ display: 'block' }} title={o.notes || ''}>{reasonOf(o.notes) || '-'}</span> },
    { key: 'total', header: 'Total', align: 'right', cell: o => fmtNGN(o.total_ngn) },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', width: 220,
      cell: o => (
        <span style={{ display: 'inline-flex', gap: 'var(--bs-space-2)' }}>
          <Button size="sm" variant="secondary" loading={busy === o.order_ref} disabled={!!busy} onClick={() => undo(o)}>Undo</Button>
          <Button size="sm" variant="danger" disabled={!!busy} onClick={() => setConfirming([o])}>Confirm</Button>
        </span>
      ),
    },
  ]

  return (
    <>
      <AdminHead title="Rejected orders" lede="Each rejection waits here for a second check. Undo returns the order to Needs approval; Confirm cancels it." />
      <DataTable
        caption="Rejected orders awaiting confirmation"
        columns={columns}
        rows={list.rows}
        rowKey={o => o.id}
        rowHref={o => orderHref(o.order_ref)}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        selectable
        bulkActions={(sel) => <Button size="sm" variant="danger" onClick={() => setConfirming(sel)}>Confirm {sel.length}</Button>}
        empty={<TableState title="Nothing waiting">Orders you reject from the orders list land here until they’re confirmed or restored.</TableState>}
      />
      <ConfirmDialog
        open={!!confirming}
        title={confirming && confirming.length > 1 ? `Cancel ${confirming.length} orders?` : `Cancel ${confirming?.[0]?.order_ref}?`}
        confirmLabel="Confirm rejection"
        danger
        onConfirm={confirm}
        onClose={() => setConfirming(null)}
      >
        <p>Confirmed orders are cancelled and can’t be restored.</p>
      </ConfirmDialog>
    </>
  )
}
