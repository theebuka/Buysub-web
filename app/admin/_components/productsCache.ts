'use client'

// Every product, for pickers (new order). /v2/admin/products caps a page at
// 100, so a single ?limit=500 call silently stopped at the first 100.
import { authFetch } from '@/lib/apiAuth'
import type { Product } from '../_lib/shared'

let all: Promise<Product[]> | null = null

export function loadAllProducts(fresh = false): Promise<Product[]> {
  if (all && !fresh) return all
  all = (async () => {
    const out: Product[] = []
    for (let page = 1; page <= 20; page++) {
      const r = await authFetch<Product[]>(`/v2/admin/products?limit=100&page=${page}`)
      if (!r.ok || !Array.isArray(r.data)) break
      out.push(...r.data)
      const pages = Number(r.meta?.pagination?.pages) || 1
      if (page >= pages || r.data.length < 100) break
    }
    return out
  })()
  all.catch(() => { all = null })
  return all
}
