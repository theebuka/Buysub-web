'use client'

// Period, quantity, total, and Add to cart / Buy now. Only periods the
// product is actually sold for are offered (lib/pricing.ts).

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button, Icon } from '@/components/ui'
import { addToCart, setCartDrawer, MAX_LINE_QTY } from '@/lib/cart'
import { useCurrency } from '@/lib/currency'
import { PERIODS, format, isInStock, type Product } from '@/lib/constants'
import { priceFor, savingsVs } from '@/lib/pricing'
import { defaultPeriod, isOneTime, toOffers } from '@/lib/catalog'
import s from './shop.module.css'

// A per-month estimate. Whole Naira: "₦5,833.5" reads like an error.
function perMonth(price: number, months: number, rate: number, currency: string) {
  const v = (price / months) * rate
  return format(currency === 'NGN' ? Math.round(v) : v, currency)
}

export function BuyBox({ product: p, onAdded }: { product: Product; onAdded?: () => void }) {
  const router = useRouter()
  const { currency, rate } = useCurrency()
  const offer = toOffers(p)[0]
  const [period, setPeriod] = useState<string | null>(() => defaultPeriod(p))
  const [qty, setQty] = useState(1)
  useEffect(() => { setPeriod(defaultPeriod(p)); setQty(1) }, [p.id])

  const stock = isInStock(p.stock_status)
  const price = period ? priceFor(p, period) : null
  const canBuy = stock && price !== null

  const add = (then: 'drawer' | 'checkout') => {
    if (!period || !addToCart(p, period, qty)) return
    // Buy now navigates away directly. Calling onAdded first would let a quick
    // view's history.back() race the push and land back on /shop.
    if (then === 'checkout') { router.push('/checkout'); return }
    onAdded?.()
    toast.success(`${p.name} added to cart`)
    setCartDrawer(true)
  }

  if (!offer.periods.length) {
    return (
      <div className={s.buy}>
        <p className={s.prose}>This product isn’t available to buy right now.</p>
        <Button variant="secondary" full disabled>Currently unavailable</Button>
      </div>
    )
  }

  return (
    <div className={s.buy}>
      <div role="radiogroup" aria-label={isOneTime(p) ? 'Purchase' : 'Billing period'} className={s.periods}>
        {offer.periods.map(o => {
          const save = savingsVs(p, o.period)
          const months = PERIODS[o.period]?.months || 1
          if (isOneTime(p)) {
            return (
              <button key={o.period} type="button" role="radio" aria-checked className={s.periodOpt}>
                <span className={s.radioDot} aria-hidden="true" />
                <span><span className={s.periodName}>One-time purchase</span><span className={s.periodSub} style={{ display: 'block' }}>No renewal</span></span>
                <span className={s.periodPrice}>{format(o.price * rate, currency)}</span>
              </button>
            )
          }
          return (
            <button key={o.period} type="button" role="radio" aria-checked={period === o.period}
              className={s.periodOpt} onClick={() => setPeriod(o.period)}>
              <span className={s.radioDot} aria-hidden="true" />
              <span>
                <span className={s.periodName}>{PERIODS[o.period]?.name}</span>
                <span className={s.periodSub} style={{ display: 'block' }}>
                  {months > 1 ? `≈ ${perMonth(o.price, months, rate, currency)} / month` : ''}
                  {save ? <span style={{ color: 'var(--bs-badge-success-fg)', fontWeight: 600 }}>{months > 1 ? ' · ' : ''}Save {save}%</span> : null}
                </span>
              </span>
              <span className={s.periodPrice}>{format(o.price * rate, currency)}</span>
            </button>
          )
        })}
      </div>

      <div className={s.buyRow}>
        <span className={s.muted}>Quantity</span>
        <div className={`${s.stepper} ${s.stepperLg}`} role="group" aria-label="Quantity">
          <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity"><Icon name="minus" size={16} /></button>
          <span aria-live="polite">{qty}</span>
          <button type="button" onClick={() => setQty(q => Math.min(MAX_LINE_QTY, q + 1))} disabled={qty >= MAX_LINE_QTY} aria-label="Increase quantity"><Icon name="plus" size={16} /></button>
        </div>
      </div>

      <div className={s.buyRow}>
        <span className={s.muted}>Total</span>
        <span className={s.buyTotal}>{price !== null ? format(price * rate * qty, currency) : '—'}</span>
      </div>

      <div className={s.buyBtns}>
        <Button size="xl" full icon="cart" disabled={!canBuy} onClick={() => add('drawer')}>
          {stock ? 'Add to cart' : 'Out of stock'}
        </Button>
        {canBuy && <Button size="xl" variant="secondary" full onClick={() => add('checkout')}>Buy now</Button>}
      </div>
      {currency !== 'NGN' && <p className={s.muted}>Charged in Naira. {currency} prices are estimates.</p>}

      <div className={s.seller}>
        <div className={s.sellerRow}><Icon name="store" size={16} /> Sold by <b>{offer.sellerName}</b> <Icon name="shield" size={14} className={s.verified} /></div>
        {offer.deliveryTime && <div className={s.sellerRow}><Icon name="clock" size={16} /> Delivery: <b>{offer.deliveryTime}</b></div>}
        {offer.deliveryMethod && <div className={s.sellerRow}><Icon name="zap" size={16} /> {offer.deliveryMethod}</div>}
        {p.region && <div className={s.sellerRow}><Icon name="globe" size={16} /> Region: <b>{p.region}</b></div>}
        <div className={s.sellerRow}><Icon name="lock" size={16} /> Secure checkout with Paystack</div>
      </div>
    </div>
  )
}
