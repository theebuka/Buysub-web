'use client'

// ============================================================
// BUYSUB — Display currency (site-wide)
// ============================================================
// One choice for the whole site, set from the header. Prices are stored and
// charged in NGN; the display converts with FX (lib/constants.ts), and the
// order carries that rate as fx_rate, exactly as the old storefront did.
// A ?currency= link (old shop URLs carry one) wins on first load.

import { useSyncExternalStore } from 'react'
import { FX } from './constants'

const KEY = 'bs_currency'
export const CURRENCIES = Object.keys(FX)

let current = 'NGN'
let initialised = false
const listeners = new Set<() => void>()

function init() {
  if (initialised || typeof window === 'undefined') return
  initialised = true
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('currency')
    const stored = localStorage.getItem(KEY)
    const pick = [fromUrl, stored].find(c => c && FX[c])
    if (pick) current = pick
  } catch { /* storage unavailable */ }
}

export function setCurrency(c: string) {
  if (!FX[c]) return
  current = c
  try { localStorage.setItem(KEY, c) } catch { /* storage unavailable */ }
  listeners.forEach(l => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  // Reading storage here (after mount), never during render.
  if (!initialised) { init(); queueMicrotask(cb) }
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY && e.newValue && FX[e.newValue]) { current = e.newValue; cb() }
  }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage) }
}

/** Server and first client render are NGN; the stored choice applies after mount. */
export function useCurrency(): { currency: string; rate: number } {
  const currency = useSyncExternalStore(subscribe, () => current, () => 'NGN')
  return { currency, rate: FX[currency] ?? 1 }
}

export const CURRENCY_LABELS: Record<string, string> = {
  NGN: '₦ Naira', USD: '$ US dollar', GBP: '£ Pound', CAD: 'C$ Canadian dollar',
}
