'use client'

// ============================================================
// BUYSUB — Saved products and recently viewed (this browser only)
// ============================================================
// Two small lists of product ids in localStorage, shared across tabs through
// the storage event. Server render and hydration see an empty list (the
// stable EMPTY), and the stored one arrives right after, so nothing here can
// cause a hydration mismatch.

import { useSyncExternalStore } from 'react'

const SAVED_KEY = 'bs_saved_v1'
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

/** Returns the new state: true when now saved. */
export function toggleSaved(id: string): boolean {
  const st = stores[SAVED_KEY]
  const cur = read(st)
  const on = !cur.includes(id)
  write(st, on ? [id, ...cur] : cur.filter(x => x !== id))
  return on
}

export function recordView(id: string) {
  const st = stores[RECENT_KEY]
  const cur = read(st)
  if (cur[0] === id) return
  write(st, [id, ...cur.filter(x => x !== id)].slice(0, RECENT_MAX))
}

export function clearRecent() { write(stores[RECENT_KEY], []) }
