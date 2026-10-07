import { notFound } from 'next/navigation'
import { cache } from 'react'
import ProductPage from '@/components/shop/ProductPage'
import { API_BASE, SITE_URL } from '@/lib/config'
import { getCategoryList, isInStock, type Product } from '@/lib/constants'
import { availablePeriods, priceFor } from '@/lib/pricing'
import { categoryLabel } from '@/lib/format'

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
      // no-store: Next caches fetch() forever by default, which served stale
      // prices and product fields until the next deploy.
      fetch(`${API_BASE}/v2/products/${encodeURIComponent(slug)}`, { signal: ctrl.signal, cache: 'no-store' }),
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
    openGraph: { title, description, type: 'website', url: `${SITE_URL}/shop/${encodeURIComponent(p.slug)}` },
    alternates: { canonical: `${SITE_URL}/shop/${encodeURIComponent(p.slug)}` },
  }
}

// schema.org Product + BreadcrumbList, so search results can show the price
// range, stock and rating. Only facts the page itself shows.
function structuredData(p: Product) {
  const url = `${SITE_URL}/shop/${encodeURIComponent(p.slug)}`
  const prices = availablePeriods(p).map(k => priceFor(p, k)).filter((n): n is number => n !== null)
  const product: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.seo_description || p.short_description || p.description || undefined,
    sku: p.id,
    url,
    ...(p.image_url ? { image: p.image_url } : {}),
    ...(p.category ? { category: categoryLabel(getCategoryList(p)[0] || p.category) } : {}),
  }
  if (prices.length) {
    product.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: 'NGN',
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: prices.length,
      availability: isInStock(p.stock_status) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'BuySub' },
      url,
    }
  }
  if ((p.rating_count ?? 0) > 0 && p.rating_avg != null) {
    product.aggregateRating = { '@type': 'AggregateRating', ratingValue: p.rating_avg, reviewCount: p.rating_count, bestRating: 5, worstRating: 1 }
  }
  const cat = getCategoryList(p)[0]
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Shop', item: `${SITE_URL}/shop` },
      ...(cat ? [{ '@type': 'ListItem', position: 2, name: categoryLabel(cat), item: `${SITE_URL}/shop/c/${encodeURIComponent(cat)}` }] : []),
      { '@type': 'ListItem', position: cat ? 3 : 2, name: p.name, item: url },
    ],
  }
  // "<" escaped so product text can never close the script element.
  return JSON.stringify([product, crumbs]).replace(/</g, '\\u003c')
}

export default async function Page({ params }: Params) {
  const p = await load(params.slug)
  if (p === 'missing') notFound()
  return (
    <>
      {p && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData(p) }} />}
      <ProductPage slug={params.slug} initial={p} />
    </>
  )
}
