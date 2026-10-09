'use client'

import { useApi } from '@/lib/useApi'
import { SITE_URL } from '@/lib/config'

export type PartnerProfile = {
  id: string; status: string; legal_name: string | null; store_name: string; reviewer_notes: string | null
  business_email: string | null; business_phone: string | null; alternate_phone: string | null
  owner_name: string; owner_email: string; owner_phone: string; owner_location: string | null
  contact_method: string | null; address: string | null; lga: string | null; state: string | null
  social_media: string | null; cac_number?: string | null; registration_year?: number | null
  payout_frequency: string | null; payout_method: string | null
  bank_name: string | null; account_name: string | null; account_number: string | null
  crypto_token: string | null; crypto_chain: string | null; wallet_address: string | null
  aml_accepted?: boolean | null
  created_at?: string; reviewed_at?: string | null
}
export type Affiliate = { id: string; referral_code: string; status: string; display_name?: string; commission_rate?: number | null }
export type DailyPoint = { date: string; clicks: number; conversions: number; earned_ngn: number }
export type PartnerStats = {
  affiliate_id: string | null; clicks: number; conversions: number
  earnings_ngn: number; pending_ngn: number; approved_ngn?: number
  commission_rate?: number | null; daily?: DailyPoint[]
  /** Present when partner tiers are on (buysub-api-deploy/src/features/payouts.ts). */
  tier?: Tier | null
}
export type Tier = {
  sales_ngn: number
  current: { name: string; min_sales_ngn: number; rate: number } | null
  next: { name: string; min_sales_ngn: number; rate: number; remaining_ngn: number } | null
  effective_rate: number
  tiers: { name: string; min_sales_ngn: number; rate: number }[]
}
export type Commission = {
  id: string; amount_ngn: number | string; status: string; created_at: string; paid_at?: string | null
  orders?: { order_ref: string; total_ngn: number | string; created_at: string } | null
}

/** The partner record. `profile` is null when the account never applied. */
export function usePartner() {
  const r = useApi<{ profile: PartnerProfile | null; affiliate: Affiliate | null }>('/v2/partners/me')
  // The API answers 404 for "no application"; that is a state, not an error.
  const none = !!r.error && /no partner profile/i.test(r.error)
  return { ...r, error: none ? '' : r.error, profile: r.data?.profile ?? null, affiliate: r.data?.affiliate ?? null }
}

export { SITE_URL }

/** Where to send payouts is on file (mirrors hasPayoutDetails in buysub-api-deploy/src/features/payouts.ts, minus the affiliate-row fallback). */
export function hasPayoutDetails(p: PartnerProfile) {
  return p.payout_method === 'Crypto' ? !!p.wallet_address : !!(p.bank_name && p.account_number) || !!p.wallet_address
}

/**
 * What a partner who applied through the short form still has to do before
 * they can be paid. Payouts are held (not lost) until both are done.
 */
export function setupSteps(p: PartnerProfile) {
  return [
    { key: 'payout', label: 'Add where we should send your payouts', done: hasPayoutDetails(p), href: '/partner/profile#payout' },
    { key: 'declaration', label: 'Confirm the anti-money-laundering declaration', done: !!p.aml_accepted, href: '/partner/profile#declaration' },
  ]
}

/** A shareable app URL carrying the partner's code. */
export function referralLink(code: string, path = '/') {
  const sep = path.includes('?') ? '&' : '?'
  return `${SITE_URL}${path === '/' ? '/' : path}${sep}ref=${encodeURIComponent(code)}`
}
