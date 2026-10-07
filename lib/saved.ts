'use client'

// ============================================================
// BUYSUB — Saved products and recently viewed
// ============================================================
// Two small lists of product ids in localStorage, shared across tabs through
// the storage event. Server render and hydration see an empty list (the
// stable EMPTY), and the stored one arrives right after, so nothing here can
// cause a hydration mismatch.
//
// Saved items follow the account (API /v2/me/saved, migration 16). The local
// list is what renders; <SavedSync/> (mounted in AppShell) keeps it in step:
//   * signed in, list saved while signed out → merged into the account;
//   * signed in, list already belongs to this account → replaced from the
//     account (picks up changes made on other devices);
//   * a different account, or signed out, while the list belongs to an
//     account → cleared, so a shared browser doesn't leak or mix lists.
// While signed in, each toggle also writes to the account. If the API is
// unavailable (before migration 16) the list stays browser-only.
// Recently viewed stays in this browser.

import { useEffect, useSyncExternalStore } from 'react'
import { authFetch } from './apiAuth'
import { useSession } from './useSession'

const SAVED_KEY = 'bs_saved_v1'
/** Account id the saved list belongs to; absent while it's a signed-out list. */
const OWNER_KEY = 'bs_saved_owner_v1'
const RECENT_KEY = 'bs_recent_v1'
const RECENT_MAX = 12
const EMPTY: string[] = []

type Store = { key: string; value: string[]; loaded: boolean; listeners: Set<() => void> }
const stores: Record<string, Store> = {
  [SAVED_KEY]: { key: SAVED_KEY, value: EMPTY, loaded: false, listeners: new Set() },
  [RECENT_KEY]: { key: RECENT_KEY, value: EMPTY, loaded: false, listeners: new Set() },
}

function read(st: Store): string[] {
  if (!st.loaded && typeof window !== 'undefined') {
    st.loaded = true
    try {
      const v = JSON.parse(localStorage.getItem(st.key) || '[]')
      st.value = Array.isArray(v) ? v.filter((x: unknown) => typeof x === 'string') : EMPTY
    } catch { st.value = EMPTY }
  }
  return st.value
}

function write(st: Store, next: string[]) {
  st.value = next
  try { localStorage.setItem(st.key, JSON.stringify(next)) } catch { /* storage full or blocked */ }
  st.listeners.forEach(l => l())
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    const st = e.key ? stores[e.key] : undefined
    if (!st) return
    st.loaded = false
    read(st)
    st.listeners.forEach(l => l())
  })
}

function useList(key: string): string[] {
  const st = stores[key]
  return useSyncExternalStore(
    cb => { st.listeners.add(cb); return () => { st.listeners.delete(cb) } },
    () => read(st),
    () => EMPTY,
  )
}

export const useSavedIds = () => useList(SAVED_KEY)
export const useRecentIds = () => useList(RECENT_KEY)

export function isSaved(id: string) { return read(stores[SAVED_KEY]).includes(id) }

/** Account the list is synced with in this tab; null while signed out or not synced. */
let syncedUser: string | null = null

function getOwner(): string | null {
  try { return localStorage.getItem(OWNER_KEY) } catch { return null }
}
function setOwner(id: string | null) {
  try { id ? localStorage.setItem(OWNER_KEY, id) : localStorage.removeItem(OWNER_KEY) } catch { /* blocked */ }
}

/** Returns the new state: true when now saved. */
export function toggleSaved(id: string): boolean {
  const st = stores[SAVED_KEY]
  const cur = read(st)
  const on = !cur.includes(id)
  write(st, on ? [id, ...cur] : cur.filter(x => x !== id))
  if (syncedUser) {
    const user = syncedUser
    authFetch(`/v2/me/saved/${encodeURIComponent(id)}`, { method: on ? 'PUT' : 'DELETE', redirectOnAuth: false })
      .then(r => {
        // Undo the local change if the account didn't take it (unless the
        // shopper has toggled it again or signed out meanwhile).
        if (r.ok || syncedUser !== user || read(st).includes(id) !== on) return
        const now = read(st)
        write(st, on ? now.filter(x => x !== id) : [id, ...now])
      })
  }
  return on
}

async function syncWithAccount(userId: string) {
  const st = stores[SAVED_KEY]
  const owner = getOwner()
  if (owner && owner !== userId) write(st, [])
  const local = owner === userId ? [] : read(st)
  const r = local.length
    ? await authFetch<string[]>('/v2/me/saved/merge', { method: 'POST', body: { product_ids: local }, redirectOnAuth: false })
    : await authFetch<string[]>('/v2/me/saved', { redirectOnAuth: false })
  if (!r.ok || !Array.isArray(r.data)) return // API unavailable: stay browser-only
  setOwner(userId)
  syncedUser = userId
  write(st, r.data)
}

/** Keeps the saved list in step with the signed-in account. Render once, in AppShell. */
export function SavedSync() {
  const session = useSession()
  const userId = session.status === 'signed_in' ? session.user?.id ?? null : null
  useEffect(() => {
    if (session.status === 'loading') return
    if (!userId) {
      syncedUser = null
      if (getOwner()) { setOwner(null); write(stores[SAVED_KEY], []) }
      return
    }
    if (syncedUser !== userId) syncWithAccount(userId)
  }, [session.status, userId])
  return null
}

export function recordView(id: string) {
  const st = stores[RECENT_KEY]
  const cur = read(st)
  if (cur[0] === id) return
  write(st, [id, ...cur.filter(x => x !== id)].slice(0, RECENT_MAX))
}

export function clearRecent() { write(stores[RECENT_KEY], []) }
