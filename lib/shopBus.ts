// ============================================================
// BUYSUB — Site header → catalog messages
// ============================================================
// On a catalog page (/shop, /shop/c/*) the header's search and Browse menu
// update the catalog in place with these window events, keeping scroll,
// quick view and loaded state. Anywhere else they navigate to the catalog
// URL. The cart has its own store (setCartDrawer in lib/cart.ts).

export const SHOP_EVENTS = {
  openSearch: 'bs:open-search',   // opens the header's search palette
  search: 'bs:shop-search',       // detail: { q: string }
  category: 'bs:shop-category',   // detail: { category: string }
} as const

const onCatalog = () => {
  if (typeof window === 'undefined') return false
  const p = window.location.pathname.replace(/\/+$/, '')
  return p === '/shop' || p.startsWith('/shop/c/')
}

function send(name: string, detail: any, fallbackUrl: string) {
  if (onCatalog()) {
    window.dispatchEvent(new CustomEvent(name, { detail }))
    window.scrollTo({ top: 0 })
  } else {
    window.location.href = fallbackUrl
  }
}

export const shop = {
  openSearch: () => window.dispatchEvent(new Event(SHOP_EVENTS.openSearch)),
  search: (q: string) => send(SHOP_EVENTS.search, { q }, `/shop?q=${encodeURIComponent(q)}`),
  category: (category: string) => send(SHOP_EVENTS.category, { category }, `/shop/c/${encodeURIComponent(category)}`),
}
