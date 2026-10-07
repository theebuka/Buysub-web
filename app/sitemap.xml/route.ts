import { API_BASE, SITE_URL } from '@/lib/config'
import { getCategoryList, type Product } from '@/lib/constants'

// /sitemap.xml, built per request from the live catalog. A plain route
// handler rather than app/sitemap.ts: under next-on-pages the metadata-route
// version never got its catalog fetch back and listed only the static pages.
// If the API is slow or down, the static pages still list.
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

async function products(): Promise<Product[]> {
  try {
    const j: any = await Promise.race([
      fetch(`${API_BASE}/v2/products?limit=1000`, { cache: 'no-store' }).then(r => r.json()),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ])
    return j?.ok && Array.isArray(j.data) ? j.data : []
  } catch {
    return []
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function GET() {
  const list = await products()
  const cats = new Set<string>()
  for (const p of list) getCategoryList(p).forEach(c => cats.add(c))
  const urls: { loc: string; lastmod?: string; freq: string; priority: number }[] = [
    { loc: `${SITE_URL}/`, freq: 'daily', priority: 1 },
    { loc: `${SITE_URL}/shop`, freq: 'daily', priority: 0.9 },
    { loc: `${SITE_URL}/partners`, freq: 'monthly', priority: 0.5 },
    { loc: `${SITE_URL}/help`, freq: 'monthly', priority: 0.4 },
    ...[...cats].map(c => ({ loc: `${SITE_URL}/shop/c/${encodeURIComponent(c)}`, freq: 'weekly', priority: 0.7 })),
    ...list.filter(p => p.slug).map(p => ({
      loc: `${SITE_URL}/shop/${encodeURIComponent(p.slug)}`,
      lastmod: (p as any).updated_at ? new Date((p as any).updated_at).toISOString() : undefined,
      freq: 'weekly',
      priority: 0.8,
    })),
  ]
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u =>
    `<url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.freq}</changefreq><priority>${u.priority}</priority></url>`,
  ).join('\n')}\n</urlset>\n`
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
}
