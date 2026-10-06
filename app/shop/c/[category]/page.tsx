import ShopPage from '@/components/shop/ShopPage'
import { categoryLabel } from '@/lib/format'

// Dynamic route: Cloudflare Pages (next-on-pages) needs the edge runtime.
export const runtime = 'edge'

type Params = { params: { category: string } }

export function generateMetadata({ params }: Params) {
  const c = decodeURIComponent(params.category).toLowerCase()
  return {
    title: `${categoryLabel(c)} subscriptions · BuySub`,
    description: `Buy ${categoryLabel(c).toLowerCase()} subscriptions in Naira on BuySub.`,
  }
}

export default function Page({ params }: Params) {
  return <ShopPage initialCategory={decodeURIComponent(params.category)} />
}
