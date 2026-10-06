// ============================================================
// BUYSUB — Catalog helpers
// ============================================================
// Product-page content with sensible fallbacks, and the offer model.
//
// Offers: BuySub is the only seller today, but the product page is built
// around a list of offers (seller + delivery + price per period) so a second
// seller is a data change, not a redesign. toOffers returns one BuySub offer;
// the "Other sellers" block only renders when there is more than one.

import { PERIODS, getCategoryList, isInStock, type Product } from './constants'
import { availablePeriods, fromPrice, priceFor } from './pricing'

export type Offer = {
  sellerId: string
  sellerName: string
  verified: boolean
  deliveryTime: string | null
  deliveryMethod: string | null
  inStock: boolean
  periods: { period: string; price: number }[]
}

// No invented promises: when admin hasn't set delivery details, the page
// says nothing about timing rather than guessing an SLA.
export function deliveryTime(p: Product): string | null {
  return p.delivery_time?.trim() || null
}
export function deliveryMethod(p: Product): string | null {
  return p.delivery_method?.trim() || null
}

/**
 * One-time products (top-ups, gift cards) have no billing period. The API
 * stores the same price in every period column, and orders still carry a
 * period, as with the old storefront. So they're sold through their default
 * period and labelled "One-time" everywhere instead of showing period choices.
 */
export const isOneTime = (p: Pick<Product, 'billing_type'>) => p.billing_type === 'one_time'

export function toOffers(p: Product): Offer[] {
  return [{
    sellerId: 'buysub',
    sellerName: 'BuySub',
    verified: true,
    deliveryTime: deliveryTime(p),
    deliveryMethod: deliveryMethod(p),
    inStock: isInStock(p.stock_status),
    periods: (isOneTime(p) ? [defaultPeriod(p)].filter((x): x is string => !!x) : availablePeriods(p))
      .map(period => ({ period, price: priceFor(p, period)! })),
  }]
}

/** The default steps when a product has no how_it_works of its own. */
export const DEFAULT_STEPS = [
  'Choose a plan and pay securely with Paystack, or order on WhatsApp.',
  'We confirm your order and set up your subscription.',
  'You get a receipt by email, and our team sends your access details.',
  'Track the order any time from your account.',
]

export function howItWorks(p: Product): string[] {
  const s = Array.isArray(p.how_it_works) ? p.how_it_works.filter(Boolean) : []
  return s.length ? s : DEFAULT_STEPS
}

export function features(p: Product): string[] {
  return Array.isArray(p.features) ? p.features.filter(Boolean) : []
}

export function faqs(p: Product): { q: string; a: string }[] {
  return Array.isArray(p.faqs) ? p.faqs.filter(f => f && f.q && f.a) : []
}

export const TRUST_POINTS = [
  { icon: 'shield', title: 'Secure payment', text: 'Cards and bank transfer through Paystack.' },
  { icon: 'receipt', title: 'Order tracking', text: 'Every order and receipt is in your account.' },
  { icon: 'message', title: 'Real support', text: 'Talk to a person on WhatsApp.' },
] as const

/** Default period for a product's buy box: quarterly when sold, else the cheapest. */
export function defaultPeriod(p: Product): string | null {
  const avail = availablePeriods(p)
  if (!avail.length) return null
  if (avail.includes('quarterly')) return 'quarterly'
  return fromPrice(p)?.period ?? avail[0]
}

/** Up to n products sharing a category, in stock first. */
export function related(p: Product, all: Product[], n = 6): Product[] {
  const cats = new Set(getCategoryList(p))
  return all
    .filter(x => x.id !== p.id && getCategoryList(x).some(c => cats.has(c)))
    .sort((a, b) => Number(isInStock(b.stock_status)) - Number(isInStock(a.stock_status)) || (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .slice(0, n)
}

export const periodName = (k: string) => PERIODS[k]?.name ?? k
export const productHref = (p: Pick<Product, 'slug'>) => `/shop/${encodeURIComponent(p.slug)}`
export const categoryHref = (c: string) => `/shop/c/${encodeURIComponent(c)}`
