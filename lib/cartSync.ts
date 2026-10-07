'use client'

// ============================================================
// BUYSUB — Cart follows the account
// ============================================================
// The browser cart (lib/cart.ts) is what renders. While signed in, <CartSync/>
// (mounted once in AppShell) keeps it in step with /v2/me/cart (migration 17):
//   * sign in with a cart built while signed out → merged with the account's
//     cart (same product and period: the larger quantity) and saved;
//   * sign in when this browser's cart already belongs to the account →
//     replaced by the account's cart, which is the latest from any device;
//   * a different account, or signed out, while the cart belongs to an
//     account → emptied, so a shared browser doesn't leak or mix carts;
//   * each change in this tab is saved shortly after (debounced);
//   * coming back to the tab picks up changes made on another device.
// Only { product_id, period, qty } is stored; lines are re-priced from the
// live product list. If the API is unavailable (before migration 17) the cart
// stays browser-only.

import { useEffect } from 'react'
import { authFetch } from './apiAuth'
import { useSession } from './useSession'
import { fetchProducts } from './useProducts'
import { CART_EVENT, MAX_LINE_QTY, readCart, writeCart, type Cart } from './cart'
import { PERIODS, cartKey } from './constants'
import { priceFor } from './pricing'

const OWNER_KEY = 'bs_cart_owner_v1'
const SAVE_DELAY_MS = 500

type Line = { product_id: string; period: string; qty: number }
type Remote = { items: Line[]; updated_at: string | null }

let syncedUser: string | null = null
let applying = false
let lastServerAt: string | null = null
let timer: ReturnType<typeof setTimeout> | null = null

function getOwner(): string | null {
  try { return localStorage.getItem(OWNER_KEY) } catch { return null }
}
function setOwner(id: string | null) {
  try { id ? localStorage.setItem(OWNER_KEY, id) : localStorage.removeItem(OWNER_KEY) } catch { /* blocked */ }
}

/** Writes without echoing the change back to the account. */
function apply(cart: Cart) {
  applying = true
  try { writeCart(cart) } finally { applying = false }
}

const toLines = (cart: Cart): Line[] =>
  Object.values(cart).map(i => ({ product_id: i.product.id, period: i.itemPeriod, qty: i.qty }))

async function fromLines(lines: Line[]): Promise<Cart> {
  if (!lines.length) return {}
  const byId = new Map((await fetchProducts()).map(p => [p.id, p]))
  const cart: Cart = {}
  for (const l of lines) {
    const p = byId.get(l.product_id)
    if (!p || !PERIODS[l.period] || priceFor(p, l.period) === null) continue
    cart[cartKey(p.id, l.period)] = { product: p, itemPeriod: l.period, qty: Math.min(MAX_LINE_QTY, l.qty) }
  }
  return cart
}

/** Account lines first, then lines only this browser had; shared lines keep the larger quantity. */
function merge(account: Cart, local: Cart): Cart {
  const out: Cart = { ...account }
  for (const [k, item] of Object.entries(local)) {
    out[k] = out[k] ? { ...out[k], qty: Math.max(out[k].qty, item.qty) } : item
  }
  return out
}

async function save() {
  timer = null
  const user = syncedUser
  if (!user) return
  const r = await authFetch<Remote>('/v2/me/cart', { method: 'PUT', body: { items: toLines(readCart()) }, redirectOnAuth: false })
  if (r.ok && syncedUser === user) lastServerAt = r.data?.updated_at ?? lastServerAt
}

function flush() {
  if (!timer) return
  clearTimeout(timer)
  save()
}

function onLocalChange() {
  if (applying || !syncedUser) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(save, SAVE_DELAY_MS)
}

async function syncWithAccount(userId: string) {
  const owner = getOwner()
  if (owner && owner !== userId) apply({})
  const local = owner === userId ? {} : readCart()
  const r = await authFetch<Remote>('/v2/me/cart', { redirectOnAuth: false })
  if (!r.ok || !r.data) return // API unavailable: stay browser-only
  const account = await fromLines(r.data.items || [])
  const hasLocal = Object.keys(local).length > 0
  setOwner(userId)
  syncedUser = userId
  lastServerAt = r.data.updated_at
  apply(hasLocal ? merge(account, local) : account)
  if (hasLocal) await save()
}

/** Picks up a cart changed on another device, unless this tab has a save pending. */
async function refresh() {
  const user = syncedUser
  if (!user || timer) return
  const r = await authFetch<Remote>('/v2/me/cart', { redirectOnAuth: false })
  if (!r.ok || !r.data || syncedUser !== user || timer) return
  if (r.data.updated_at === lastServerAt) return
  lastServerAt = r.data.updated_at
  apply(await fromLines(r.data.items || []))
}

/** Keeps the cart in step with the signed-in account. Render once, in AppShell. */
export function CartSync() {
  const session = useSession()
  const userId = session.status === 'signed_in' ? session.user?.id ?? null : null

  useEffect(() => {
    const onVisibility = () => { document.visibilityState === 'hidden' ? flush() : refresh() }
    window.addEventListener(CART_EVENT, onLocalChange)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener(CART_EVENT, onLocalChange)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  useEffect(() => {
    if (session.status === 'loading') return
    if (!userId) {
      syncedUser = null
      if (timer) { clearTimeout(timer); timer = null }
      if (getOwner()) { setOwner(null); apply({}) }
      return
    }
    if (syncedUser !== userId) syncWithAccount(userId)
  }, [session.status, userId])

  return null
}
