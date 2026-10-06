'use client'

// ============================================================
// BUYSUB — Cached public product list
// ============================================================
// One /v2/products request per page load, shared by every consumer (mega
// menu, command palette). Lazy: nothing is fetched until a component calls
// useProducts({ enabled: true }), so the header doesn't add a request to
// pages where nobody opens the menu.

import { useEffect, useState } from 'react'
import { getProducts } from './api'
import type { Product } from './constants'

let cache: Product[] | null = null
let inflight: Promise<Product[]> | null = null

export function fetchProducts(): Promise<Product[]> {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = getProducts()
      .then(r => {
        cache = r.ok && Array.isArray(r.data) ? (r.data as Product[]) : []
        return cache
      })
      .catch(() => { inflight = null; return [] as Product[] })
  }
  return inflight
}

export function useProducts({ enabled = true }: { enabled?: boolean } = {}) {
  const [products, setProducts] = useState<Product[] | null>(cache)
  useEffect(() => {
    if (!enabled || products) return
    let live = true
    fetchProducts().then(p => { if (live) setProducts(p) })
    return () => { live = false }
  }, [enabled, products])
  return { products: products ?? [], loading: enabled && products === null }
}
