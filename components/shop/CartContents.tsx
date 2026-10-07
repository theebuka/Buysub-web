'use client'

// The cart: lines, promo code and totals. Rendered by the cart drawer and by
// /cart, and in summary form (`compact`) on /checkout.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button, ButtonLink, EmptyState, Icon, IconButton, Input, ProductLogo } from '@/components/ui'
import { useCart, cartLines, setLineQty, removeLine, MAX_LINE_QTY, reconcileCart } from '@/lib/cart'
import { useCurrency } from '@/lib/currency'
import { usePromo, computeTotals, applyPromoCode, clearManualPromo, usePromoMinimumGuard, clearPromoNotice } from '@/lib/checkout'
import { PERIODS, format } from '@/lib/constants'
import { priceFor } from '@/lib/pricing'
import { isOneTime, productHref } from '@/lib/catalog'
import { fetchProducts } from '@/lib/useProducts'
import s from './shop.module.css'

/** Re-prices the stored cart against the live catalog once per page load. */
export function useCartReconcile() {
  const [msg, setMsg] = useState('')
  useEffect(() => {
    let live = true
    fetchProducts().then(p => { if (live) setMsg(reconcileCart(p)) })
    return () => { live = false }
  }, [])
  return [msg, () => setMsg('')] as const
}

function Notice({ tone = 'info', children, onClose }: { tone?: 'info' | 'warn'; children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className={tone === 'warn' ? s.noticeWarn : s.notice} role="status">
      <Icon name={tone === 'warn' ? 'alert' : 'info'} size={16} />
      <span style={{ flex: 1 }}>{children}</span>
      {onClose && <IconButton icon="close" label="Dismiss" size="sm" onClick={onClose} />}
    </div>
  )
}

function PromoBox() {
  const cart = useCart()
  const promo = usePromo()
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (promo.manual) {
    return (
      <div className={s.promoApplied}>
        <Icon name="tag" size={16} />
        <span style={{ flex: 1 }}><b>{promo.manual.code}</b> applied{promo.manual.display ? ` · ${promo.manual.display}` : ''}</span>
        <button type="button" className={s.linkBtn} onClick={() => { clearManualPromo(); setCode('') }}>Remove</button>
      </div>
    )
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const msg = await applyPromoCode(code, cart)
    setBusy(false)
    setErr(msg)
    if (!msg) setCode('')
  }
  return (
    <form onSubmit={submit} className={s.promoForm}>
      <div style={{ display: 'flex', gap: 'var(--bs-space-2)' }}>
        <Input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setErr('') }} placeholder="Promo code"
          aria-label="Promo code" aria-invalid={err ? true : undefined} autoCapitalize="characters" />
        <Button type="submit" variant="secondary" loading={busy} disabled={!code.trim()}>Apply</Button>
      </div>
      {err && <p className={s.fieldError}>{err}</p>}
    </form>
  )
}

/** walletNGN: wallet balance being applied at checkout, in Naira. */
export function Totals({ showPromo = true, walletNGN = 0 }: { showPromo?: boolean; walletNGN?: number }) {
  const cart = useCart()
  const { currency, rate } = useCurrency()
  const promo = usePromo()
  usePromoMinimumGuard(cart, rate, currency)
  const t = computeTotals(cart, rate, promo)
  return (
    <div className={s.totals}>
      {promo.notice && <Notice tone="warn" onClose={clearPromoNotice}>{promo.notice}</Notice>}
      {promo.auto && !promo.manual && (
        <div className={s.autoPromo}><Icon name="sparkles" size={14} /> {promo.auto.display || `${promo.auto.code} applied automatically`}</div>
      )}
      {showPromo && !promo.auto?.is_exclusive && <PromoBox />}
      <dl className={s.sumRows}>
        <div><dt>Subtotal</dt><dd>{format(t.subtotal, currency)}</dd></div>
        {t.discount > 0 && (
          <div className={s.sumDiscount}>
            <dt>Discount{t.active ? ` (${t.active.code})` : ''}</dt>
            <dd>−{format(t.discount, currency)}</dd>
          </div>
        )}
        <div className={walletNGN > 0 ? undefined : s.sumTotal}><dt>Total</dt><dd>{format(t.total, currency)}</dd></div>
        {walletNGN > 0 && <>
          <div className={s.sumDiscount}><dt>From wallet</dt><dd>−{format(Math.min(walletNGN * rate, t.total), currency)}</dd></div>
          <div className={s.sumTotal}><dt>To pay</dt><dd>{format(Math.max(0, t.total - walletNGN * rate), currency)}</dd></div>
        </>}
      </dl>
      {t.partial && <p className={s.muted}>The promo applies to some items in your cart only.</p>}
      {currency !== 'NGN' && <p className={s.muted}>Charged in Naira. {currency} amounts are estimates.</p>}
    </div>
  )
}

export function CartLines({ compact, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const cart = useCart()
  const { currency, rate } = useCurrency()
  return (
    <ul className={s.lines}>
      {cartLines(cart).map(({ key, item }) => {
        const unit = priceFor(item.product, item.itemPeriod) ?? 0
        return (
          <li key={key} className={s.line}>
            <ProductLogo product={item.product} size={compact ? 40 : 48} radius="var(--bs-radius-md)" />
            <div className={s.lineMain}>
              <Link href={productHref(item.product)} className={s.lineName} onClick={onNavigate}>{item.product.name}</Link>
              <span className={s.lineMeta}>{isOneTime(item.product) ? 'One-time' : PERIODS[item.itemPeriod]?.name} · {format(unit * rate, currency)} each</span>
              {!compact && (
                <div className={s.lineActions}>
                  <div className={s.stepper} role="group" aria-label={`Quantity of ${item.product.name}`}>
                    <button type="button" onClick={() => setLineQty(key, item.qty - 1)} aria-label="Decrease quantity"><Icon name="minus" size={14} /></button>
                    <span aria-live="polite">{item.qty}</span>
                    <button type="button" onClick={() => setLineQty(key, item.qty + 1)} disabled={item.qty >= MAX_LINE_QTY} aria-label="Increase quantity"><Icon name="plus" size={14} /></button>
                  </div>
                  <button type="button" className={s.linkBtn} onClick={() => removeLine(key)}>Remove</button>
                </div>
              )}
            </div>
            <div className={s.lineTotal}>
              {compact && <span className={s.muted}>×{item.qty}</span>}
              {format(unit * rate * item.qty, currency)}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function CartEmpty({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState icon="cart" title="Your cart is empty"
      action={<ButtonLink href="/shop" icon="store" onClick={onBrowse}>Browse the shop</ButtonLink>}>
      Add a subscription and it will show up here.
    </EmptyState>
  )
}

export { Notice }
