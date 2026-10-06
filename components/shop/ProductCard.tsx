'use client'

// A catalog card. The whole card is one link to /shop/[slug] (a stretched
// ::after on the name link), so it works with middle-click, open-in-new-tab
// and no JS. A plain click opens the quick view instead when onOpen is given.

import Link from 'next/link'
import type { MouseEvent } from 'react'
import { Badge, ProductLogo, Skeleton } from '@/components/ui'
import { format, getCategoryList, isInStock, PERIODS, type Product } from '@/lib/constants'
import { fromPrice } from '@/lib/pricing'
import { isOneTime, productHref } from '@/lib/catalog'
import { categoryLabel } from '@/lib/format'
import { useCurrency } from '@/lib/currency'
import s from './shop.module.css'

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
      {p.badge && <span className={s.cardBadge}><Badge tone="info">{p.badge}</Badge></span>}
      <div className={s.cardTop}>
        <ProductLogo product={p} size={48} />
        <div style={{ minWidth: 0, paddingRight: p.badge ? 'var(--bs-space-12)' : undefined }}>
          <h3 className={s.cardName}>
            <Link href={productHref(p)} className={s.cardLink} onClick={onClick}>{p.name}</Link>
          </h3>
          {cat && <div className={s.cardCat}>{categoryLabel(cat)}</div>}
        </div>
      </div>
      <p className={s.cardDesc}>{p.short_description || p.category_tagline || p.description || ''}</p>
      <div className={s.cardFoot}>
        {fp ? (
          <div>
            <div className={s.muted}>{isOneTime(p) ? 'One-time' : 'From'}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 'var(--bs-text-lg)', fontWeight: 'var(--bs-weight-bold)' as any, fontVariantNumeric: 'tabular-nums' }}>
                {format(fp.price * rate, currency)}
              </span>
              {!isOneTime(p) && <span className={s.muted}>{PERIODS[fp.period]?.label}</span>}
            </div>
          </div>
        ) : <span className={s.muted}>Currently unavailable</span>}
        {!stock ? <Badge tone="error">Out of stock</Badge> : fp ? <Badge tone="success">In stock</Badge> : null}
      </div>
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className={s.skelCard} aria-hidden="true">
      <div style={{ display: 'flex', gap: 12 }}>
        <Skeleton width={48} height={48} radius="var(--bs-radius-lg)" />
        <div style={{ flex: 1, display: 'grid', gap: 8 }}><Skeleton height={16} /><Skeleton width="50%" height={12} /></div>
      </div>
      <Skeleton height={12} /><Skeleton width="80%" height={12} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}><Skeleton width={90} height={24} /><Skeleton width={64} height={22} /></div>
    </div>
  )
}
