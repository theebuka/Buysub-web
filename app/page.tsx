import { redirect } from 'next/navigation'
import HomePage from '@/components/home/HomePage'

// Reading searchParams makes this route dynamic, and Cloudflare Pages
// (next-on-pages) requires every dynamic route to run on the edge runtime.
export const runtime = 'edge'

// `/` used to redirect everything to /shop. It is the home page now, but old
// links that carried shop filters still land on the catalog with them.
// ?ref= stays here: useReferral on the home page records it.
const SHOP_PARAMS = ['q', 'category', 'sort', 'period', 'currency', 'tag', 'min', 'max']

export default function Home({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  if (SHOP_PARAMS.some(k => searchParams[k] !== undefined)) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (Array.isArray(v)) v.forEach(x => qs.append(k, x))
      else if (v !== undefined) qs.set(k, v)
    }
    redirect(`/shop?${qs.toString()}`)
  }
  return <HomePage />
}
