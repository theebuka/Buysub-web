// ============================================================
// BUYSUB — Feature flags
// ============================================================
// Build-time, from NEXT_PUBLIC_FF_* in the Pages project settings. Each one
// must be a literal process.env.NEXT_PUBLIC_* expression or Next won't inline
// it. Unset means off. "1" or "true" means on.
//
// Switches an admin should be able to flip without a deploy (checkout
// methods, maintenance, refer and earn, reviews, payouts) are not here: they
// come from GET /v2/status (lib/siteStatus.ts).

const on = (v: string | undefined) => v === '1' || v === 'true'

export const FLAGS = {
  /** Seller listings and sales in /partner. Placeholder screens until multi-seller exists. */
  seller: on(process.env.NEXT_PUBLIC_FF_SELLER),
  /** Monthly billing period. Needs `monthly` in the API's PERIOD_INFO first. */
  monthly: on(process.env.NEXT_PUBLIC_FF_MONTHLY),
} as const

export type Flag = keyof typeof FLAGS
