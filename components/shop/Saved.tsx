'use client'

// The recently viewed strip and back-in-stock alerts. The heart is SaveButton.tsx.

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button, Field, Input } from '@/components/ui'
import { authFetch } from '@/lib/apiAuth'
import { useRecentIds } from '@/lib/saved'
import { useProducts } from '@/lib/useProducts'
import { useSession } from '@/lib/useSession'
import { isValidEmail, type Product } from '@/lib/constants'
import { ProductCard } from './ProductCard'
import s from './shop.module.css'

/** Products from the catalog in the given id order, skipping any that are gone. */
export function useProductsById(ids: string[], exclude?: string): Product[] {
  const { products } = useProducts()
  return useMemo(() => {
    const by = new Map(products.map(p => [p.id, p]))
    return ids.filter(id => id !== exclude).map(id => by.get(id)).filter(Boolean) as Product[]
  }, [products, ids, exclude])
}

export function RecentlyViewed({ exclude, title = 'Recently viewed', max = 4 }: { exclude?: string; title?: string; max?: number }) {
  const list = useProductsById(useRecentIds(), exclude).slice(0, max)
  if (!list.length) return null
  return (
    <section className={s.section} style={{ marginTop: 'var(--bs-space-12)' }}>
      <h2 className={s.sectionTitle}>{title}</h2>
      <div className={s.grid}>{list.map(p => <ProductCard key={p.id} product={p} />)}</div>
    </section>
  )
}

/** Out of stock: leave an email, get one message when it's back. */
export function StockAlert({ product }: { product: Product }) {
  const session = useSession()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (session.user?.email) setEmail(e => e || session.user!.email) }, [session.user])

  if (done) return <p className={s.alertDone}>We’ll email {email} once when {product.name} is back.</p>

  const submit = async () => {
    if (!isValidEmail(email)) { setError('Enter a valid email address.'); return }
    setBusy(true); setError('')
    const r = await authFetch('/v2/stock-alerts', {
      method: 'POST', body: { product_id: product.id, email: email.trim() },
      redirectOnAuth: false, anonymous: session.status !== 'signed_in',
    })
    setBusy(false)
    if (!r.ok) { setError(r.error || 'Couldn’t set the alert. Try again.'); return }
    setDone(true)
  }

  return (
    <div className={s.alertBox}>
      <Field label="Email me when it’s back" error={error || undefined}>
        {p => <Input {...p} type="email" autoComplete="email" inputMode="email" value={email} placeholder="you@example.com"
          onChange={e => { setEmail(e.target.value); setError('') }} onKeyDown={e => { if (e.key === 'Enter') submit() }} />}
      </Field>
      <Button variant="secondary" full icon="bell" loading={busy} onClick={submit}>Notify me</Button>
    </div>
  )
}
