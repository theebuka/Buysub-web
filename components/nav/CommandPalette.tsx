'use client'

// Site-wide search, opened by the header search field, "/" and ⌘K / Ctrl+K.
// Empty query: recent searches, popular categories and quick links. Typing:
// live product and category matches from the shared product cache, plus
// "search everything for …". Arrow keys move, Enter picks, Escape closes.
//
// Until Phase 2 adds product pages, picking a product runs a shop search for
// its name; lib/shopBus.ts decides whether that is an in-page event (on /shop)
// or a navigation.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Icon, Kbd, ProductLogo, Spinner, useFocusTrap, type IconName } from '@/components/ui'
import { useProducts } from '@/lib/useProducts'
import { getCategoryList, isInStock, TAB_ORDER, format, type Product } from '@/lib/constants'
import { fromPrice } from '@/lib/pricing'
import { shop } from '@/lib/shopBus'
import { ROUTES } from '@/lib/routes'
import { categoryLabel } from '@/lib/format'
import { useSession } from '@/lib/useSession'
import css from './nav.module.css'

const RECENT_KEY = 'bs_recent_searches'

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 5) : []
  } catch { return [] }
}
function pushRecent(q: string) {
  const t = q.trim()
  if (!t) return
  try {
    const next = [t, ...readRecent().filter(x => x.toLowerCase() !== t.toLowerCase())].slice(0, 5)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch { /* storage unavailable */ }
}

type Item = {
  id: string
  group: string
  label: string
  sub?: string
  icon?: IconName
  product?: Product
  run: () => void
}

function matches(p: Product, q: string) {
  const hay = `${p.name} ${p.category || ''} ${p.tags || ''} ${p.short_description || ''}`.toLowerCase()
  return q.split(/\s+/).every(w => hay.includes(w))
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const session = useSession()
  const { products, loading } = useProducts({ enabled: open })
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [recent, setRecent] = useState<string[]>([])
  const panel = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)

  useFocusTrap(open, panel, onClose, input)

  useEffect(() => {
    if (!open) return
    setQ('')
    setActive(0)
    setRecent(readRecent())
  }, [open])

  const categories = useMemo(() => {
    const found = new Set(products.flatMap(getCategoryList))
    return TAB_ORDER.filter(c => c !== 'all' && found.has(c))
  }, [products])

  const go = (href: string) => { onClose(); router.push(href) }
  const searchAll = (term: string) => { pushRecent(term); onClose(); shop.search(term) }

  const items: Item[] = useMemo(() => {
    const term = q.trim().toLowerCase()
    const out: Item[] = []
    if (!term) {
      recent.forEach(r => out.push({ id: `r-${r}`, group: 'Recent', label: r, icon: 'clock', run: () => searchAll(r) }))
      categories.slice(0, 6).forEach(c => out.push({
        id: `c-${c}`, group: 'Browse categories', label: categoryLabel(c), icon: 'grid',
        run: () => { onClose(); shop.category(c) },
      }))
      const signedIn = session.status === 'signed_in'
      out.push(
        { id: 'l-orders', group: 'Go to', label: 'My orders', icon: 'receipt', run: () => go(signedIn ? ROUTES.account.orders : ROUTES.login) },
        { id: 'l-wallet', group: 'Go to', label: 'Wallet', icon: 'wallet', run: () => go(signedIn ? ROUTES.account.wallet : ROUTES.login) },
        { id: 'l-partner', group: 'Go to', label: 'Partner programme', icon: 'users', run: () => go(ROUTES.partner.apply) },
        { id: 'l-help', group: 'Go to', label: 'Help centre', icon: 'help', run: () => go(ROUTES.help) },
      )
      return out
    }
    const hits = products.filter(p => matches(p, term))
      .sort((a, b) => Number(isInStock(b.stock_status)) - Number(isInStock(a.stock_status)) || (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .slice(0, 7)
    hits.forEach(p => {
      const fp = fromPrice(p)
      out.push({
        id: `p-${p.id}`, group: 'Products', label: p.name, product: p,
        sub: !isInStock(p.stock_status) ? 'Out of stock' : fp ? `From ${format(fp.price, 'NGN')}` : 'Currently unavailable',
        run: () => searchAll(p.name),
      })
    })
    categories.filter(c => c.includes(term)).slice(0, 3).forEach(c => out.push({
      id: `c-${c}`, group: 'Categories', label: categoryLabel(c), icon: 'grid',
      run: () => { onClose(); shop.category(c) },
    }))
    out.push({ id: 'all', group: 'Search', label: `Search all products for “${q.trim()}”`, icon: 'search', run: () => searchAll(q.trim()) })
    return out
    // go/searchAll close over onClose and router, both stable for an open palette.
  }, [q, products, categories, recent, session.status])

  useEffect(() => { setActive(0) }, [q])
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(items.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); items[active]?.run() }
  }

  let lastGroup = ''
  // Portalled to <body>: the header is a sticky stacking context at z 60, and
  // the shop's floating cart (z 100) would otherwise sit on top of the palette.
  return createPortal(
    <>
      <div className={css.paletteScrim} onClick={onClose} aria-hidden="true" />
      <div className={css.paletteWrap} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
        <div ref={panel} role="dialog" aria-modal="true" aria-label="Search BuySub" className={css.palette}>
          <div className={css.paletteInputRow}>
            <Icon name="search" size={18} style={{ color: 'var(--bs-text-muted)' }} />
            <input
              ref={input}
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder="Search Netflix, Spotify, ChatGPT…"
              className={css.paletteInput}
              role="combobox"
              aria-expanded="true"
              aria-controls="bs-palette-list"
              aria-activedescendant={items[active] ? `bs-pal-${active}` : undefined}
              aria-autocomplete="list"
            />
            {loading && <Spinner size={16} />}
            <button type="button" onClick={onClose} className={css.paletteEsc}>Esc</button>
          </div>
          <div ref={list} id="bs-palette-list" role="listbox" aria-label="Results" className={css.paletteList}>
            {items.length === 0 && <p className={css.paletteEmpty}>No matches.</p>}
            {items.map((it, i) => {
              const header = it.group !== lastGroup ? it.group : null
              lastGroup = it.group
              return (
                <div key={it.id}>
                  {header && <div className={css.paletteGroup}>{header}</div>}
                  <div
                    id={`bs-pal-${i}`}
                    data-idx={i}
                    role="option"
                    aria-selected={i === active}
                    className={css.paletteItem}
                    onMouseMove={() => setActive(i)}
                    onClick={() => it.run()}
                  >
                    {it.product
                      ? <ProductLogo product={it.product} size={32} radius="var(--bs-radius-md)" />
                      : <span className={css.paletteIcon}><Icon name={it.icon || 'search'} size={16} /></span>}
                    <span className={css.paletteLabel}>{it.label}</span>
                    {it.sub && <span className={css.paletteSub}>{it.sub}</span>}
                    {i === active && <Icon name="arrowRight" size={14} style={{ color: 'var(--bs-text-muted)' }} />}
                  </div>
                </div>
              )
            })}
          </div>
          <div className={css.paletteFoot}>
            <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> to move</span>
            <span><Kbd>↵</Kbd> to open</span>
            <span><Kbd>/</Kbd> or <Kbd>⌘K</Kbd> to search anywhere</span>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
