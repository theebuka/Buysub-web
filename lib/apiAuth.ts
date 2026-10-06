// ============================================================
// BUYSUB — Authenticated API fetch (one copy)
// ============================================================
// Replaces the per-surface apiFetch copies (dashboard, partners/dashboard,
// admin, ShopAds) as each is rebuilt. Same contract as those: Bearer token
// from getAccessToken() (which refreshes an expired one), `{ ok, data, error,
// meta }` envelope, and a trip to /login on 401/403 — unless the caller opts
// out with `redirectOnAuth: false`, as the site header does, because a
// signed-out visitor on a public page must not be bounced to /login.

import { API_BASE } from './config'
import { getAccessToken } from './session'

export interface ApiResult<T = any> {
  ok: boolean
  data?: T
  error?: string
  meta?: Record<string, any>
  status: number
}

export interface AuthFetchOptions extends Omit<RequestInit, 'body'> {
  body?: any
  /** Default true. False returns the 401/403 result instead of redirecting. */
  redirectOnAuth?: boolean
  /** Send without a token even if signed in. */
  anonymous?: boolean
}

export function loginUrl(next?: string): string {
  const here = next ?? (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '')
  return here && here !== '/login' ? `/login?next=${encodeURIComponent(here)}` : '/login'
}

export async function authFetch<T = any>(path: string, opts: AuthFetchOptions = {}): Promise<ApiResult<T>> {
  const { body, redirectOnAuth = true, anonymous = false, headers, ...rest } = opts
  const token = anonymous ? '' : await getAccessToken()
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    })
  } catch {
    return { ok: false, error: 'Network error. Check your connection and try again.', status: 0 }
  }

  if ((res.status === 401 || res.status === 403) && redirectOnAuth && typeof window !== 'undefined') {
    window.location.href = loginUrl()
    return { ok: false, error: 'Signed out', status: res.status }
  }

  let json: any = null
  try { json = await res.json() } catch { /* empty or non-JSON body */ }
  if (json && typeof json === 'object' && 'ok' in json) {
    return { ok: !!json.ok && res.ok, data: json.data, error: json.error, meta: json.meta, status: res.status }
  }
  return { ok: res.ok, data: json as T, error: res.ok ? undefined : `Request failed (${res.status})`, status: res.status }
}
