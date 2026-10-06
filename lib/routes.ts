// ============================================================
// BUYSUB — Route map
// ============================================================
// Every in-app path the chrome links to, in one place. Routes that don't exist
// yet point at today's page; each phase repoints its own entries (e.g.
// account.home becomes /account in Phase 3) and every header, footer and menu
// link follows.

export const ROUTES = {
  home: '/shop',
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
    home: '/dashboard',
    orders: '/dashboard?tab=orders',
    wallet: '/dashboard?tab=wallet',
    messages: '/dashboard?tab=messages',
    settings: '/dashboard?tab=profile',
  },
  partner: {
    apply: '/partners',
    home: '/partners/dashboard',
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
