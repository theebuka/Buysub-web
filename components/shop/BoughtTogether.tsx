'use client'

// "Frequently bought together": this product plus up to two others that are
// most often on the same paid order (GET /v2/products/:slug/related), topped
// up from the same category when there isn't enough order history. Each line
// goes in the cart at its default period; there is no bundle discount, so
// the total is just the sum, and checkout re-prices as usual.

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button, ProductLogo } from '@/components/ui'
import { API_BASE } from '@/lib/config'
import { addToCart, setCartDrawer } from '@/lib/cart'
import { useCurrency } from '@/lib/currency'
import { useProducts } from '@/lib/useProducts'
import { format, isInStock, PERIODS, type Product } from '@/lib/constants'
import { priceFor } from '@/lib/pricing'
import { defaultPeriod, isOneTime, productHref, related } from '@/lib/catalog'
import s from './shop.module.css'

function buyable(p: Product) {
  const period = defaultPeriod(p)
  return period && isInStock(p.stock_status) && priceFor(p, period) !== null ? period : null
}

export function BoughtTogether({ product }: { product: Product }) {
  const { products } = useProducts()
  const { currency, rate } = useCurrency()
  const [ids, setIds] = useState<string[] | null>(null)
  const [off, setOff] = useState<Set<string>>(new Set())

  useEffect(() => {
    let live = true
    setIds(null); setOff(new Set())
    fetch(`${API_BASE}/v2/products/${encodeURIComponent(product.slug)}/related`)
      .then(r => r.json())
      .then(j => { if (live) setIds(j?.ok && Array.isArray(j.data) ? j.data.map((x: any) => x.product_id) : []) })
      .catch(() => { if (live) setIds([]) })
    return () => { live = false }
  }, [product.slug])

  const { lines, fromOrders } = useMemo(() => {
    if (!ids || !products.length) return { lines: [] as Product[], fromOrders: false }
    const by = new Map(products.map(p => [p.id, p]))
    const bought = ids.map(id => by.get(id)).filter((p): p is Product => !!p && p.id !== product.id && !!buyable(p))
    const fill = related(product, products, 6).filter(p => !!buyable(p) && !bought.some(b => b.id === p.id))
    return { lines: [...bought, ...fill].slice(0, 2), fromOrders: bought.length > 0 }
  }, [ids, products, product])

  if (!buyable(product) || lines.length === 0) return null
  const all = [product, ...lines]
  const chosen = all.filter(p => !off.has(p.id))
  const total = chosen.reduce((sum, p) => sum + (priceFor(p, buyable(p)!) || 0), 0)

  const toggle = (id: string) => setOff(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const addAll = () => {
    let added = 0
    for (const p of chosen) if (addToCart(p, buyable(p)!, 1)) added++
    if (!added) return
    toast.success(`${added} item${added === 1 ? '' : 's'} added to cart`)
    setCartDrawer(true)
  }

  return (
    <section className={s.section}>
      <h2 className={s.sectionTitle}>{fromOrders ? 'Frequently bought together' : 'Goes well with'}</h2>
      <div className={s.fbt}>
        <ul className={s.fbtList}>
          {all.map((p, i) => {
            const period = buyable(p)!
            const price = priceFor(p, period)!
            const on = !off.has(p.id)
            return (
              <li key={p.id} className={s.fbtItem}>
                <input type="checkbox" id={`fbt-${p.id}`} checked={on} onChange={() => toggle(p.id)} className={s.fbtCheck} />
                <ProductLogo product={p} size={36} />
                <label htmlFor={`fbt-${p.id}`} className={s.fbtName}>
                  <span>{i === 0 ? <><b>This item:</b> {p.name}</> : p.name}</span>
                  <span className={s.muted}>{isOneTime(p) ? 'One-time' : PERIODS[period]?.name}</span>
                </label>
                {i > 0 && <Link href={productHref(p)} className={s.fbtView}>View</Link>}
                <span className={s.fbtPrice}>{format(price * rate, currency)}</span>
              </li>
            )
          })}
        </ul>
        <div className={s.fbtFoot}>
          <div>
            <div className={s.muted}>Total for {chosen.length} item{chosen.length === 1 ? '' : 's'}</div>
            <div className={s.fbtTotal}>{format(total * rate, currency)}</div>
          </div>
          <Button icon="cart" disabled={!chosen.length} onClick={addAll}>
            {chosen.length > 1 ? `Add ${chosen.length} to cart` : 'Add to cart'}
          </Button>
        </div>
      </div>
    </section>
  )
}
