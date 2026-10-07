'use client'

// ============================================================
// BUYSUB — Discounts, totals and order placement
// ============================================================
// Ported from components/Marketplace.tsx without changing the money logic:
// the same order payload, the same discount mirror (lib/constants.ts
// isItemEligible / getEligibleSubtotal / calcDiscountAmount, which must stay
// in step with buysub-api-deploy/src/shared/discount.ts), the same Paystack
// callback and the same WhatsApp flow. The API re-prices and re-validates
// everything; these figures are for display.
//
// What changed is where the state lives: the applied promo code is a small
// shared store (kept for the tab in sessionStorage), so the cart drawer and
// /checkout show the same thing.

import { useEffect, useSyncExternalStore } from 'react'
import {
  PERIODS, format, getEligibleSubtotal, calcDiscountAmount, isValidEmail,
  normalizeVolumeTiers, volumeDiscountNGN,
  type AppliedDiscount,
} from './constants'
import {
  createOrder, createWhatsAppOrder, initPaystackPayment,
  getAutoApplyDiscounts, validateDiscount,
} from './api'
import { authFetch } from './apiAuth'
import type { Cart } from './cart'

// ── Promo state ───────────────────────────────────────────────
type PromoState = {
  manual: AppliedDiscount | null
  auto: AppliedDiscount | null
  autoLoaded: boolean
  /** Shown once when a code drops off because the cart fell below its minimum. */
  notice: string
}

const PROMO_KEY = 'bs_promo_code'
let promo: PromoState = { manual: null, auto: null, autoLoaded: false, notice: '' }
const promoListeners = new Set<() => void>()
function setPromo(patch: Partial<PromoState>) {
  promo = { ...promo, ...patch }
  try {
    if ('manual' in patch) {
      if (promo.manual) sessionStorage.setItem(PROMO_KEY, JSON.stringify(promo.manual))
      else sessionStorage.removeItem(PROMO_KEY)
    }
  } catch { /* storage unavailable */ }
  promoListeners.forEach(l => l())
}

let promoStarted = false
function startPromo() {
  if (promoStarted || typeof window === 'undefined') return
  promoStarted = true
  try {
    const raw = sessionStorage.getItem(PROMO_KEY)
    if (raw) promo = { ...promo, manual: JSON.parse(raw) }
  } catch { /* ignore */ }
  // The API returns pre-validated auto-apply codes; the first one applies.
  getAutoApplyDiscounts()
    .then(res => {
      const d = res.ok ? res.data?.discounts?.[0] : null
      setPromo({ auto: d ? ({ ...d, isAutoApplied: true } as AppliedDiscount) : null, autoLoaded: true })
    })
    .catch(() => setPromo({ autoLoaded: true }))
}

export function usePromo(): PromoState {
  return useSyncExternalStore(
    cb => { promoListeners.add(cb); startPromo(); queueMicrotask(cb); return () => { promoListeners.delete(cb) } },
    () => promo,
    () => promo,
  )
}

export function clearManualPromo() { setPromo({ manual: null, notice: '' }) }
export function clearPromoNotice() { if (promo.notice) setPromo({ notice: '' }) }

// ── Order lines ───────────────────────────────────────────────
// Verbatim from Marketplace: the shape /v2/orders, /v2/orders/whatsapp and
// /v2/discount/validate all accept.
export function orderItems(cart: Cart) {
  return Object.values(cart).map(({ product, qty, itemPeriod }) => {
    const cfg = PERIODS[itemPeriod]
    return {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      billing_period: cfg.name,
      billing_type: product.billing_type,
      duration_months: cfg.months,
      unit_price_ngn: (product as any)[cfg.field] || 0,
      quantity: qty,
      // For /v2/discount/validate's eligible subtotal. Orders ignore it: the
      // API works the volume discount out from the product itself.
      volume_discount_ngn: volumeDiscountNGN((product as any)[cfg.field] || 0, qty, normalizeVolumeTiers(product.volume_tiers)),
    }
  })
}

// ── Totals ────────────────────────────────────────────────────
export type Totals = {
  count: number
  subtotal: number
  /** Taken off by volume tiers (lib/constants volumeDiscountNGN). */
  volume: number
  /** Taken off by the promo code, after the volume discount. */
  discount: number
  total: number
  /** The active promo applies to only part of the cart. */
  partial: boolean
  active: AppliedDiscount | null
}

export function computeTotals(cart: Cart, fxRate: number, promoState: PromoState): Totals {
  const active = promoState.manual ?? promoState.auto
  const lines = Object.values(cart)
  const subtotal = lines.reduce((s, { product, qty, itemPeriod }) => {
    const price = (product as any)[PERIODS[itemPeriod].field]
    return s + (price ? price * fxRate * qty : 0)
  }, 0)
  const volume = lines.reduce((s, { product, qty, itemPeriod }) => {
    const price = (product as any)[PERIODS[itemPeriod].field]
    return s + (price ? volumeDiscountNGN(price, qty, normalizeVolumeTiers(product.volume_tiers)) * fxRate : 0)
  }, 0)
  const eligible = active ? getEligibleSubtotal(cart, active, fxRate) : 0
  const discount = active ? calcDiscountAmount(eligible, active, fxRate) : 0
  return {
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotal,
    volume,
    discount,
    total: Math.max(0, subtotal - volume - discount),
    partial: !!active && eligible < subtotal - volume && eligible > 0,
    active,
  }
}

/**
 * Drops a promo whose minimum order the cart no longer meets, as Marketplace
 * did. The API checks the minimum against the eligible subtotal, not the
 * whole cart. Mount once wherever totals are shown.
 */
export function usePromoMinimumGuard(cart: Cart, fxRate: number, currency: string) {
  const p = usePromo()
  useEffect(() => {
    for (const which of ['manual', 'auto'] as const) {
      const d = p[which]
      if (!d) continue
      const subtotalNGN = getEligibleSubtotal(cart, d, fxRate) / fxRate
      const min = (d as any).min_order_ngn || (d as any).minOrderNGN || 0
      if (min > 0 && subtotalNGN < min) {
        setPromo({
          [which]: null,
          notice: which === 'manual'
            ? `Promo "${d.code}" removed: the cart is below its minimum order of ${format(min * fxRate, currency)}.`
            : `Promotion removed: the cart is below its minimum order of ${format(min * fxRate, currency)}.`,
        } as Partial<PromoState>)
        return
      }
    }
  }, [cart, fxRate, currency, p])
}

/** Validates and applies a typed promo code. Returns an error message, or '' on success. */
export async function applyPromoCode(rawCode: string, cart: Cart): Promise<string> {
  const code = rawCode.trim().toUpperCase()
  if (!code) return 'Enter a code.'
  if (promo.auto?.is_exclusive) return 'A site-wide promotion is already applied. No additional codes can be used.'
  try {
    const res = await validateDiscount(code, orderItems(cart), true)
    if (!res.ok || !res.data?.valid) return res.error || res.data?.error || 'Code not found or inactive.'
    const d = res.data
    if (d.is_auto_apply) return 'Code not found or inactive.'
    // Keep the code's real restrictions so the displayed discount matches
    // what the API charges (caps, exclusions, minimum order).
    setPromo({
      notice: '',
      manual: {
        code: d.code,
        type: d.type,
        value: d.value,
        display: d.display,
        max_discount_ngn: d.max_discount_ngn ?? null,
        min_order_ngn: d.min_order_ngn ?? 0,
        included_products: d.included_products ?? null,
        excluded_products: d.excluded_products ?? null,
        included_categories: d.included_categories ?? null,
        excluded_categories: d.excluded_categories ?? null,
        is_auto_apply: d.is_auto_apply,
        scope: d.scope ?? 'site_wide',
        is_exclusive: d.is_exclusive,
        isAutoApplied: false,
      },
    })
    return ''
  } catch {
    return 'Could not validate code. Please try again.'
  }
}

// ── Customer details ──────────────────────────────────────────
export type CustomerDetails = { email: string; name: string; phone: string }

export function validateDetails(c: CustomerDetails): string {
  if (!isValidEmail(c.email)) return 'Please enter a valid email address.'
  if (!c.name.trim()) return 'Please enter your full name.'
  if (!c.phone.trim()) return 'Please enter your phone number.'
  return ''
}

type PlaceArgs = {
  cart: Cart
  customer: CustomerDetails
  currency: string
  fxRate: number
  discountCode?: string
  referralCode?: string | null
}

function payload({ cart, customer, currency, fxRate, discountCode, referralCode }: PlaceArgs, method: 'paystack' | 'whatsapp') {
  return {
    customer_email: customer.email,
    customer_name: customer.name,
    customer_phone: customer.phone,
    items: orderItems(cart),
    discount_code: discountCode || undefined,
    currency,
    fx_rate: fxRate,
    payment_method: method,
    referral_code: referralCode || undefined,
  }
}

const SUPPORT = 'Please try again. If the problem persists, please contact support.'

/**
 * Creates the order, then returns the Paystack URL to send the shopper to, or
 * `paidRef` when the wallet covered it all (or an earlier attempt had paid).
 * Spending the wallet needs the account's token, so that call goes through
 * authFetch; the API checks the token belongs to the order's customer.
 */
export async function startPaystackCheckout(args: PlaceArgs, useWallet = false): Promise<{ url?: string; paidRef?: string; error?: string }> {
  const orderRes = await createOrder(payload(args, 'paystack'))
  if (!orderRes.ok || !orderRes.data?.order_id) return { error: orderRes.error || `Failed to create order. ${SUPPORT}` }
  const callbackUrl = `${window.location.origin}/order/verify`
  const payRes = useWallet
    ? await authFetch<any>('/v2/pay/init', {
        method: 'POST', redirectOnAuth: false,
        body: { order_id: orderRes.data.order_id, callback_url: callbackUrl, use_wallet: true },
      })
    : await initPaystackPayment(orderRes.data.order_id, callbackUrl)
  if (payRes.ok && (payRes.data?.fully_paid_by_wallet || payRes.data?.already_paid)) {
    return { paidRef: payRes.data.order_ref || orderRes.data.order_ref }
  }
  if (!payRes.ok || !payRes.data?.authorization_url) return { error: payRes.error || `Failed to initialize payment. ${SUPPORT}` }
  return { url: payRes.data.authorization_url }
}

/** Creates a pending WhatsApp order and returns the wa.me link and its reference. */
export async function startWhatsAppOrder(args: PlaceArgs): Promise<{ url?: string; ref?: string; error?: string }> {
  const res = await createWhatsAppOrder(payload(args, 'whatsapp'))
  if (res.ok && res.data?.whatsapp_url) return { url: res.data.whatsapp_url, ref: res.data.order_ref }
  return { error: res.error || `Failed to create order. ${SUPPORT}` }
}
