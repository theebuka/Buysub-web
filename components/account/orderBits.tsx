'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ProductLogo } from '@/components/ui'
import { addToCart } from '@/lib/cart'
import { fetchProducts } from '@/lib/useProducts'
import { periodKey, type MyOrder, type OrderItem } from '@/lib/subscriptions'
import { priceFor } from '@/lib/pricing'

export function ItemLogo({ item, size = 36 }: { item: Pick<OrderItem, 'product_name' | 'products'>; size?: number }) {
  return (
    <ProductLogo
      product={{ name: item.product_name, domain: item.products?.domain ?? null, image_url: item.products?.image_url ?? null }}
      size={size}
      radius="var(--bs-radius-md)"
    />
  )
}

/** "Netflix Premium", or "Netflix Premium and 2 more". */
export function itemsSummary(order: Pick<MyOrder, 'order_items'>): string {
  const items = order.order_items || []
  if (!items.length) return 'No items'
  const first = items[0].product_name
  return items.length === 1 ? first : `${first} and ${items.length - 1} more`
}

export const PAYMENT_LABEL: Record<string, string> = {
  paystack: 'Paystack', whatsapp: 'WhatsApp order', bank_transfer: 'Bank transfer',
  cash: 'Cash', wallet: 'Wallet', free: 'No charge',
}

/** What the order cost: total_ngn is only what was charged after the wallet part. */
export function orderValue(o: Pick<MyOrder, 'total_ngn' | 'wallet_ngn'>): number {
  return (Number(o.total_ngn) || 0) + (Number(o.wallet_ngn) || 0)
}

/** "Wallet", or "Paystack and wallet" when the wallet covered part of it. */
export function paymentLabel(o: Pick<MyOrder, 'payment_method' | 'wallet_ngn'>): string {
  const base = PAYMENT_LABEL[o.payment_method] || o.payment_method
  return Number(o.wallet_ngn) > 0 && o.payment_method !== 'wallet' ? `${base} and wallet` : base
}

/**
 * Puts order lines back in the cart at today's price and goes to checkout.
 * Lines the shop no longer sells for that period are skipped and named.
 */
export function useReorder() {
  const router = useRouter()
  return async (items: OrderItem[]) => {
    const catalog = await fetchProducts()
    const byId = new Map(catalog.map(p => [p.id, p]))
    const bySlug = new Map(catalog.map(p => [p.slug, p]))
    const skipped: string[] = []
    let added = 0
    for (const it of items) {
      const p = (it.product_id && byId.get(it.product_id)) || (it.products?.slug && bySlug.get(it.products.slug))
      const period = periodKey(it.billing_period)
      if (!p || !period || priceFor(p, period) === null) { skipped.push(it.product_name); continue }
      if (addToCart(p, period, Math.max(1, Number(it.quantity) || 1))) added++
      else skipped.push(it.product_name)
    }
    if (skipped.length) toast.error(`${skipped.join(', ')} ${skipped.length === 1 ? 'isn’t' : 'aren’t'} available to buy right now.`)
    if (added) router.push('/checkout')
  }
}
