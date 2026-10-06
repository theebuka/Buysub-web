// Displays an NGN price in the shopper's currency. Conversion and rounding go
// through `format` and `FX` in lib/constants.ts, the same as the cart, so a
// price shown here is the price charged.

import s from './ui.module.css'
import { FX, format } from '@/lib/constants'

export function Price({ ngn, currency = 'NGN', was, suffix, from, size = 'var(--bs-text-xl)' }: {
  ngn: number | null
  currency?: string
  /** Strike-through comparison price, in NGN. */
  was?: number | null
  suffix?: string
  from?: boolean
  size?: string
}) {
  const rate = FX[currency] ?? 1
  if (ngn === null || !(ngn > 0)) return <span className={s.priceSuffix}>Not available</span>
  return (
    <span className={s.price}>
      {from && <span className={s.priceFrom}>From</span>}
      <span className={s.priceNow} style={{ fontSize: size }}>{format(ngn * rate, currency)}</span>
      {was && was > ngn && <span className={s.priceWas}>{format(was * rate, currency)}</span>}
      {suffix && <span className={s.priceSuffix}>{suffix}</span>}
    </span>
  )
}
