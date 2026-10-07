'use client'

// A catalog card. The whole card is one link to /shop/[slug] (a stretched
// ::after on the name link), so it works with middle-click, open-in-new-tab
// and no JS. A plain click opens the quick view instead when onOpen is given.
//
// Proportions and type follow the original storefront card: landscape, 16px
// name, the category in violet, 12px description, a 20px price. Stock is a
// dot and a word, not a pill.

import Link from 'next/link'
import type { MouseEvent } from 'react'
import { ProductLogo, Skeleton } from '@/components/ui'
import { format, getCategoryList, isInStock, PERIODS, type Product } from '@/lib/constants'
import { fromPrice } from '@/lib/pricing'
import { isOneTime, productHref } from '@/lib/catalog'
import { categoryLabel } from '@/lib/format'
import { useCurrency } from '@/lib/currency'
import { RatingLine } from './Reviews'
import { SaveButton } from './SaveButton'
import s from './shop.module.css'

export function StockLine({ inStock, available }: { inStock: boolean; available: boolean }) {
  if (!available) return <span className={s.stock}>Unavailable</span>
  return inStock
    ? <span className={`${s.stock} ${s.stockOn}`}><span className={s.stockDot} aria-hidden="true" />In stock</span>
    : <span className={s.stock}><span className={s.stockDot} aria-hidden="true" />Out of stock</span>
}

export function ProductCard({ product: p, onOpen }: { product: Product; onOpen?: (p: Product) => void }) {
  const { currency, rate } = useCurrency()
  const fp = fromPrice(p)
  const stock = isInStock(p.stock_status)
  const cat = getCategoryList(p)[0]

  const onClick = (e: MouseEvent) => {
    if (!onOpen || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    onOpen(p)
  }

  return (
    <article className={`${s.card} ${!stock || !fp ? s.cardDim : ''}`}>
      <span className={s.cardSave}><SaveButton product={p} /></span>
      <div className={s.cardTop}>
        <ProductLogo product={p} size={48} />
        <div className={s.cardHead}>
          <h3 className={s.cardName} title={p.name}>
            <Link href={productHref(p)} className={s.cardLink} onClick={onClick}>{p.name}</Link>
          </h3>
          {cat && <div className={s.cardCat}>{categoryLabel(cat)}</div>}
          <RatingLine product={p} />
        </div>
      </div>
      {(p.short_description || p.category_tagline || p.description) && (
        <p className={s.cardDesc}>{p.short_description || p.category_tagline || p.description}</p>
      )}
      {p.badge && <div><span className={s.tag}>{p.badge}</span></div>}
      <div className={s.cardFoot}>
        {fp ? (
          <div className={s.cardPrice}>
            <span className={s.cardPriceNow}>{format(fp.price * rate, currency)}</span>
            <span className={s.cardPricePer}>{isOneTime(p) ? 'one-time' : `${PERIODS[fp.period]?.label}`}</span>
          </div>
        ) : <span className={s.cardPricePer}>Not available</span>}
        <StockLine inStock={stock} available={!!fp} />
      </div>
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className={s.skelCard} aria-hidden="true">
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <Skeleton width={48} height={48} radius="var(--bs-radius-lg)" />
        <div style={{ flex: 1, display: 'grid', gap: 8 }}><Skeleton width="60%" height={16} /><Skeleton width="35%" height={12} /></div>
      </div>
      <Skeleton width="90%" height={12} />
      <div className={s.skelFoot}><Skeleton width={110} height={20} /><Skeleton width={64} height={14} /></div>
    </div>
  )
}
