'use client'

// Cards for things that are products: a subscription looks like its shop card
// (logo, name, category in violet), and an order is a card with a summary
// strip over its items, the pattern Amazon and Shopify's customer accounts
// use. Both used by the overview and their own pages.

import Link from 'next/link'
import { Button, ButtonLink, Skeleton, StatusBadge } from '@/components/ui'
import { fmtDate, fmtNGN, categoryLabel } from '@/lib/format'
import { endsLabel, type MyOrder, type Subscription } from '@/lib/subscriptions'
import { ROUTES } from '@/lib/routes'
import { ItemLogo, orderValue, paymentLabel, useReorder } from './orderBits'
import s from './cards.module.css'

// ── Subscription ─────────────────────────────────────────────

export function PlanCard({ sub }: { sub: Subscription }) {
  const reorder = useReorder()
  const ended = sub.state === 'ended'
  const ending = sub.state === 'ending'
  const total = Math.max(1, sub.end.getTime() - sub.start.getTime())
  const used = Math.min(1, Math.max(0, (Date.now() - sub.start.getTime()) / total))
  const cat = sub.item.category ? categoryLabel(String(sub.item.category).split(',')[0].trim().toLowerCase()) : null
  const href = sub.item.products?.slug ? `/shop/${sub.item.products.slug}` : null
  return (
    <article className={`${s.plan} ${ended ? s.planEnded : ''}`}>
      <div className={s.planTop}>
        <ItemLogo item={sub.item} size={44} />
        <div className={s.planHead}>
          <h3 className={s.planName} title={sub.item.product_name}>
            {href ? <Link href={href} className={s.planLink}>{sub.item.product_name}</Link> : sub.item.product_name}
          </h3>
          <span className={s.planCat}>{cat || 'Subscription'}</span>
        </div>
      </div>
      <p className={s.planMeta}>
        {sub.item.billing_period} plan · <Link href={ROUTES.account.order(sub.order.order_ref)} className={s.ref}>{sub.order.order_ref}</Link>
      </p>
      <div className={s.meter} role="img" aria-label={`${Math.round(used * 100)}% of the plan used`}>
        <span className={ending ? s.meterWarn : ended ? s.meterEnded : undefined} style={{ width: `${used * 100}%` }} />
      </div>
      <div className={s.planFoot}>
        <div className={s.planWhen}>
          <span className={`${s.planEnds} ${ending ? s.warn : ''}`}>{endsLabel(sub)}</span>
          <span className={s.planDate}>{ended ? 'Ended' : 'Until'} {fmtDate(sub.end)}</span>
        </div>
        <Button variant={ending ? 'primary' : 'secondary'} size="md" onClick={() => reorder([sub.item])}>
          {ended ? 'Buy again' : 'Renew'}
        </Button>
      </div>
    </article>
  )
}

export function PlanCardSkeleton() {
  return (
    <div className={s.plan} aria-hidden="true">
      <div className={s.planTop}>
        <Skeleton width={44} height={44} radius="var(--bs-radius-lg)" />
        <div style={{ flex: 1, display: 'grid', gap: 8 }}><Skeleton width="60%" height={15} /><Skeleton width="35%" height={12} /></div>
      </div>
      <Skeleton width="50%" height={12} />
      <Skeleton height={4} />
      <div className={s.planFoot}><Skeleton width={110} height={28} /><Skeleton width={80} height={40} radius="var(--bs-radius-md)" /></div>
    </div>
  )
}

export function PlanGrid({ children }: { children: React.ReactNode }) {
  return <div className={s.planGrid}>{children}</div>
}

// ── Order ────────────────────────────────────────────────────

export function OrderCard({ o }: { o: MyOrder }) {
  const reorder = useReorder()
  const items = o.order_items || []
  const href = ROUTES.account.order(o.order_ref)
  return (
    <article className={s.order}>
      <header className={s.orderHead}>
        <dl className={s.orderFacts}>
          <div><dt>Order placed</dt><dd>{fmtDate(o.created_at)}</dd></div>
          <div><dt>Total</dt><dd className={s.num}>{fmtNGN(orderValue(o))}</dd></div>
          <div className={s.hideSm}><dt>Payment</dt><dd>{paymentLabel(o)}</dd></div>
        </dl>
        <div className={s.orderRef}>
          <span className={s.refLabel}>Order <span className={s.num}>{o.order_ref}</span></span>
          <Link href={href} className={s.detailsLink}>View details</Link>
        </div>
      </header>
      <div className={s.orderBody}>
        {items.length === 0 ? (
          <p className={s.noItems}>The items on this order weren’t recorded.</p>
        ) : (
          <ul className={s.items}>
            {items.slice(0, 3).map(it => (
              <li key={it.id} className={s.item}>
                <ItemLogo item={it} size={40} />
                <div className={s.itemMain}>
                  {it.products?.slug
                    ? <Link href={`/shop/${it.products.slug}`} className={s.itemName}>{it.product_name}</Link>
                    : <span className={s.itemName}>{it.product_name}</span>}
                  <span className={s.itemSub}>{it.billing_type === 'one_time' ? 'One-time' : it.billing_period}{Number(it.quantity) > 1 ? ` · Qty ${it.quantity}` : ''}</span>
                </div>
                <span className={`${s.itemPrice} ${s.num}`}>{fmtNGN(it.total_price_ngn)}</span>
              </li>
            ))}
            {items.length > 3 && <li className={s.more}><Link href={href}>{items.length - 3} more item{items.length - 3 === 1 ? '' : 's'}</Link></li>}
          </ul>
        )}
      </div>
      <footer className={s.orderFoot}>
        <StatusBadge status={o.status} />
        <div className={s.orderActions}>
          <ButtonLink href={`${ROUTES.account.support}?order=${encodeURIComponent(o.order_ref)}`} variant="ghost" size="md">Get help</ButtonLink>
          {items.length > 0 && <Button variant="secondary" size="md" onClick={() => reorder(items)}>Buy again</Button>}
        </div>
      </footer>
    </article>
  )
}

export function OrderCardSkeleton() {
  return (
    <div className={s.order} aria-hidden="true">
      <div className={s.orderHead}><Skeleton width={260} height={30} /><Skeleton width={120} height={30} /></div>
      <div className={s.orderBody}>
        <div className={s.item}><Skeleton width={40} height={40} radius="var(--bs-radius-md)" /><div style={{ flex: 1, display: 'grid', gap: 6 }}><Skeleton width="40%" height={14} /><Skeleton width="20%" height={12} /></div><Skeleton width={70} height={14} /></div>
      </div>
    </div>
  )
}

/** A compact order line for the overview: first item's logo, name, ref, total, status. */
export function OrderLine({ o }: { o: MyOrder }) {
  const items = o.order_items || []
  const first = items[0]
  const title = first ? (items.length > 1 ? `${first.product_name} and ${items.length - 1} more` : first.product_name) : `Order ${o.order_ref}`
  return (
    <li>
      <Link href={ROUTES.account.order(o.order_ref)} className={s.line}>
        {first ? <ItemLogo item={first} size={40} /> : <span className={s.lineBlank} aria-hidden="true" />}
        <span className={s.lineMain}>
          <span className={s.lineTitle}>{title}</span>
          <span className={s.lineSub}>{o.order_ref} · {fmtDate(o.created_at)}</span>
        </span>
        <span className={s.lineEnd}>
          <span className={`${s.lineAmount} ${s.num}`}>{fmtNGN(orderValue(o))}</span>
          <StatusBadge status={o.status} />
        </span>
      </Link>
    </li>
  )
}

