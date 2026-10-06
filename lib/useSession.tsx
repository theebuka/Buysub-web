'use client'

// ============================================================
// BUYSUB — Who is signed in (one shared store)
// ============================================================
// A module-level store read through useSyncExternalStore, so every consumer
// (site header, account menu, later the account and partner shells) shares
// one /v2/me call instead of each page making its own. Nothing loads until the
// first component subscribes, so pages that never ask pay nothing.
//
// The server render and the first client render both see `loading`; the real
// state arrives after mount. Never branch markup on anything else before then.

import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { authFetch, loginUrl } from './apiAuth'
import { getSupabase, signOut as supabaseSignOut } from './session'
import { isStaff } from './routes'

export interface SessionUser {
  id?: string
  email: string
  full_name: string
  phone: string
  role: string
  avatar_url: string | null
}

export interface SessionState {
  status: 'loading' | 'signed_out' | 'signed_in'
  user: SessionUser | null
  /** null until asked for with loadPartner(). */
  partner: { status: string; referral_code: string | null } | false | null
  /** null until asked for with loadWallet(). */
  walletNGN: number | null
}

const INITIAL: SessionState = { status: 'loading', user: null, partner: null, walletNGN: null }

let state: SessionState = INITIAL
let started = false
const listeners = new Set<() => void>()

function set(patch: Partial<SessionState>) {
  state = { ...state, ...patch }
  listeners.forEach(l => l())
}

// The user the store last loaded, so auth events for the same user are
// ignored. supabase-js emits SIGNED_IN whenever getSession() recovers a stored
// session, and load() calls getSession(), so reacting to every event loops.
let loadedUserId: string | null | undefined = undefined

let inflight: Promise<void> | null = null

/** One load at a time; events that arrive mid-load share it. */
function load(): Promise<void> {
  if (!inflight) inflight = doLoad().finally(() => { inflight = null })
  return inflight
}

async function doLoad() {
  let token = '', uid: string | null = null
  try {
    const { data } = await getSupabase().auth.getSession()
    token = data.session?.access_token || ''
    uid = data.session?.user?.id ?? null
  } catch { /* auth unavailable: treat as signed out */ }
  // Recorded before the /v2/me round trip, so the SIGNED_IN that getSession()
  // just emitted for this same user is recognised and ignored.
  loadedUserId = token ? uid : null
  if (!token) { set({ ...INITIAL, status: 'signed_out' }); return }
  const r = await authFetch<any>('/v2/me', { redirectOnAuth: false })
  if (!r.ok || !r.data) {
    // A token the API rejects is a signed-out visitor as far as chrome is
    // concerned. Leave the stored session alone: it may hold a refresh token.
    // An unreachable API lands here too; "Sign in" is the safe thing to show.
    set({ ...INITIAL, status: 'signed_out' })
    return
  }
  const d = r.data
  set({
    status: 'signed_in',
    user: {
      id: d.id,
      email: d.email || '',
      full_name: d.full_name || '',
      phone: d.phone || '',
      role: d.role || 'customer',
      avatar_url: d.avatar_url || null,
    },
    partner: null,
    walletNGN: null,
  })
}

function start() {
  if (started || typeof window === 'undefined') return
  started = true
  load()
  try {
    getSupabase().auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return
      const id = session?.user?.id ?? null
      if (event === 'USER_UPDATED' || id !== loadedUserId) load()
    })
  } catch { /* auth unavailable — the first load already settled the state */ }
}

function subscribe(l: () => void) {
  listeners.add(l)
  start()
  return () => { listeners.delete(l) }
}

const getSnapshot = () => state
const getServerSnapshot = () => INITIAL

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Re-reads /v2/me, e.g. after the profile is edited. */
export function reloadSession(): Promise<void> {
  return load()
}

/** Fetches partner status once. `false` means not a partner. */
export async function loadPartner(): Promise<void> {
  if (state.status !== 'signed_in' || state.partner !== null) return
  const r = await authFetch<any>('/v2/partners/me', { redirectOnAuth: false })
  const aff = r.ok ? r.data?.affiliate ?? null : null
  const prof = r.ok ? r.data?.profile ?? null : null
  set({
    partner: r.ok && (aff || prof)
      ? { status: String(prof?.status || aff?.status || ''), referral_code: aff?.referral_code || null }
      : false,
  })
}

/** Fetches the wallet balance. Re-fetches each call, so menus show a fresh value. */
export async function loadWallet(): Promise<void> {
  if (state.status !== 'signed_in') return
  const r = await authFetch<any>('/v2/me/wallet', { redirectOnAuth: false })
  const n = Number(r.data?.balance_ngn)
  if (r.ok && Number.isFinite(n)) set({ walletNGN: n })
}

export async function signOut(to = '/shop'): Promise<void> {
  await supabaseSignOut()
  set({ ...INITIAL, status: 'signed_out' })
  window.location.href = to
}

/**
 * Renders children only for a signed-in user whose role passes `allow`.
 * Signed out → /login?next=…; wrong role → `fallback`.
 */
export function RequireRole({
  allow = 'any',
  fallback = null,
  loading = null,
  children,
}: {
  allow?: 'any' | 'staff' | string[]
  fallback?: ReactNode
  loading?: ReactNode
  children: ReactNode
}) {
  const s = useSession()
  useEffect(() => {
    if (s.status === 'signed_out') window.location.href = loginUrl()
  }, [s.status])
  if (s.status !== 'signed_in' || !s.user) return <>{loading}</>
  const role = s.user.role
  const ok = allow === 'any' || (allow === 'staff' ? isStaff(role) : allow.includes(role))
  return <>{ok ? children : fallback}</>
}
