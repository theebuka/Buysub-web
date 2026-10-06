import OrderDetail from '@/components/account/OrderDetail'

// Dynamic route: Cloudflare Pages (next-on-pages) needs the edge runtime.
export const runtime = 'edge'

export const metadata = { title: 'Order · BuySub' }

export default function Page({ params }: { params: { ref: string } }) {
  return <OrderDetail orderRef={decodeURIComponent(params.ref)} />
}
