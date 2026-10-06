// ============================================================
// BUYSUB — Feature flags
// ============================================================
// Build-time, from NEXT_PUBLIC_FF_* in the Pages project settings. Each one
// must be a literal process.env.NEXT_PUBLIC_* expression or Next won't inline
// it. Unset means off. "1" or "true" means on.

const on = (v: string | undefined) => v === '1' || v === 'true'

export const FLAGS = {
  /** Customer refer-and-earn page in /account. Needs store-credit payouts in the API. */
  referrals: on(process.env.NEXT_PUBLIC_FF_REFERRALS),
  /** Seller listings and sales in /partner. Placeholder screens until multi-seller exists. */
  seller: on(process.env.NEXT_PUBLIC_FF_SELLER),
  /** Monthly billing period. Needs `monthly` in the API's PERIOD_INFO first. */
  monthly: on(process.env.NEXT_PUBLIC_FF_MONTHLY),
} as const

export type Flag = keyof typeof FLAGS
