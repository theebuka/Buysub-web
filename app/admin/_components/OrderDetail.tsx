'use client'

// /admin/orders/[ref]: one order with its items, money, customer and the
// actions its status allows.

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button, ButtonLink, Icon, Skeleton, StatusBadge } from '@/components/ui'
import { copyText } from '@/components/ui/CopyField'
import { AdminHead, DL, Panel, adminStyles as s } from '@/components/admin/AdminUI'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { TableState } from '@/components/admin/DataTable'
import { useApi, invalidate } from '@/lib/useApi'
import { fmtDateTime, fmtNGN } from '@/lib/format'
import { approveOrder, confirmReject, paymentLabel, receiptHref, rejectOrder, undoReject, type AdminOrder } from '../_lib/orders'

type Pending = null | 'reject' | 'confirm'

function waLink(phone: string | null | undefined, ref: string) {
  const digits = String(phone || '').replace(/\D/g, '').replace(/^0/, '234')
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(`Hi, about your BuySub order ${ref}`)}` : ''
}

export function OrderDetail({ orderRef }: { orderRef: string }) {
  const path = `/v2/admin/orders/${encodeURIComponent(orderRef)}`
  const { data: o, loading, error, reload } = useApi<AdminOrder>(path)
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<Pending>(null)

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, done: string) => {
    setBusy(true)
    const r = await fn()
    setBusy(false)
    if (r.ok) { toast.success(done); invalidate(path); invalidate('/v2/admin/orders') }
    else toast.error(r.error || 'That didn’t work')
    return r.ok
  }

  if (loading && !o) {
    return (
      <>
        <Skeleton width={220} height={24} />
        <div className={`${s.grid2} ${s.grid2Wide}`}><Skeleton height={260} radius="var(--bs-radius-lg)" /><Skeleton height={260} radius="var(--bs-radius-lg)" /></div>
      </>
    )
  }
  if (!o) {
    return (
      <Panel>
        <TableState error={!!error && !/not found/i.test(error)} title={/not found/i.test(error) ? `No order ${orderRef}` : 'Couldn’t load this order'}
          action={<div style={{ display: 'flex', gap: 'var(--bs-space-2)' }}>
            <ButtonLink href="/admin/orders" size="sm" variant="secondary">All orders</ButtonLink>
            {!/not found/i.test(error) && <Button size="sm" onClick={reload}>Try again</Button>}
          </div>}>{/not found/i.test(error) ? 'Check the reference and try again.' : error}</TableState>
      </Panel>
    )
  }

  const items = o.order_items || []
  const wa = waLink(o.customer_phone, o.order_ref)
  const nonNgn = o.currency && o.currency !== 'NGN'

  const actions = (
    <>
      <Button size="md" variant="ghost" icon="copy" onClick={async () => { if (await copyText(o.order_ref)) toast.success('Reference copied') }}>Copy ref</Button>
      {o.status === 'paid' && <ButtonLink href={receiptHref(o.order_ref)} size="md" variant="secondary" icon="receipt" external>Receipt</ButtonLink>}
      {o.status === 'pending_manual' && <>
        <Button size="md" variant="secondary" disabled={busy} onClick={() => setDialog('reject')}>Reject</Button>
        <Button size="md" loading={busy} onClick={() => run(() => approveOrder(o.order_ref), `${o.order_ref} approved`)}>Approve</Button>
      </>}
      {o.status === 'rejected_pending' && <>
        <Button size="md" variant="secondary" loading={busy} onClick={() => run(() => undoReject(o.order_ref), `${o.order_ref} restored`)}>Undo rejection</Button>
        <Button size="md" variant="danger" disabled={busy} onClick={() => setDialog('confirm')}>Confirm rejection</Button>
      </>}
    </>
  )

  return (
    <>
      <AdminHead
        title={o.order_ref}
        lede={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--bs-space-3)', flexWrap: 'wrap' }}>
          <StatusBadge status={o.status} audience="admin" />
          <span>Placed {fmtDateTime(o.created_at)}</span>
          {o.paid_at && <span>Paid {fmtDateTime(o.paid_at)}</span>}
        </span>}
        actions={actions}
      />

      {o.status === 'rejected_pending' && (
        <div className={s.panel} style={{ padding: 'var(--bs-space-3) var(--bs-space-4)', display: 'flex', gap: 'var(--bs-space-3)', alignItems: 'flex-start' }}>
          <Icon name="alert" size={16} style={{ color: 'var(--bs-warning)', marginTop: 2, flexShrink: 0 }} />
          <span className={s.secondary}>This order was rejected and is waiting for a second confirmation. Undo puts it back to Needs approval; confirming cancels it.</span>
        </div>
      )}

      <div className={`${s.grid2} ${s.grid2Wide}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bs-space-6)', minWidth: 0 }}>
          <Panel title={`Items (${items.length})`}>
            {items.length === 0 ? <TableState title="No items on this order" /> : (
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead><tr><th>Product</th><th>Period</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Unit</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={it.id || i}>
                        <td className={s.cellLead} style={{ whiteSpace: 'normal', minWidth: 220 }}><span className={s.strong} style={{ fontWeight: 'var(--bs-weight-medium)' as any }}>{it.product_name}</span>{it.category && <span className={s.muted} style={{ display: 'block', fontSize: 'var(--bs-text-xs)' }}>{it.category}</span>}</td>
                        <td className={s.secondary} data-label="Period">{it.billing_period || (it.duration_months ? `${it.duration_months} mo` : 'One-time')}</td>
                        <td style={{ textAlign: 'right' }} data-label="Qty">{it.quantity}</td>
                        <td style={{ textAlign: 'right' }} data-label="Unit">{fmtNGN(it.unit_price_ngn)}</td>
                        <td style={{ textAlign: 'right' }} data-label="Total">{fmtNGN(it.total_price_ngn ?? it.unit_price_ngn * it.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--bs-border-subtle)', padding: 'var(--bs-space-4)', display: 'flex', justifyContent: 'flex-end' }}>
              <dl className={s.dl} style={{ gridTemplateColumns: 'auto 120px', textAlign: 'right' }}>
                <dt>Subtotal</dt><dd className={s.num}>{fmtNGN(o.subtotal_ngn)}</dd>
                {o.discount_ngn > 0 && <><dt>Discount{o.discount_code ? ` (${o.discount_code})` : ''}</dt><dd className={s.num}>−{fmtNGN(o.discount_ngn)}</dd></>}
                {!!o.wallet_ngn && <><dt>Paid from wallet</dt><dd className={s.num}>−{fmtNGN(o.wallet_ngn)}</dd></>}
                {!!o.tax_ngn && <><dt>Tax</dt><dd className={s.num}>{fmtNGN(o.tax_ngn)}</dd></>}
                <dt className={s.strong}>Total</dt><dd className={`${s.num} ${s.strong}`}>{fmtNGN(o.total_ngn)}</dd>
              </dl>
            </div>
          </Panel>
          {o.notes && (
            <Panel title="Notes" pad>
              <p className={s.secondary} style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--bs-text-sm)' }}>{o.notes}</p>
            </Panel>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bs-space-6)', minWidth: 0 }}>
          <Panel title="Customer" pad action={o.customer_email ? <Link className={s.panelLink} href={`/admin/customers?q=${encodeURIComponent(o.customer_email)}`}>View customer</Link> : undefined}>
            <DL rows={[
              ['Name', o.customer_name || 'Guest'],
              ['Email', o.customer_email ? <a className={s.textLink} href={`mailto:${o.customer_email}`}>{o.customer_email}</a> : '-'],
              ['Phone', o.customer_phone ? <span>{o.customer_phone}{wa && <> · <a className={s.textLink} href={wa} target="_blank" rel="noreferrer">WhatsApp</a></>}</span> : '-'],
            ]} />
          </Panel>
          <Panel title="Payment" pad>
            <DL rows={[
              ['Method', paymentLabel(o.payment_method)],
              ['Currency', o.currency || 'NGN'],
              [nonNgn ? 'Shown to customer' : '', nonNgn && o.display_total ? `${o.currency} ${Number(o.display_total).toLocaleString()}` : ''],
              [nonNgn ? 'Rate' : '', nonNgn && o.fx_rate ? `₦1 = ${o.currency} ${o.fx_rate}` : ''],
              ['Paystack ref', o.paystack_ref ? <span className={s.mono}>{o.paystack_ref}</span> : ''],
              ['Referred', o.affiliate_id ? 'Yes, by a partner' : ''],
            ]} />
          </Panel>
          <Panel title="Timeline" pad>
            <DL rows={[
              ['Placed', fmtDateTime(o.created_at)],
              ['Paid', o.paid_at ? fmtDateTime(o.paid_at) : ''],
              ['Last updated', o.updated_at ? fmtDateTime(o.updated_at) : ''],
            ]} />
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={dialog === 'reject'}
        title={`Reject ${o.order_ref}?`}
        confirmLabel="Reject"
        danger
        reasonLabel="Reason (saved to the order notes)"
        onConfirm={async reason => { if (await run(() => rejectOrder(o.order_ref, reason), `${o.order_ref} moved to rejected`)) setDialog(null) }}
        onClose={() => setDialog(null)}
      >
        <p>The order moves to Rejected orders, where it can be restored or confirmed.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === 'confirm'}
        title={`Cancel ${o.order_ref}?`}
        confirmLabel="Confirm rejection"
        danger
        onConfirm={async () => { if (await run(() => confirmReject(o.order_ref), `${o.order_ref} cancelled`)) setDialog(null) }}
        onClose={() => setDialog(null)}
      >
        <p>This cancels the order for good. It can’t be restored afterwards.</p>
      </ConfirmDialog>
    </>
  )
}
