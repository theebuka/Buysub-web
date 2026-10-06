import { notFound } from 'next/navigation'
import { cache } from 'react'
import ProductPage from '@/components/shop/ProductPage'
import { API_BASE } from '@/lib/config'
import type { Product } from '@/lib/constants'

// Dynamic route: Cloudflare Pages (next-on-pages) needs the edge runtime.
export const runtime = 'edge'

type Params = { params: { slug: string } }

// One fetch serves both metadata and the page: React cache() de-duplicates it
// within a request (fetch de-duplication alone doesn't hold under
// next-on-pages). A slow API must not hold the page: after 1.5s it renders
// without server data and the client loads the product itself. The timer is a
// plain race, not AbortSignal.timeout, which the Pages worker didn't honour.
const load = cache(async (slug: string): Promise<Product | null | 'missing'> => {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 1500)
  try {
    const res = await Promise.race([
      fetch(`${API_BASE}/v2/products/${encodeURIComponent(slug)}`, { signal: ctrl.signal }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
    ])
    if (res.status === 404) return 'missing'
    if (!res.ok) return null
    const j = await res.json()
    return j?.ok && j.data ? (j.data as Product) : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
})

export async function generateMetadata({ params }: Params) {
  const p = await load(params.slug)
  if (!p || p === 'missing') return { title: 'Shop · BuySub' }
  const title = p.seo_title || `${p.name} · BuySub`
  const description = p.seo_description || p.short_description || p.category_tagline || `Buy ${p.name} in Naira on BuySub.`
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
  }
}

export default async function Page({ params }: Params) {
  const p = await load(params.slug)
  if (p === 'missing') notFound()
  return <ProductPage slug={params.slug} initial={p} />
}
