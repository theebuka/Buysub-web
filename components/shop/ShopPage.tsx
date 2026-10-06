'use client'

// ============================================================
// BUYSUB — Catalog (/shop and /shop/c/[category])
// ============================================================
// Replaces the catalog half of components/Marketplace.tsx.
//
// Filter state lives in React and is mirrored to the URL with replaceState,
// so filtered views are shareable and survive reload. It is not derived from
// useSearchParams: opening a quick view pushState()s /shop/[slug], and the
// grid behind it must not reset while that URL is showing.
//
// Old shop links keep working: ?category=, ?q=, ?sort=alpha|asc|desc, ?min=,
// ?max=, ?tag=, ?ref= (useReferral) and ?currency= (lib/currency.ts). ?period=
// is ignored: cards now show each product's lowest available price.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Drawer, DrawerBody, EmptyState, Icon, IconButton, Input, Select } from '@/components/ui'
import { useShopAds, ShopBanner, ShopSidebar, SponsoredProductCard, ReferralBanner, interleaveAds } from '@/components/ShopAds'
import { useProducts } from '@/lib/useProducts'
import { useReferral } from '@/lib/useReferral'
import { useCurrency } from '@/lib/currency'
import { getCategoryList, isInStock, norm, TAB_ORDER, type Product } from '@/lib/constants'
import { fromPrice } from '@/lib/pricing'
import { categoryLabel } from '@/lib/format'
import { SHOP_EVENTS } from '@/lib/shopBus'
import { ProductCard, ProductCardSkeleton } from './ProductCard'
import { QuickView, useQuickView } from './QuickView'
import { Notice, useCartReconcile } from './CartContents'
import s from './shop.module.css'

type Sort = 'featured' | 'alpha' | 'price_asc' | 'price_desc'
type Filters = { category: string; q: string; sort: Sort; min: string; max: string; stock: boolean; tag: string }

const DEFAULTS: Filters = { category: 'all', q: '', sort: 'featured', min: '', max: '', stock: false, tag: '' }
const PAGE = 24
const SORTS: { value: Sort; label: string }[] = [
  { value: 'featured', label: 'Recommended' },
  { value: 'alpha', label: 'Name A–Z' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
]

function readUrl(initialCategory?: string): Filters {
  const q = new URLSearchParams(window.location.search)
  const legacySort: Record<string, Sort> = { asc: 'price_asc', desc: 'price_desc', alpha: 'alpha' }
  const sortRaw = q.get('sort') || ''
  return {
    category: (initialCategory || q.get('category') || 'all').toLowerCase(),
    q: q.get('q') || '',
    sort: (SORTS.some(x => x.value === sortRaw) ? sortRaw : legacySort[sortRaw] || 'featured') as Sort,
    min: q.get('min') || '',
    max: q.get('max') || '',
    stock: q.get('stock') === '1',
    tag: q.get('tag') || '',
  }
}

function writeUrl(f: Filters) {
  const q = new URLSearchParams()
  if (f.q) q.set('q', f.q)
  if (f.sort !== 'featured') q.set('sort', f.sort)
  if (f.min) q.set('min', f.min)
  if (f.max) q.set('max', f.max)
  if (f.stock) q.set('stock', '1')
  if (f.tag) q.set('tag', f.tag)
  const path = f.category === 'all' ? '/shop' : `/shop/c/${encodeURIComponent(f.category)}`
  const qs = q.toString()
  const next = qs ? `${path}?${qs}` : path
  if (window.location.pathname + window.location.search !== next) window.history.replaceState(window.history.state, '', next)
}

function rank(p: Product) {
  return (isInStock(p.stock_status) ? 0 : 2) + (fromPrice(p) ? 0 : 1)
}

function applyFilters(products: Product[], f: Filters, query: string): Product[] {
  const words = norm(query).split(/\s+/).filter(Boolean)
  const min = Number(f.min) || 0
  const max = Number(f.max) || 0
  const list = products.filter(p => {
    if (f.category !== 'all' && !getCategoryList(p).includes(f.category)) return false
    if (f.stock && (!isInStock(p.stock_status) || !fromPrice(p))) return false
    if (f.tag && !String(p.tags || '').toLowerCase().split(',').map(t => t.trim()).includes(f.tag.toLowerCase())) return false
    if (words.length) {
      const hay = norm(`${p.name} ${p.description || ''} ${p.short_description || ''} ${p.tags || ''} ${getCategoryList(p).join(' ')}`)
      if (!words.every(w => hay.includes(w))) return false
    }
    if (min || max) {
      const fp = fromPrice(p)?.price
      if (fp === undefined) return false
      if (min && fp < min) return false
      if (max && fp > max) return false
    }
    return true
  })
  const price = (p: Product) => fromPrice(p)?.price ?? Infinity
  return list.sort((a, b) => {
    switch (f.sort) {
      case 'alpha': return a.name.localeCompare(b.name)
      case 'price_asc': return price(a) - price(b) || a.name.localeCompare(b.name)
      case 'price_desc': return (price(b) === Infinity ? -1 : price(b)) - (price(a) === Infinity ? -1 : price(a)) || a.name.localeCompare(b.name)
      default:
        return rank(a) - rank(b)
          || Number(!!b.featured) - Number(!!a.featured)
          || (a.sort_order ?? 0) - (b.sort_order ?? 0)
          || a.name.localeCompare(b.name)
    }
  })
}

// ── Filter panel (sidebar on desktop, drawer on mobile) ──────
function FilterPanel({ f, set, cats, counts, total }: {
  f: Filters; set: (p: Partial<Filters>) => void; cats: string[]; counts: Record<string, number>; total: number
}) {
  const [min, setMin] = useState(f.min)
  const [max, setMax] = useState(f.max)
  useEffect(() => { setMin(f.min); setMax(f.max) }, [f.min, f.max])
  return (
    <>
      <div className={s.filterGroup}>
        <div className={s.filterTitle}>Categories</div>
        {['all', ...cats].map(c => (
          <button key={c} type="button" className={s.catBtn} aria-current={f.category === c ? 'true' : undefined}
            onClick={() => set({ category: c })}>
            <span>{c === 'all' ? 'All products' : categoryLabel(c)}</span>
            <span className={s.catCount}>{c === 'all' ? total : counts[c] || 0}</span>
          </button>
        ))}
      </div>
      <form className={s.filterGroup} onSubmit={e => { e.preventDefault(); set({ min, max }) }}>
        <div className={s.filterTitle}>Price (₦, lowest plan)</div>
        <div className={s.priceRow}>
          <Input fieldSize="md" inputMode="numeric" placeholder="Min" aria-label="Minimum price" value={min} onChange={e => setMin(e.target.value.replace(/\D/g, ''))} />
          <Input fieldSize="md" inputMode="numeric" placeholder="Max" aria-label="Maximum price" value={max} onChange={e => setMax(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div style={{ padding: '0 var(--bs-space-1)', marginTop: 'var(--bs-space-2)' }}>
          <Button type="submit" variant="secondary" size="md" full>Apply price</Button>
        </div>
      </form>
      <div className={s.filterGroup}>
        <div className={s.filterTitle}>Availability</div>
        <label className={s.catBtn} style={{ cursor: 'pointer' }}>
          <span>In stock only</span>
          <input type="checkbox" checked={f.stock} onChange={e => set({ stock: e.target.checked })} style={{ width: 18, height: 18, accentColor: 'var(--bs-accent)' }} />
        </label>
      </div>
    </>
  )
}

export default function ShopPage({ initialCategory }: { initialCategory?: string }) {
  const { referralCode, affiliateInfo, clearReferral } = useReferral()
  void referralCode
  const { bannerAds, sidebarAds, sponsoredCards } = useShopAds()
  const { products, loading } = useProducts()
  const { currency } = useCurrency()
  const [f, setF] = useState<Filters>({ ...DEFAULTS, category: initialCategory?.toLowerCase() || 'all' })
  const [ready, setReady] = useState(false)
  const [query, setQuery] = useState('') // debounced f.q
  const [limit, setLimit] = useState(PAGE)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [quick, setQuick] = useState<Product | null>(null)
  const [msg, clearMsg] = useCartReconcile()
  const qv = useQuickView(setQuick, quick)

  // URL → state once, after mount (window is not available on the server).
  useEffect(() => { const init = readUrl(initialCategory); setF(init); setQuery(init.q); setReady(true) }, [initialCategory])
  // state → URL, except while a quick view owns the address bar.
  useEffect(() => { if (ready && !quick) writeUrl(f) }, [f, ready, quick])
  useEffect(() => { const t = setTimeout(() => setQuery(f.q), 250); return () => clearTimeout(t) }, [f.q])
  useEffect(() => { setLimit(PAGE) }, [f.category, query, f.sort, f.min, f.max, f.stock, f.tag])

  const set = useCallback((patch: Partial<Filters>) => setF(prev => ({ ...prev, ...patch })), [])

  // The site header's search and Browse menu talk to this page directly.
  useEffect(() => {
    const onSearch = (e: Event) => { const q = String((e as CustomEvent).detail?.q ?? ''); setF(p => ({ ...p, q, category: 'all', tag: '' })); setQuery(q) }
    const onCategory = (e: Event) => setF(p => ({ ...p, category: String((e as CustomEvent).detail?.category ?? 'all'), q: '', tag: '' }))
    window.addEventListener(SHOP_EVENTS.search, onSearch)
    window.addEventListener(SHOP_EVENTS.category, onCategory)
    return () => { window.removeEventListener(SHOP_EVENTS.search, onSearch); window.removeEventListener(SHOP_EVENTS.category, onCategory) }
  }, [])

  const { cats, counts } = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of products) for (const c of getCategoryList(p)) counts[c] = (counts[c] || 0) + 1
    const found = Object.keys(counts)
    return { cats: [...TAB_ORDER.filter(c => c !== 'all' && counts[c]), ...found.filter(c => !TAB_ORDER.includes(c)).sort()], counts }
  }, [products])

  const results = useMemo(() => applyFilters(products, f, query), [products, f, query])
  const visible = results.slice(0, limit)
  const items = interleaveAds(visible, sponsoredCards, 8)

  const active: { label: string; clear: Partial<Filters> }[] = []
  if (f.q) active.push({ label: `“${f.q}”`, clear: { q: '' } })
  if (f.tag) active.push({ label: `Tag: ${f.tag}`, clear: { tag: '' } })
  if (f.min || f.max) active.push({ label: `₦${f.min || '0'} – ${f.max ? `₦${f.max}` : 'any'}`, clear: { min: '', max: '' } })
  if (f.stock) active.push({ label: 'In stock', clear: { stock: false } })

  const title = f.q && f.category === 'all' ? `Results for “${f.q}”` : f.category === 'all' ? 'All products' : categoryLabel(f.category)
  const panel = <FilterPanel f={f} set={p => { set(p); setFiltersOpen(false) }} cats={cats} counts={counts} total={products.length} />

  return (
    <div className={s.page}>
      {msg && <Notice tone="warn" onClose={clearMsg}>{msg}</Notice>}
      {affiliateInfo && (
        <div style={{ marginBottom: 'var(--bs-space-4)' }}>
          <ReferralBanner storeName={affiliateInfo.store_name} referralCode={affiliateInfo.referral_code} onClear={clearReferral} />
        </div>
      )}

      <div className={s.catalog}>
        <aside className={s.sidebar} aria-label="Filters">
          {panel}
          {sidebarAds.length > 0 && <ShopSidebar ads={sidebarAds} />}
        </aside>

        <div style={{ minWidth: 0 }}>
          <div className={s.toolbar}>
            <div>
              <h1 className={s.title}>{title}</h1>
              <p className={s.titleSub} aria-live="polite">{loading ? 'Loading products…' : `${results.length} product${results.length === 1 ? '' : 's'}`}{currency !== 'NGN' ? ` · prices in ${currency}` : ''}</p>
            </div>
            <div className={s.toolbarRight}>
              <span className="bs-mobile-only"><IconButton icon="filter" label="Filters" outline onClick={() => setFiltersOpen(true)} /></span>
              <Select fieldSize="md" aria-label="Sort by" value={f.sort} onChange={e => set({ sort: e.target.value as Sort })} style={{ width: 'auto', minWidth: 180 }}>
                {SORTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
          </div>

          <div className={s.chips} role="list" aria-label="Categories">
            {['all', ...cats].map(c => (
              <button key={c} role="listitem" type="button" className={s.chip} aria-current={f.category === c ? 'true' : undefined} onClick={() => set({ category: c })}>
                {c === 'all' ? 'All' : categoryLabel(c)}
              </button>
            ))}
          </div>

          {active.length > 0 && (
            <div className={s.activeFilters}>
              {active.map(a => (
                <button key={a.label} type="button" className={s.activeChip} onClick={() => set(a.clear)} aria-label={`Remove filter ${a.label}`}>
                  {a.label} <Icon name="close" size={12} />
                </button>
              ))}
              <button type="button" className={s.linkBtn} onClick={() => set({ q: '', tag: '', min: '', max: '', stock: false })}>Clear all</button>
            </div>
          )}

          {bannerAds.length > 0 && <div style={{ marginBottom: 'var(--bs-space-4)' }}><ShopBanner ads={bannerAds} /></div>}

          {loading ? (
            <div className={s.grid}>{Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
          ) : results.length === 0 ? (
            <EmptyState icon="search" title="No products match"
              action={<Button variant="secondary" onClick={() => setF({ ...DEFAULTS })}>Clear filters</Button>}>
              Try a different search or category.
            </EmptyState>
          ) : (
            <>
              <div className={s.grid}>
                {items.map((it: any) => it._isAd
                  ? <SponsoredProductCard key={`ad-${it.ad.id}`} ad={it.ad} isMobile={false}
                      cardStyle={{ background: 'var(--bs-bg-card)', border: '1px solid var(--bs-border-default)', borderRadius: 'var(--bs-radius-xl)', padding: 'var(--bs-space-4)', height: '100%' }} />
                  : <ProductCard key={it.id} product={it} onOpen={qv.open} />)}
              </div>
              {results.length > limit && (
                <div className={s.more}>
                  <Button variant="secondary" onClick={() => setLimit(l => l + PAGE)}>Show more</Button>
                  <span className={s.muted}>Showing {visible.length} of {results.length}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} side="left" label="Filters">
        <div className={s.drawerHead}>
          <h2 className={s.drawerTitle}>Filters</h2>
          <IconButton icon="close" label="Close filters" onClick={() => setFiltersOpen(false)} />
        </div>
        <DrawerBody><div style={{ padding: 'var(--bs-space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--bs-space-4)' }}>{panel}</div></DrawerBody>
      </Drawer>

      <QuickView product={quick} onClose={qv.close} />
    </div>
  )
}
