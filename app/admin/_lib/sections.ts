// Admin console sections, in sidebar order. `slug` is the old tab name
// lower-cased, which is what /admin?tab= links resolve against.
export type AdminSection = { slug: string; label: string; href: string; group: string }

const S = (group: string, slug: string, label: string): AdminSection =>
  ({ group, slug, label, href: slug === 'overview' ? '/admin' : `/admin/${slug}` })

export const ADMIN_SECTIONS: AdminSection[] = [
  S('Commerce', 'overview', 'Overview'),
  S('Commerce', 'orders', 'Orders'),
  S('Commerce', 'rejected', 'Rejected'),
  S('Commerce', 'discounts', 'Discounts'),
  S('Catalog', 'products', 'Products'),
  S('Customers', 'customers', 'Customers'),
  S('Customers', 'wallets', 'Wallets'),
  S('Growth', 'partners', 'Partners'),
  S('Growth', 'affiliates', 'Affiliates'),
  S('Growth', 'links', 'Links'),
  S('Growth', 'ads', 'Ads'),
  S('Growth', 'notifications', 'Notifications'),
  S('System', 'settings', 'Settings'),
]

export function sectionForTab(tab: string | null): AdminSection | undefined {
  const t = String(tab || '').toLowerCase()
  return ADMIN_SECTIONS.find(s => s.slug === t)
}
