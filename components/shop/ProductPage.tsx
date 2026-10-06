'use client'

// /shop/[slug]: the full product page. The server route passes the product
// it fetched for metadata (so the content is in the HTML); if that fetch
// failed it is loaded here instead.

import { useEffect, useState } from 'react'
import { Breadcrumbs, ButtonLink, Card, EmptyState, Skeleton } from '@/components/ui'
import { getProductBySlug } from '@/lib/api'
import { format, getCategoryList, type Product } from '@/lib/constants'
import { fromPrice } from '@/lib/pricing'
import { categoryHref, related } from '@/lib/catalog'
import { categoryLabel } from '@/lib/format'
import { useCurrency } from '@/lib/currency'
import { useProducts } from '@/lib/useProducts'
import { useReferral } from '@/lib/useReferral'
import { BuyBox } from './BuyBox'
import { Description, Faqs, Features, HowItWorks, ProductHero, ShareButton, Trust } from './ProductDetail'
import { ProductCard } from './ProductCard'
import s from './shop.module.css'

function MobileBuyBar({ product }: { product: Product }) {
  const { currency, rate } = useCurrency()
  const fp = fromPrice(product)
  if (!fp) return null
  return (
    <div className={s.buyBar}>
      <div className={s.buyBarPrice}>
        <div className={s.muted}>{product.billing_type === 'one_time' ? 'Price' : 'From'}</div>
        <div style={{ fontWeight: 700, fontSize: 'var(--bs-text-lg)' }}>{format(fp.price * rate, currency)}</div>
      </div>
      <ButtonLink href="#buy" size="lg">Choose a plan</ButtonLink>
    </div>
  )
}

export default function ProductPage({ slug, initial }: { slug: string; initial: Product | null }) {
  useReferral() // records ?ref= from shared product links
  const [product, setProduct] = useState<Product | null>(initial)
  const [missing, setMissing] = useState(false)
  const { products } = useProducts()

  useEffect(() => {
    if (initial) return
    getProductBySlug(slug).then(r => { if (r.ok && r.data) setProduct(r.data); else setMissing(true) }).catch(() => setMissing(true))
  }, [slug, initial])

  if (missing) {
    return (
      <EmptyState icon="search" title="Product not found"
        action={<ButtonLink href="/shop" icon="store">Browse the shop</ButtonLink>}>
        It may have been renamed or removed.
      </EmptyState>
    )
  }
  if (!product) {
    return (
      <div className={s.page}>
        <div className={s.productLayout}>
          <div className={s.productMain}><Skeleton height={96} /><Skeleton height={200} /></div>
          <Skeleton height={360} radius="var(--bs-radius-xl)" />
        </div>
      </div>
    )
  }

  const cat = getCategoryList(product)[0]
  const more = related(product, products)

  return (
    <div className={s.page} style={{ paddingBottom: 'var(--bs-space-12)' }}>
      <Breadcrumbs items={[
        { label: 'Shop', href: '/shop' },
        ...(cat ? [{ label: categoryLabel(cat), href: categoryHref(cat) }] : []),
        { label: product.name },
      ]} />
      <div className={s.productLayout}>
        <div className={s.productMain}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bs-space-3)' }}>
            <ProductHero product={product} />
            <div><ShareButton product={product} /></div>
          </div>
          <Features product={product} />
          <Description product={product} />
          <HowItWorks product={product} />
          <Faqs product={product} />
          <Trust />
        </div>
        <Card id="buy" className={s.sticky} style={{ scrollMarginTop: 'calc(var(--bs-header-h) + 16px)' }}>
          <BuyBox product={product} />
        </Card>
      </div>
      {more.length > 0 && (
        <section className={s.section} style={{ marginTop: 'var(--bs-space-12)' }}>
          <h2 className={s.sectionTitle}>You might also like</h2>
          <div className={s.grid}>{more.map(p => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
      <MobileBuyBar product={product} />
    </div>
  )
}
