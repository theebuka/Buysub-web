'use client'

// ============================================================
// BUYSUB — Cart store
// ============================================================
// Reads and writes the SAME localStorage key and shape the old Marketplace used
// (CART_STORAGE_KEY → Record<cartKey, CartItem>), so the header badge and the
// shop agree with no migration. Same-tab writers call notifyCartChanged();
// other tabs are picked up from the `storage` event.
//
// Signed in, the cart also follows the account: lib/cartSync.ts listens for
// CART_EVENT and saves it. Write through writeCart (or the mutations below),
// never localStorage directly, or the change won't reach the account.
//
// The snapshot is cached by raw string, so useSyncExternalStore sees a stable
// reference until the stored value actually changes.

import { useSyncExternalStore } from 'react'
import { CART_STORAGE_KEY, PERIODS, cartKey, type CartItem } from './constants'
import { priceFor } from './pricing'

export const CART_EVENT = 'bs:cart-changed'

export type Cart = Record<string, CartItem>

const EMPTY: Cart = {}
let lastRaw: string | null = null
let lastCart: Cart = EMPTY

function parse(raw: string | null): Cart {
  if (!raw) return EMPTY
  try {
    const parsed = JSON.parse(raw) as Cart
    // Drop lines a build can't price (unknown period, bad quantity).
    return Object.fromEntries(Object.entries(parsed || {}).filter(([, i]) =>
      i?.product?.id && PERIODS[i.itemPeriod] && Number.isInteger(i.qty) && i.qty > 0))
  } catch {
    return EMPTY
  }
}

function read(): Cart {
  let raw: string | null = null
  try { raw = localStorage.getItem(CART_STORAGE_KEY) } catch { /* private mode */ }
  if (raw !== lastRaw) { lastRaw = raw; lastCart = parse(raw) }
  return lastCart
}

/** The current cart, outside React (cart sync). */
export const readCart = read

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === null || e.key === CART_STORAGE_KEY) cb() }
  window.addEventListener('storage', onStorage)
  window.addEventListener(CART_EVENT, cb)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(CART_EVENT, cb)
  }
}

/** Call after writing CART_STORAGE_KEY in this tab. */
export function notifyCartChanged() {
  try { window.dispatchEvent(new Event(CART_EVENT)) } catch { /* SSR */ }
}

export function writeCart(cart: Cart) {
  try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)) } catch { /* storage full */ }
  notifyCartChanged()
}

export function useCart(): Cart {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}

export function cartCount(cart: Cart): number {
  return Object.values(cart).reduce((n, i) => n + (i.qty || 0), 0)
}

// ── Mutations ─────────────────────────────────────────────────
// Each reads the latest stored cart, so two components editing in the same
// tick never overwrite each other with a stale copy.


export const MAX_LINE_QTY = 20 // the API's per-line limit is higher; this is a sanity cap

export function addToCart(product: CartItem['product'], period: string, qty = 1): boolean {
  if (priceFor(product, period) === null) return false
  const cart = read()
  const key = cartKey(product.id, period)
  const next = Math.min(MAX_LINE_QTY, (cart[key]?.qty ?? 0) + qty)
  writeCart({ ...cart, [key]: { product, qty: next, itemPeriod: period } })
  return true
}

export function setLineQty(key: string, qty: number) {
  const cart = read()
  if (!cart[key]) return
  if (qty < 1) return removeLine(key)
  writeCart({ ...cart, [key]: { ...cart[key], qty: Math.min(MAX_LINE_QTY, qty) } })
}

export function removeLine(key: string) {
  const { [key]: _gone, ...rest } = read()
  writeCart(rest)
}

export function clearCart() {
  writeCart({})
}

/**
 * Re-prices the cart against a fresh product list. Lines whose product is gone
 * or no longer sold for that period are dropped (checkout would reject them);
 * the rest take the fresh product, so displayed prices match what's charged.
 * Returns a message for the shopper, or '' when nothing changed.
 */
export function reconcileCart(fresh: CartItem['product'][]): string {
  const cart = read()
  if (!Object.keys(cart).length || !fresh.length) return ''
  const byId = new Map(fresh.map(p => [p.id, p]))
  const next: Cart = {}
  const removed: string[] = []
  const updated: string[] = []
  let changed = false
  for (const [key, item] of Object.entries(cart)) {
    const p = byId.get(item.product.id)
    if (!p || priceFor(p, item.itemPeriod) === null) { removed.push(item.product.name); changed = true; continue }
    if (priceFor(p, item.itemPeriod) !== priceFor(item.product, item.itemPeriod)) updated.push(item.product.name)
    if (p !== item.product) changed = true
    next[key] = { ...item, product: p }
  }
  if (changed) writeCart(next)
  const msgs: string[] = []
  if (removed.length) msgs.push(`${removed.join(', ')} ${removed.length === 1 ? 'is' : 'are'} no longer available and ${removed.length === 1 ? 'was' : 'were'} removed from your cart.`)
  if (updated.length) msgs.push(`Prices updated for: ${updated.join(', ')}.`)
  return msgs.join(' ')
}

/** Cart lines in a stable order (insertion order of the stored object). */
export function cartLines(cart: Cart): { key: string; item: CartItem }[] {
  return Object.entries(cart).map(([key, item]) => ({ key, item }))
}

// ── Drawer open state ─────────────────────────────────────────
// The cart drawer is mounted once (in SiteHeader); anything can open it.

let drawerOpen = false
const drawerListeners = new Set<() => void>()
export function setCartDrawer(open: boolean) {
  drawerOpen = open
  drawerListeners.forEach(l => l())
}
export function useCartDrawer(): boolean {
  return useSyncExternalStore(
    cb => { drawerListeners.add(cb); return () => { drawerListeners.delete(cb) } },
    () => drawerOpen,
    () => false,
  )
}
