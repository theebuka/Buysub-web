'use client'

// ============================================================
// BUYSUB — Support conversations (API: features/support.ts, migration 18)
// ============================================================
// Customers and partners open a thread with BuySub; staff reply from
// /admin/support. Plain text. While a conversation is open on screen it
// refreshes every 10 seconds; the thread list and the unread count every
// minute, only while the tab is visible.

import { useEffect } from 'react'
import { authFetch } from './apiAuth'
import { invalidate, useApi } from './useApi'

export type SupportAudience = 'customer' | 'partner'

export type SupportThread = {
  id: string
  audience: SupportAudience
  subject: string
  order_ref: string | null
  status: 'open' | 'closed'
  user_unread: number
  admin_unread: number
  last_sender: 'user' | 'admin' | null
  last_message_preview: string | null
  last_message_at: string
  created_at: string
  closed_at: string | null
  user?: { full_name: string | null; email: string | null } | null
}

export type SupportMessage = { id: string; sender: 'user' | 'admin'; body: string; created_at: string }

export const supportListPath = (audience?: SupportAudience) => `/v2/me/support${audience ? `?audience=${audience}` : ''}`

function useEvery(ms: number, enabled: boolean, reload: () => void) {
  useEffect(() => {
    if (!enabled) return
    const t = setInterval(() => { if (document.visibilityState === 'visible') reload() }, ms)
    return () => clearInterval(t)
  }, [ms, enabled, reload])
}

export function useSupportThreads(audience?: SupportAudience, enabled = true) {
  const q = useApi<SupportThread[]>(enabled ? supportListPath(audience) : null)
  useEvery(60_000, enabled, q.reload)
  return q
}

/** Unread staff replies across all of this user's threads (sidebar badge). */
export function useSupportUnread(enabled: boolean, audience?: SupportAudience): number {
  const { data } = useSupportThreads(audience, enabled)
  return (data || []).reduce((n, t) => n + (t.user_unread || 0), 0)
}

export function useSupportThread(id: string | null, admin = false) {
  const path = id ? `${admin ? '/v2/admin/support' : '/v2/me/support'}/${id}` : null
  const q = useApi<{ thread: SupportThread; messages: SupportMessage[] }>(path)
  useEvery(10_000, !!id, q.reload)
  return q
}

export async function openThread(input: { subject: string; body: string; audience: SupportAudience; order_ref?: string }) {
  const r = await authFetch<SupportThread>('/v2/me/support', { method: 'POST', body: input })
  if (r.ok) invalidate('/v2/me/support')
  return r
}

export async function sendReply(threadId: string, body: string, admin = false) {
  const base = admin ? '/v2/admin/support' : '/v2/me/support'
  const r = await authFetch<SupportMessage>(`${base}/${threadId}/messages`, { method: 'POST', body: { body } })
  if (r.ok) invalidate(base)
  return r
}

export async function setThreadStatus(threadId: string, status: 'open' | 'closed', admin = false) {
  const r = admin
    ? await authFetch(`/v2/admin/support/${threadId}`, { method: 'PATCH', body: { status } })
    : await authFetch(`/v2/me/support/${threadId}/close`, { method: 'POST' })
  if (r.ok) invalidate(admin ? '/v2/admin/support' : '/v2/me/support')
  return r
}
