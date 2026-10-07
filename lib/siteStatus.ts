'use client'

// ============================================================
// BUYSUB — Service switches and maintenance mode (GET /v2/status)
// ============================================================
// Set by admins in Settings (buysub-api-deploy/src/features/status.ts). The
// API enforces every switch itself; reading them here only hides what would
// fail. Until the first response (or if it fails) everything counts as on,
// so a slow or older API never hides checkout.

import { useSyncExternalStore } from 'react'
import { API_BASE } from './config'

export type SiteStatus = {
  maintenance: { enabled: boolean; message: string }
  services: {
    paystack: boolean
    whatsapp: boolean
    wallet_pay: boolean
    wallet_funding: boolean
    partner_applications: boolean
    reviews: boolean
    referrals: boolean
    payouts: boolean
  }
  wallet_funding: { min_ngn: number; max_ngn: number }
  /** False until /v2/status has answered. */
  loaded: boolean
}

const DEFAULT: SiteStatus = {
  maintenance: { enabled: false, message: '' },
  services: {
    paystack: true, whatsapp: true, wallet_pay: true, wallet_funding: false,
    partner_applications: true, reviews: false, referrals: false, payouts: false,
  },
  wallet_funding: { min_ngn: 1000, max_ngn: 500000 },
  loaded: false,
}

let state = DEFAULT
let fetchedAt = 0
let inflight: Promise<void> | null = null
const listeners = new Set<() => void>()
const TTL = 60_000

function refresh(): void {
  if (typeof window === 'undefined' || inflight || Date.now() - fetchedAt < TTL) return
  inflight = fetch(`${API_BASE}/v2/status`)
    .then(r => r.json())
    .then(j => {
      if (j?.ok && j.data) {
        const d = j.data
        state = {
          maintenance: { ...DEFAULT.maintenance, ...d.maintenance },
          services: { ...DEFAULT.services, ...d.services },
          wallet_funding: { ...DEFAULT.wallet_funding, ...d.wallet_funding },
          loaded: true,
        }
      } else {
        state = { ...state, loaded: true }
      }
    })
    .catch(() => { state = { ...state, loaded: true } })
    .finally(() => {
      fetchedAt = Date.now()
      inflight = null
      listeners.forEach(l => l())
    })
}

export function useSiteStatus(): SiteStatus {
  return useSyncExternalStore(
    cb => { listeners.add(cb); refresh(); return () => { listeners.delete(cb) } },
    () => state,
    () => DEFAULT,
  )
}
