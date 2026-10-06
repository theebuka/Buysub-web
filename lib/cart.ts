'use client'

// ============================================================
// BUYSUB — Cart store
// ============================================================
// Reads and writes the SAME localStorage key and shape Marketplace uses
// (CART_STORAGE_KEY → Record<cartKey, CartItem>), so the header badge and the
// shop agree with no migration. Same-tab writers call notifyCartChanged();
// other tabs are picked up from the `storage` event.
//
// The snapshot is cached by raw string, so useSyncExternalStore sees a stable
// reference until the stored value actually changes.

import { useSyncExternalStore } from 'react'
import { CART_STORAGE_KEY, PERIODS, type CartItem } from './constants'

export const CART_EVENT = 'bs:cart-changed'

export type Cart = Record<string, CartItem>

const EMPTY: Cart = {}
let lastRaw: string | null = null
let lastCart: Cart = EMPTY

function parse(raw: string | null): Cart {
  if (!raw) return EMPTY
  try {
    const parsed = JSON.parse(raw) as Cart
    // Same filter Marketplace applies on load: drop lines a build can't price.
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
