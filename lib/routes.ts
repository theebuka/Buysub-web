// ============================================================
// BUYSUB — Route map
// ============================================================
// Every in-app path the chrome links to, in one place. Routes that don't exist
// yet point at today's page; each phase repoints its own entries (e.g.
// account.home becomes /account in Phase 3) and every header, footer and menu
// link follows.

export const ROUTES = {
  home: '/',
  shop: '/shop',
  shopCategory: (c: string) => `/shop/c/${encodeURIComponent(c)}`,
  shopSearch: (q: string) => `/shop?q=${encodeURIComponent(q)}`,
  cart: '/cart',
  checkout: '/checkout',
  help: '/help',

  login: '/login',
  loginAs: (as: 'partner' | 'admin') => `/login?as=${as}`,
  signup: '/login?mode=signup',

  account: {
    home: '/account',
    orders: '/account/orders',
    order: (ref: string) => `/account/orders/${encodeURIComponent(ref)}`,
    subscriptions: '/account/subscriptions',
    wallet: '/account/wallet',
    messages: '/account/messages',
    notifications: '/account/notifications',
    referrals: '/account/referrals',
    settings: '/account/settings',
  },
  saved: '/saved',
  partner: {
    apply: '/partners',
    home: '/partner',
    links: '/partner/links',
    conversions: '/partner/conversions',
    payouts: '/partner/payouts',
    profile: '/partner/profile',
  },
  admin: {
    home: '/admin',
  },
} as const

/** Pages on the Framer site (buysub.ng). In-app replacements come later. */
export const EXTERNAL = {
  site: 'https://buysub.ng',
  privacy: 'https://buysub.ng/privacy-policy',
  contact: 'https://buysub.ng/contact',
  faq: 'https://buysub.ng/#faq',
} as const

export const STAFF_ROLES = ['admin', 'super_admin', 'support_agent'] as const
export const isStaff = (role: string | null | undefined) =>
  (STAFF_ROLES as readonly string[]).includes(String(role || ''))
