'use client'

import Link from 'next/link'
import { Button, ButtonLink, Icon, Skeleton, StatusBadge, WhatsAppGlyph } from '@/components/ui'
import { useApi } from '@/lib/useApi'
import { fmtDateTime, fmtNGN } from '@/lib/format'
import { WHATSAPP_NUMBER } from '@/lib/constants'
import { subscriptionsFrom, endsLabel, type MyOrder } from '@/lib/subscriptions'
import { ROUTES } from '@/lib/routes'
import { PageHead, PanelError, RowsSkeleton } from './AccountShell'
import { ItemLogo, PAYMENT_LABEL, useReorder } from './orderBits'
import s from './account.module.css'

type Step = { title: string; when?: string | null; note?: string; tone: 'done' | 'now' | 'stop' | 'todo' }

// What the customer should understand about where the order is. Wording is
// customer-facing: rejected_pending reads "Under review", never "rejected".
function stepsFor(o: MyOrder): Step[] {
  const placed: Step = { title: 'Order placed', when: o.created_at, tone: 'done' }
  switch (o.status) {
    case 'paid':
      return [placed,
        { title: 'Payment confirmed', when: o.paid_at, tone: 'done' },
        // We don't record delivery, so this step never claims it happened.
        { title: 'Delivery', note: 'Your login or activation details arrive in Messages.', tone: 'now' }]
    case 'pending':
      return [placed, { title: 'Awaiting payment', note: 'Payment hasn’t been completed. If you were charged, contact us with the order number.', tone: 'now' }, { title: 'Delivery', tone: 'todo' }]
    case 'pending_manual':
      return [placed, { title: 'Waiting for confirmation', note: 'We confirm WhatsApp and transfer orders by hand. You’ll get a message when it’s done.', tone: 'now' }, { title: 'Delivery', tone: 'todo' }]
    case 'rejected_pending':
      return [placed, { title: 'Under review', note: 'We’re checking something on this order and will contact you.', tone: 'now' }, { title: 'Delivery', tone: 'todo' }]
    case 'refunded':
      return [placed, { title: 'Refunded', when: o.updated_at, tone: 'stop' }]
    case 'failed':
      return [placed, { title: 'Payment failed', when: o.updated_at, note: 'No money was taken. You can place the order again.', tone: 'stop' }]
    default:
      return [placed, { title: 'Cancelled', when: o.updated_at, tone: 'stop' }]
  }
}

function Timeline({ order }: { order: MyOrder }) {
  const cls = { done: s.stepDone, now: s.stepNow, stop: s.stepStop, todo: '' }
  return (
    <ol className={s.timeline}>
      {stepsFor(order).map(st => (
        <li key={st.title} className={`${s.step} ${cls[st.tone]}`}>
          <span className={s.stepMark} aria-hidden="true">{st.tone === 'done' && <Icon name="check" size={12} strokeWidth={3} />}</span>
          <div>
            <div className={s.stepTitle} style={st.tone === 'todo' ? { color: 'var(--bs-text-muted)', fontWeight: 500 } : undefined}>{st.title}</div>
            {st.when && <div className={s.muted}>{fmtDateTime(st.when)}</div>}
            {st.note && <p className={s.secondary} style={{ marginTop: 4, lineHeight: 1.5 }}>{st.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export default function OrderDetail({ orderRef }: { orderRef: string }) {
  const { data: o, error, loading, reload } = useApi<MyOrder>(`/v2/me/orders/${encodeURIComponent(orderRef)}`)
  const reorder = useReorder()
  const back = { href: ROUTES.account.orders, label: 'Orders' }

  if (loading) {
    return (
      <>
        <PageHead back={back} title={orderRef} />
        <div className={s.detail}><div className={s.panel}><RowsSkeleton n={2} /></div><Skeleton height={200} radius="var(--bs-radius-lg)" /></div>
      </>
    )
  }
  if (error || !o) {
    const missing = /not found/i.test(error)
    return (
      <>
        <PageHead back={back} title={orderRef} />
        <div className={s.panel}>
          {missing
            ? <div className={s.empty}><p className={s.emptyTitle}>We couldn’t find this order</p><p className={s.secondary}>It may belong to a different email address. Orders are matched to the email you checked out with.</p></div>
            : <PanelError message={error} onRetry={reload} />}
        </div>
      </>
    )
  }

  const items = o.order_items || []
  const subs = subscriptionsFrom([o])
  const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi BuySub, I need help with order ${o.order_ref}.`)}`
  const discount = Number(o.discount_ngn) || 0
  const wallet = Number(o.wallet_ngn) || 0

  return (
    <>
      <PageHead
        back={back}
        title={`Order ${o.order_ref}`}
        lede={<>Placed {fmtDateTime(o.created_at)} · {PAYMENT_LABEL[o.payment_method] || o.payment_method}</>}
        actions={<StatusBadge status={o.status} />}
      />
      <div className={s.detail}>
        <div className={s.panel}>
          <ul className={s.rows}>
            {items.length === 0 && <li className={s.row}><span className={s.secondary}>The items on this order weren’t recorded.</span></li>}
            {items.map(it => {
              const sub = subs.find(x => x.item.id === it.id)
              return (
                <li key={it.id} className={s.row}>
                  <ItemLogo item={it} />
                  <div className={s.rowMain}>
                    {it.products?.slug
                      ? <Link href={`/shop/${it.products.slug}`} className={s.rowTitle} style={{ color: 'var(--bs-text-primary)' }}>{it.product_name}</Link>
                      : <span className={s.rowTitle}>{it.product_name}</span>}
                    <span className={s.rowSub}>
                      {it.billing_type === 'one_time' ? 'One-time' : it.billing_period}
                      {Number(it.quantity) > 1 ? ` × ${it.quantity}` : ''}
                      {sub ? ` · ${endsLabel(sub)}` : ''}
                    </span>
                  </div>
                  <span className={s.rowAmount}>{fmtNGN(it.total_price_ngn)}</span>
                </li>
              )
            })}
          </ul>
          <dl className={s.totals}>
            <div><dt>Subtotal</dt><dd>{fmtNGN(o.subtotal_ngn)}</dd></div>
            {discount > 0 && <div><dt>Discount{o.discount_code ? ` (${o.discount_code})` : ''}</dt><dd className={s.pos}>−{fmtNGN(discount)}</dd></div>}
            {wallet > 0 && <div><dt>Paid from wallet</dt><dd>−{fmtNGN(wallet)}</dd></div>}
            <div className={s.totalLine}><dt>Total</dt><dd>{fmtNGN(o.total_ngn)}</dd></div>
            {o.currency && o.currency !== 'NGN' && o.display_total ? (
              <div><dt>Shown at checkout</dt><dd>{new Intl.NumberFormat(undefined, { style: 'currency', currency: o.currency }).format(Number(o.display_total))}</dd></div>
            ) : null}
          </dl>
        </div>

        <aside className={s.side2}>
          <div className={`${s.panel} ${s.panelPad}`}>
            <h2 className={s.h2}>Progress</h2>
            <Timeline order={o} />
            {o.status === 'paid' && (
              <div style={{ marginTop: 'var(--bs-space-4)' }}>
                <ButtonLink href={ROUTES.account.messages} variant="secondary" size="md" full>Open messages</ButtonLink>
              </div>
            )}
          </div>
          <div className={`${s.panel} ${s.panelPad}`} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bs-space-3)' }}>
            <h2 className={s.h2} style={{ marginBottom: 0 }}>Need help?</h2>
            <p className={s.secondary}>Chat with us on WhatsApp. Your order number is filled in.</p>
            <ButtonLink href={wa} external variant="secondary" size="md" full><WhatsAppGlyph size={16} /> Get help with this order</ButtonLink>
            {items.length > 0 && <Button variant="ghost" size="md" full onClick={() => reorder(items)}>Buy again</Button>}
          </div>
        </aside>
      </div>
    </>
  )
}
