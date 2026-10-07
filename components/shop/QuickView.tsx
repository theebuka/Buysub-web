'use client'

// Product quick view over the catalog. Opening it pushes /shop/[slug] onto
// history, so the address bar is shareable and Back closes it; a direct load
// of that URL renders the full page instead (app/shop/[slug]). Plain
// history.pushState rather than intercepting routes, which are fragile under
// next-on-pages.

import { useEffect, useRef } from 'react'
import { recordView } from '@/lib/saved'
import { SaveButton } from './SaveButton'
import { Button, IconButton, Modal } from '@/components/ui'
import type { Product } from '@/lib/constants'
import { productHref } from '@/lib/catalog'
import { BuyBox } from './BuyBox'
import { Features, HowItWorks, ProductHero, ShareButton } from './ProductDetail'
import s from './shop.module.css'

export function useQuickView(onChange: (p: Product | null) => void, current: Product | null) {
  const pushed = useRef(false)
  const back = useRef<string>('')

  useEffect(() => {
    const onPop = () => { if (pushed.current) { pushed.current = false; onChange(null) } }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [onChange])

  const open = (p: Product) => {
    back.current = window.location.pathname + window.location.search
    const ref = new URLSearchParams(window.location.search).get('ref')
    window.history.pushState({ bsQuickView: p.slug }, '', productHref(p) + (ref ? `?ref=${encodeURIComponent(ref)}` : ''))
    pushed.current = true
    onChange(p)
  }
  const close = () => {
    if (pushed.current) { pushed.current = false; window.history.back() }
    onChange(null)
  }
  return { open, close, isOpen: !!current }
}

export function QuickView({ product, onClose }: { product: Product | null; onClose: () => void }) {
  useEffect(() => { if (product) recordView(product.id) }, [product])
  return (
    <Modal open={!!product} onClose={onClose} wide hideHeader labelledBy="qv-title">
      {product && (
        <>
          <span className={s.qvClose}><IconButton icon="close" label="Close" onClick={onClose} /></span>
          <div className={s.qv}>
            <div className={s.qvMain}>
              <ProductHero product={product} headingId="qv-title" as="h2" />
              <Features product={product} />
              <HowItWorks product={product} />
              <div style={{ display: 'flex', gap: 'var(--bs-space-2)', flexWrap: 'wrap' }}>
                {/* A full load, not a client transition: the address bar
                    already shows this URL via pushState, and the router
                    still believes it is on /shop. */}
                <Button variant="secondary" size="md" iconRight="arrowRight"
                  onClick={() => window.location.replace(window.location.href)}>
                  Full details & FAQs
                </Button>
                <ShareButton product={product} />
                <SaveButton product={product} variant="button" />
              </div>
            </div>
            {/* Close first, so the cart drawer isn't stacked on the quick view. */}
            <BuyBox product={product} onAdded={onClose} />
          </div>
        </>
      )}
    </Modal>
  )
}
