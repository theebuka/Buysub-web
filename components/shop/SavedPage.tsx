'use client'

// /saved: products saved with the heart, and recently viewed. Saved items
// follow the account when signed in and stay in this browser when not
// (lib/saved.ts), so this page works signed out too. Recently viewed is
// always this browser only.

import { useEffect, useState } from 'react'
import { Button, ButtonLink, EmptyState, PageHeader } from '@/components/ui'
import { clearRecent, useRecentIds, useSavedIds } from '@/lib/saved'
import { useProducts } from '@/lib/useProducts'
import { ROUTES } from '@/lib/routes'
import { useSession } from '@/lib/useSession'
import { loginUrl } from '@/lib/apiAuth'
import { ProductCard, ProductCardSkeleton } from './ProductCard'
import { useProductsById } from './Saved'
import s from './shop.module.css'

export default function SavedPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const { loading } = useProducts()
  const saved = useProductsById(useSavedIds())
  const recent = useProductsById(useRecentIds())
  const session = useSession()

  return (
    <div className={s.page}>
      <PageHeader crumbs={[{ label: 'Shop', href: ROUTES.shop }, { label: 'Saved' }]} title="Saved"
        description={session.status === 'signed_out'
          ? <>Saved on this device. <a href={loginUrl(ROUTES.saved)} className={s.inlineLink}>Sign in</a> to keep them on every device.</>
          : 'Products you’ve saved, and what you looked at recently.'} />
      {!mounted || loading ? (
        <div className={s.grid}>{Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
      ) : (
        <>
          {saved.length
            ? <div className={s.grid}>{saved.map(p => <ProductCard key={p.id} product={p} />)}</div>
            : <EmptyState icon="heart" title="Nothing saved yet"
                action={<ButtonLink href={ROUTES.shop} icon="store">Browse the shop</ButtonLink>}>
                Tap the heart on any product to keep it here for later.
              </EmptyState>}
          {recent.length > 0 && (
            <section className={s.section} style={{ marginTop: 'var(--bs-space-12)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--bs-space-3)' }}>
                <h2 className={s.sectionTitle}>Recently viewed</h2>
                <Button variant="ghost" size="sm" onClick={clearRecent}>Clear</Button>
              </div>
              <div className={s.grid}>{recent.map(p => <ProductCard key={p.id} product={p} />)}</div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
