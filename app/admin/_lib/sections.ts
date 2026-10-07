// Admin console sections, in sidebar order. `slug` is the old tab name
// lower-cased, which is what /admin?tab= links resolve against. `count` names
// the /v2/admin/stats field shown as a needs-attention count beside the link.
import type { IconName } from '@/components/ui'

export type AdminSection = { slug: string; label: string; href: string; group: string; icon: IconName; count?: string }

const S = (group: string, slug: string, label: string, icon: IconName, count?: string): AdminSection =>
  ({ group, slug, label, icon, count, href: slug === 'overview' ? '/admin' : `/admin/${slug}` })

export const ADMIN_SECTIONS: AdminSection[] = [
  S('Commerce', 'overview', 'Overview', 'home'),
  S('Commerce', 'orders', 'Orders', 'receipt', 'orders_pending_manual'),
  S('Commerce', 'rejected', 'Rejected orders', 'alert', 'orders_rejected_pending'),
  S('Commerce', 'discounts', 'Discounts', 'tag'),
  S('Catalog', 'products', 'Products', 'store'),
  S('Customers', 'customers', 'Customers', 'users'),
  S('Customers', 'wallets', 'Wallets', 'wallet'),
  S('Growth', 'partners', 'Partner applications', 'user', 'partners_pending'),
  S('Growth', 'affiliates', 'Affiliates', 'trend'),
  S('Growth', 'links', 'Short links', 'link'),
  S('Growth', 'ads', 'Ads', 'layout'),
  S('Growth', 'notifications', 'Notifications', 'bell'),
  S('System', 'settings', 'Settings', 'settings'),
]

export const ADMIN_GROUPS = ['Commerce', 'Catalog', 'Customers', 'Growth', 'System']

export function sectionForTab(tab: string | null): AdminSection | undefined {
  const t = String(tab || '').toLowerCase()
  return ADMIN_SECTIONS.find(s => s.slug === t)
}

export function sectionForPath(pathname: string): AdminSection | undefined {
  if (pathname === '/admin') return ADMIN_SECTIONS[0]
  return ADMIN_SECTIONS.find(s => s.slug !== 'overview' && (pathname === s.href || pathname.startsWith(s.href + '/')))
}
