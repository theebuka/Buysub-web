'use client'

// /admin/orders: every order, newest first. Filters and search live in the
// URL. Orders awaiting manual approval can be approved or rejected inline,
// one at a time or in bulk; everything else opens the order page.

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button, StatusBadge } from '@/components/ui'
import { DataTable, Filters, SearchBox, TableState, type DTColumn } from '@/components/admin/DataTable'
import { AdminHead, CellTitle, adminStyles as s } from '@/components/admin/AdminUI'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { fmtDateTime, fmtNGN } from '@/lib/format'
import { useAdminList } from '../_lib/useAdminList'
import { approveOrder, orderHref, paymentLabel, rejectOrder, type AdminOrder } from '../_lib/orders'
import { NewOrderDrawer } from './NewOrderDrawer'
import { loadAllProducts } from './productsCache'
import type { Product } from '../_lib/shared'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending_manual', label: 'Needs approval' },
  { value: 'pending', label: 'Awaiting payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected_pending', label: 'Rejected (pending)' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'failed', label: 'Failed' },
]

export function OrdersTab() {
  const list = useAdminList<AdminOrder>('/v2/admin/orders', { params: ['status'], limit: 25 })
  const [busy, setBusy] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<AdminOrder[] | null>(null)
  const [newOrder, setNewOrder] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const status = list.params.status || ''

  const openNewOrder = () => {
    setNewOrder(true)
    if (!products.length) loadAllProducts().then(setProducts)
  }

  const approve = async (rows: AdminOrder[], clear?: () => void) => {
    setBusy(rows.length === 1 ? rows[0].order_ref : 'bulk')
    let done = 0
    for (const o of rows) {
      const r = await approveOrder(o.order_ref)
      if (r.ok) { done++; list.patchRow(x => x.order_ref === o.order_ref, { status: (r.data as any)?.status || 'paid' }) }
      else toast.error(`${o.order_ref}: ${r.error || 'Could not approve'}`)
    }
    if (done) toast.success(done === 1 ? `${rows[0].order_ref} approved` : `${done} orders approved`)
    setBusy(null)
    clear?.()
  }

  const reject = async (reason: string) => {
    const rows = rejecting || []
    let done = 0
    for (const o of rows) {
      const r = await rejectOrder(o.order_ref, reason)
      if (r.ok) { done++; list.patchRow(x => x.order_ref === o.order_ref, { status: (r.data as any)?.status || 'rejected_pending' }) }
      else toast.error(`${o.order_ref}: ${r.error || 'Could not reject'}`)
    }
    if (done) toast.success(done === 1 ? `${rows[0].order_ref} moved to rejected` : `${done} orders moved to rejected`)
    setRejecting(null)
  }

  const columns: DTColumn<AdminOrder>[] = [
    {
      key: 'ref', header: 'Order', width: 170,
      cell: o => <CellTitle title={<Link href={orderHref(o.order_ref)} className={`${s.textLink} ${s.mono}`}>{o.order_ref}</Link>} sub={fmtDateTime(o.created_at)} />,
    },
    {
      key: 'customer', header: 'Customer',
      cell: o => <div className={s.clip}><CellTitle title={o.customer_name || o.customer_email || 'Guest'} sub={o.customer_name ? o.customer_email : o.customer_phone} /></div>,
    },
    { key: 'payment', header: 'Payment', cell: o => <span className={s.secondary}>{paymentLabel(o.payment_method)}</span> },
    { key: 'status', header: 'Status', cell: o => <StatusBadge status={o.status} audience="admin" /> },
    {
      key: 'total', header: 'Total', align: 'right',
      cell: o => (
        <span className={s.num}>
          {fmtNGN(o.total_ngn)}
          {o.discount_ngn > 0 && <span className={s.muted} style={{ display: 'block', fontSize: 'var(--bs-text-xs)' }}>−{fmtNGN(o.discount_ngn)} off</span>}
        </span>
      ),
    },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', width: 190,
      cell: o => o.status === 'pending_manual' ? (
        <span style={{ display: 'inline-flex', gap: 'var(--bs-space-2)' }}>
          <Button size="sm" variant="secondary" onClick={() => setRejecting([o])} disabled={!!busy}>Reject</Button>
          <Button size="sm" onClick={() => approve([o])} loading={busy === o.order_ref} disabled={!!busy && busy !== o.order_ref}>Approve</Button>
        </span>
      ) : null,
    },
  ]

  return (
    <>
      <AdminHead title="Orders" actions={<Button size="sm" icon="plus" onClick={openNewOrder}>New order</Button>} />
      <DataTable
        caption="Orders"
        columns={columns}
        rows={list.rows}
        rowKey={o => o.id}
        rowHref={o => orderHref(o.order_ref)}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        pagination={list.pagination}
        onPage={p => list.setParams({ page: String(p) })}
        selectable={status === 'pending_manual'}
        bulkActions={(sel, clear) => {
          const pending = sel.filter(o => o.status === 'pending_manual')
          if (!pending.length) return <span className={s.muted}>Only orders that need approval have bulk actions.</span>
          return (
            <>
              <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => setRejecting(pending)}>Reject {pending.length}</Button>
              <Button size="sm" loading={busy === 'bulk'} onClick={() => approve(pending, clear)}>Approve {pending.length}</Button>
            </>
          )
        }}
        toolbar={
          <>
            <SearchBox value={list.params.q || ''} onChange={q => list.setParams({ q })} placeholder="Search ref, name or email" />
            <Filters label="Status" options={STATUS_FILTERS} value={status} onChange={v => list.setParams({ status: v })} />
          </>
        }
        empty={
          list.params.q || status
            ? <TableState title="No orders match">Try a different search or status.</TableState>
            : <TableState title="No orders yet">Orders from the shop and from WhatsApp will appear here.</TableState>
        }
      />
      <ConfirmDialog
        open={!!rejecting}
        title={rejecting && rejecting.length > 1 ? `Reject ${rejecting.length} orders?` : `Reject ${rejecting?.[0]?.order_ref}?`}
        confirmLabel="Reject"
        danger
        reasonLabel="Reason (saved to the order notes)"
        onConfirm={reject}
        onClose={() => setRejecting(null)}
      >
        <p>The order moves to Rejected orders, where it can be restored or confirmed. Nothing is cancelled until it’s confirmed there.</p>
      </ConfirmDialog>
      {newOrder && (
        <NewOrderDrawer allProducts={products} onClose={() => setNewOrder(false)} onCreated={() => list.reload()} />
      )}
    </>
  )
}
