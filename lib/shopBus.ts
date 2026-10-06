// ============================================================
// BUYSUB — Site header → storefront messages
// ============================================================
// Until Phase 2 rebuilds the shop, Marketplace owns its cart drawer, search
// and category state. The site header talks to it with these window events
// when it is on /shop, and navigates there with the equivalent URL when it
// isn't (Marketplace reads ?q= / ?category= and #cart on load).

export const SHOP_EVENTS = {
  openCart: 'bs:shop-open-cart',
  search: 'bs:shop-search',       // detail: { q: string }
  category: 'bs:shop-category',   // detail: { category: string }
} as const

const onShop = () => typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/, '') === '/shop'

function send(name: string, detail: any, fallbackUrl: string) {
  if (onShop()) {
    window.dispatchEvent(new CustomEvent(name, { detail }))
    window.scrollTo({ top: 0 })
  } else {
    window.location.href = fallbackUrl
  }
}

export const shop = {
  openCart: () => send(SHOP_EVENTS.openCart, null, '/shop#cart'),
  search: (q: string) => send(SHOP_EVENTS.search, { q }, `/shop?q=${encodeURIComponent(q)}`),
  category: (category: string) => send(SHOP_EVENTS.category, { category }, `/shop?category=${encodeURIComponent(category)}`),
}
