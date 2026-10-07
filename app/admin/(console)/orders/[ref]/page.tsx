import { OrderDetail } from '../../../_components/OrderDetail'

// Dynamic route: Cloudflare Pages (next-on-pages) needs the edge runtime.
export const runtime = 'edge'

export const metadata = { title: 'Order · BuySub admin' }

export default function Page({ params }: { params: { ref: string } }) {
  return <OrderDetail orderRef={decodeURIComponent(params.ref)} />
}
