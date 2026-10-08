'use client'

// ============================================================
// BUYSUB — Home (/)
// ============================================================
// Hero on a ruled grid: the live shop in a phone (top left), a rotating line
// with its pager (top right), the headline (bottom left) and search (bottom
// right). Then three sections: the brand marquee, browse by category, and
// the partner close. AppShell renders this route full width (isFullBleed),
// so every band sets its own gutters.
//
// Copy makes no promises the business hasn't made (no delivery times, no
// guarantees). The marquee only shows services the loaded catalog sells.

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ButtonLink, Icon, ProductLogo, Skeleton } from '@/components/ui'
import { useProducts } from '@/lib/useProducts'
import { useReferral } from '@/lib/useReferral'
import { getCategoryList, TAB_ORDER, type Product } from '@/lib/constants'
import { categoryHref } from '@/lib/catalog'
import { categoryLabel } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { shop } from '@/lib/shopBus'
import { BRANDS, type Brand } from './brands'
import s from './home.module.css'

// The phone in the hero. When the hand photo arrives, set HAND to its path
// (a transparent PNG in /public) and SCREEN to where the phone's screen sits
// in it, in percent of the image; the live shop is placed there.
const HAND: string | null = null
const SCREEN = { left: 0, top: 0, width: 100, height: 100, radius: '11% / 5%' }

const LINES = ['Priced in Naira.', 'Paid by card, transfer or WhatsApp.', 'Set up for you by our team.']
const LINE_MS = 3600

function useHomeData(products: Product[]) {
  return useMemo(() => {
    const byCat: Record<string, Product[]> = {}
    for (const p of products) for (const c of getCategoryList(p)) (byCat[c] ||= []).push(p)
    const cats = [...TAB_ORDER.filter(c => c !== 'all' && byCat[c]), ...Object.keys(byCat).filter(c => !TAB_ORDER.includes(c))]
      .map(c => ({ key: c, items: byCat[c] }))
    // Only brands the catalog sells right now, matched by domain or by the
    // product's name, each searching for that product. None until the
    // catalog has loaded; the band hides when nothing matches.
    const brands: Brand[] = []
    for (const b of BRANDS) {
      const name = b.name.toLowerCase()
      const hit = products.find(p => String(p.domain || '').toLowerCase() === b.domain)
        || products.find(p => p.name.toLowerCase().startsWith(name))
      if (hit) brands.push({ ...b, q: hit.name })
    }
    // The same count the shop shows for an unfiltered catalog.
    return { cats, brands, count: products.length }
  }, [products])
}

/** The live shop at phone width (390px), scaled into whatever box it's given. */
function LiveShop() {
  const box = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState<{ s: number; h: number } | null>(null)
  // On touch screens the frame would catch every vertical swipe, so it
  // starts behind a tap-to-try layer (shown by CSS on coarse pointers only).
  const [live, setLive] = useState(false)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => { const s = el.clientWidth / 390; setFit({ s, h: el.clientHeight / s }) }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={box} className={s.screen}>
      <iframe
        className={s.screenFrame} src="/shop" title="The BuySub shop, live" loading="lazy"
        style={{ '--s': fit?.s ?? 0.72, height: fit ? `${fit.h}px` : '844px' } as React.CSSProperties}
      />
      {!live && (
        <button type="button" className={s.tryShop} onClick={() => setLive(true)}>
          <span className={s.tryLabel}>Tap to try the shop</span>
        </button>
      )}
    </div>
  )
}

function Device() {
  if (HAND) {
    return (
      <div className={s.hand}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HAND} alt="" className={s.handImg} />
        <div className={s.handScreen} style={{ left: `${SCREEN.left}%`, top: `${SCREEN.top}%`, width: `${SCREEN.width}%`, height: `${SCREEN.height}%`, borderRadius: SCREEN.radius }}>
          <LiveShop />
        </div>
      </div>
    )
  }
  // Placeholder until the hand photo is supplied: the same phone, no hand.
  return (
    <div className={s.phone}>
      <LiveShop />
    </div>
  )
}

function Rotator() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [chosen, setChosen] = useState(false) // announce only lines the visitor picked
  useEffect(() => {
    if (paused || chosen) return
    const t = window.setTimeout(() => setI(n => (n + 1) % LINES.length), LINE_MS)
    return () => window.clearTimeout(t)
  }, [i, paused, chosen])
  return (
    <div
      className={s.rotator}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
    >
      <div className={s.pager}>
        {LINES.map((l, n) => (
          <button
            key={l} type="button" aria-current={n === i ? 'true' : undefined} aria-label={`Show: ${l.replace(/,$/, '')}`}
            className={`${s.dot} ${n === i ? s.dotOn : ''}`} onClick={() => { setI(n); setChosen(true) }}
          />
        ))}
      </div>
      <p className={s.line} aria-live={chosen ? 'polite' : 'off'}>
        <span key={i} className={s.lineText}>{LINES[i]}</span>
      </p>
    </div>
  )
}

const SNAPCHAT = 'Snapchat'

function BrandTile({ b, copy, repeat }: { b: Brand; copy?: boolean; repeat?: boolean }) {
  // White glyphs, except Snapchat: its mark is a white ghost with a black outline.
  const snap = b.name === SNAPCHAT
  return (
    <Link href={`${ROUTES.shop}?q=${encodeURIComponent(b.q)}`} className={`${s.brand} ${repeat ? s.repeat : ''}`} tabIndex={copy ? -1 : undefined} aria-hidden={copy || undefined}>
      <span className={s.brandTile} style={{ background: b.hex, color: '#fff' }}>
        <svg viewBox="-1 -1 26 26" aria-hidden="true">
          <path d={b.path} fill="currentColor" {...(snap ? { stroke: '#000', strokeWidth: 1.1, paintOrder: 'stroke', strokeLinejoin: 'round' as const } : {})} />
        </svg>
      </span>
      <span className={s.brandName}>{b.name}</span>
    </Link>
  )
}

// Tiles per row before the loop's copy, so a short catalog still fills a wide screen.
const MIN_PER_ROW = 12

function fill(row: Brand[]): Brand[] {
  const out: Brand[] = []
  while (row.length && out.length < MIN_PER_ROW) out.push(...row)
  return out
}

function Marquee({ brands }: { brands: Brand[] }) {
  // Two rows once there are enough brands to tell apart; one row otherwise.
  const half = Math.ceil(brands.length / 2)
  const rows = (brands.length >= 2 * 8 ? [brands.slice(0, half), brands.slice(half)] : [brands]).map(fill).filter(r => r.length)
  return (
    <div className={s.marquee}>
      {rows.map((row, n) => (
        <div key={n} className={s.track}>
          {/* Two copies so the loop is seamless; the copy, and any repeat of a brand, stay out of the tab order (and out of the static row under reduced motion). */}
          <div className={`${s.run} ${n ? s.runReverse : ''}`}>
            {row.map((b, k) => { const repeat = row.findIndex(x => x.name === b.name) !== k; return <BrandTile key={k} b={b} copy={repeat} repeat={repeat} /> })}
            <span className={s.runCopy} aria-hidden="true">{row.map((b, k) => <BrandTile key={k} b={b} copy />)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  useReferral() // records ?ref= from partner links to the home page
  const { products, loading } = useProducts()
  const { cats, brands, count } = useHomeData(products)

  return (
    <div className={s.home}>
      <section className={s.hero} aria-labelledby="home-title">
        <div className={s.titleCell}>
          <h1 id="home-title" className={s.title}>
            <span className={s.titleLine}>Every subscription</span>{' '}
            <span className={s.titleLine}>you use, <span className={s.nowrap}>in one place.</span></span>
          </h1>
        </div>
        <div className={s.searchCell}>
          <span className={s.cross} aria-hidden="true" />
          <button type="button" className={s.search} onClick={() => shop.openSearch()}>
            <Icon name="search" size={20} />
            <span className={s.searchText}>Search Netflix, Spotify, ChatGPT…</span>
            <kbd className={s.kbd}>/</kbd>
          </button>
          <Link href={ROUTES.shop} className={s.browseAll}>
            Browse all {count ? `${count} ` : ''}products <Icon name="arrowRight" size={16} />
          </Link>
        </div>
        <div className={s.aside}><Rotator /></div>
        <div className={s.stage}><Device /></div>
      </section>

      {(loading || brands.length > 0) && (
        <section className={s.band} aria-labelledby="brands-title">
          <div className={s.head}>
            <h2 id="brands-title" className={s.h2}>The apps you already use</h2>
            <ButtonLink href={ROUTES.shop} size="lg">View all</ButtonLink>
          </div>
          {loading
            ? <div className={s.marqueeLoading}>{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} width={120} height={120} radius="28px" />)}</div>
            : <Marquee brands={brands} />}
        </section>
      )}

      <section className={s.band} aria-labelledby="cats-title">
        <div className={s.head}>
          <h2 id="cats-title" className={s.h2}>Browse by category</h2>
        </div>
        <div className={s.cats}>
          {loading
            ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} height={320} radius="var(--bs-radius-md)" />)
            : cats.map(c => (
                <Link key={c.key} href={categoryHref(c.key)} className={s.cat}>
                  <span className={s.catMedia}>
                    {c.items.slice(0, 3).map(p => <ProductLogo key={p.id} product={p} size={88} radius="var(--bs-radius-xl)" />)}
                  </span>
                  <span className={s.catBody}>
                    <span className={s.catName}>{categoryLabel(c.key)}</span>
                    <span className={s.catFoot}>
                      <span className={s.tag}>{c.items.length} product{c.items.length === 1 ? '' : 's'}</span>
                      <Icon name="arrowRight" size={18} />
                    </span>
                  </span>
                </Link>
              ))}
        </div>
      </section>

      <section className={s.close} aria-labelledby="partner-title">
        <h2 id="partner-title" className={s.closeTitle}>Earn on every subscription you refer</h2>
        <div className={s.closeSide}>
          <p className={s.closeText}>Share your link with friends, followers or customers. When they buy, you earn commission.</p>
          <div className={s.closeBtns}>
            <ButtonLink href={ROUTES.partner.apply} size="xl" iconRight="arrowRight">Become a partner</ButtonLink>
            <Link href={ROUTES.loginNext(ROUTES.partner.home)} className={s.closeLink}>Partner sign in</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
