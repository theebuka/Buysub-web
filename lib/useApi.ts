'use client'

// ============================================================
// BUYSUB — Authenticated GET with a per-path cache
// ============================================================
// Account and partner pages read through this. A path fetched once is shown
// immediately on the next visit (sidebar navigation feels instant) and then
// refreshed in the background. Mutations call `invalidate(prefix)`.

import { useCallback, useEffect, useState } from 'react'
import { authFetch, type ApiResult } from './apiAuth'

type Entry = { result: ApiResult<any>; at: number }
const cache = new Map<string, Entry>()
const listeners = new Set<(prefix: string) => string | null>()

/**
 * Refetches every mounted query under `prefix`. Cached data stays on screen
 * while it refreshes (no flash back to a skeleton); paths not mounted are
 * dropped so their next visit fetches fresh.
 */
export function invalidate(prefix: string) {
  const mounted = new Set<string>()
  listeners.forEach(l => { const p = l(prefix); if (p) mounted.add(p) })
  for (const k of Array.from(cache.keys())) if (k.startsWith(prefix) && !mounted.has(k)) cache.delete(k)
}

export function useApi<T = any>(path: string | null) {
  const cached = path ? cache.get(path) : undefined
  const [result, setResult] = useState<ApiResult<T> | undefined>(cached?.result)
  const [loading, setLoading] = useState(!cached && !!path)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!path) return
    let live = true
    const hit = cache.get(path)
    setResult(hit?.result)
    setLoading(!hit)
    authFetch<T>(path).then(r => {
      if (!live) return
      if (r.ok || !hit) cache.set(path, { result: r, at: Date.now() })
      setResult(r.ok || !hit ? r : hit.result)
      setLoading(false)
    })
    return () => { live = false }
  }, [path, tick])

  useEffect(() => {
    const l = (prefix: string) => {
      if (!path?.startsWith(prefix)) return null
      setTick(t => t + 1)
      return path
    }
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [path])

  const reload = useCallback(() => setTick(t => t + 1), [])
  return {
    data: result?.ok ? (result.data as T) : undefined,
    meta: result?.meta,
    error: result && !result.ok ? (result.error || 'Something went wrong') : '',
    loading,
    reload,
  }
}
