'use client'

// A paged admin list whose filters live in the URL, so a filtered view can be
// bookmarked, shared and survives a reload. `q`, `page` and any keys listed in
// `params` are read from the query string and sent to the API unchanged.
// Pages using this must render inside <Suspense> (the console layout does).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { authFetch } from '@/lib/apiAuth'

export type ListPagination = { page: number; limit: number; total: number; pages: number }

export function useAdminList<R = any>(endpoint: string, { params = [], limit = 20, enabled = true }: {
  params?: string[]
  limit?: number
  enabled?: boolean
} = {}) {
  const search = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const keys = useMemo(() => ['q', 'page', ...params], [params.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  const values = useMemo(() => {
    const v: Record<string, string> = {}
    for (const k of keys) { const x = search.get(k); if (x) v[k] = x }
    return v
  }, [search, keys])
  const queryKey = JSON.stringify(values)

  const [rows, setRows] = useState<R[]>([])
  const [pagination, setPagination] = useState<ListPagination>({ page: 1, limit, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const seq = useRef(0)

  const load = useCallback(async () => {
    if (!enabled) return
    const id = ++seq.current
    setLoading(true)
    setError('')
    const qs = new URLSearchParams({ limit: String(limit), ...values })
    if (!qs.get('page')) qs.set('page', '1')
    const r = await authFetch<R[]>(`${endpoint}?${qs}`)
    if (id !== seq.current) return
    if (r.ok) {
      const list = Array.isArray(r.data) ? r.data : []
      setRows(list)
      const p = r.meta?.pagination
      setPagination(p ? { page: Number(p.page) || 1, limit: Number(p.limit) || limit, total: Number(p.total) || 0, pages: Number(p.pages) || 0 }
        : { page: 1, limit, total: list.length, pages: 1 })
    } else {
      setError(r.error || 'Could not load this list.')
    }
    setLoading(false)
    // values is captured through queryKey.
  }, [endpoint, limit, queryKey, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  /** Merges into the query string. Any change other than `page` resets to page 1. */
  const setParams = useCallback((patch: Record<string, string | null | undefined>) => {
    const next = new URLSearchParams(search.toString())
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k) }
    if (!('page' in patch)) next.delete('page')
    if (next.get('page') === '1') next.delete('page')
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [search, router, pathname])

  /** Updates one row in place after an action, without a refetch. */
  const patchRow = useCallback((match: (r: R) => boolean, patch: Partial<R>) => {
    setRows(rs => rs.map(r => match(r) ? { ...r, ...patch } : r))
  }, [])

  return { rows, pagination, loading, error, reload: load, params: values, setParams, patchRow, setRows }
}
