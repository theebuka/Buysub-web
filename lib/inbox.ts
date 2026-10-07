'use client'

// ============================================================
// BUYSUB — Per-user notifications (GET /v2/me/notifications)
// ============================================================
// Order updates, renewals, wallet credits, referral rewards, stock alerts and
// partner payouts, written by the API (buysub-api-deploy/src/features/core.ts
// notifyUser). The header bell and /account/notifications both read the same
// cached path, so marking read in one updates the other.

import { useEffect } from 'react'
import { authFetch } from './apiAuth'
import { invalidate, useApi } from './useApi'

export type InboxItem = {
  id: string
  kind: 'order' | 'renewal' | 'wallet' | 'referral' | 'stock' | 'payout' | string
  title: string
  body: string | null
  href: string | null
  read_at: string | null
  created_at: string
}

export const INBOX_PATH = '/v2/me/notifications?limit=30'

/** Pass null to skip loading (signed out). Refreshes every minute while the tab is visible. */
export function useInbox(enabled: boolean) {
  const q = useApi<{ items: InboxItem[]; unread: number; has_more: boolean }>(enabled ? INBOX_PATH : null)
  const { reload } = q
  useEffect(() => {
    if (!enabled) return
    const t = setInterval(() => { if (document.visibilityState === 'visible') reload() }, 60_000)
    return () => clearInterval(t)
  }, [enabled, reload])
  return q
}

export async function markInboxRead(ids?: string[]) {
  await authFetch('/v2/me/notifications/read', { method: 'POST', body: ids?.length ? { ids } : {}, redirectOnAuth: false })
  invalidate('/v2/me/notifications')
}

export const KIND_ICON: Record<string, 'receipt' | 'clock' | 'wallet' | 'gift' | 'store' | 'card' | 'bell' | 'message'> = {
  order: 'receipt', renewal: 'clock', wallet: 'wallet', referral: 'gift', stock: 'store', payout: 'card', support_reply: 'message',
}
