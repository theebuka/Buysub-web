'use client'

// ============================================================
// BUYSUB — Home (/)
// ============================================================
// Hero on a ruled grid: the headline (bottom left) and, in the right column,
// a 3D phone mockup of the shop. Search lives in the header, so the hero
// has none. Then three sections: the brand marquee with how it works,
// browse by category, and the closing call to action. AppShell renders this
// route full width (isFullBleed), so every band sets its own gutters.
//
// Copy makes no promises the business hasn't made (no delivery times, no
// guarantees). The marquee only shows services the loaded catalog sells.

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ButtonLink, Icon, ProductLogo, Skeleton, type IconName } from '@/components/ui'
import { useProducts } from '@/lib/useProducts'
import { useReferral } from '@/lib/useReferral'
import { getCategoryList, PERIODS, TAB_ORDER, WHATSAPP_NUMBER, type Product } from '@/lib/constants'
import { categoryHref } from '@/lib/catalog'
import { categoryLabel, fmtNGN } from '@/lib/format'
import { fromPrice } from '@/lib/pricing'
import { useSiteStatus } from '@/lib/siteStatus'
import { ROUTES } from '@/lib/routes'
import { BRANDS, type Brand } from './brands'
import s from './home.module.css'

// The phone in the hero: a 3D mockup of the shop (shots.so, upscaled 4x with
// Real-ESRGAN, saved at 2x: 1360x2244, transparent). The stage crops its
// lower part at the fold.
const HERO_PHONE = { src: '/home/hero-phone.png', width: 1360, height: 2244 }

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
    // Three priced products for the how-it-works list, the marquee's first.
    const priced: { p: Product; price: number; period: string }[] = []
    const seen = new Set<string>()
    for (const p of [...brands.map(b => products.find(x => x.name === b.q)!), ...products]) {
      const f = p && !seen.has(p.id) ? fromPrice(p) : null
      if (f) { seen.add(p.id); priced.push({ p, ...f }) }
      if (priced.length === 3) break
    }
    return { cats, brands, priced }
  }, [products])
}

function Device() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={HERO_PHONE.src} width={HERO_PHONE.width} height={HERO_PHONE.height}
      alt="The BuySub shop on a phone" className={s.heroPhone} fetchPriority="high" decoding="async"
    />
  )
}

const SNAPCHAT = 'Snapchat'

/** A brand's Simple Icons glyph: white, except Snapchat, whose mark is a white ghost with a black outline. */
function BrandGlyph({ b }: { b: Brand }) {
  const snap = b.name === SNAPCHAT
  return (
    <svg viewBox="-1 -1 26 26" aria-hidden="true">
      <path d={b.path} fill="currentColor" {...(snap ? { stroke: '#000', strokeWidth: 1.1, paintOrder: 'stroke', strokeLinejoin: 'round' as const } : {})} />
    </svg>
  )
}

function BrandTile({ b, copy, repeat }: { b: Brand; copy?: boolean; repeat?: boolean }) {
  return (
    <Link href={`${ROUTES.shop}?q=${encodeURIComponent(b.q)}`} className={`${s.brand} ${repeat ? s.repeat : ''}`} tabIndex={copy ? -1 : undefined} aria-hidden={copy || undefined}>
      <span className={s.brandTile} style={{ background: b.hex, color: '#fff' }}>
        <BrandGlyph b={b} />
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

type Priced = { p: Product; price: number; period: string }

// How it works: three steps, each over a small piece of the real UI it describes.
// Motion helpers for the how-it-works visuals: run only while on screen,
// and not at all for visitors who ask for reduced motion.
function useOnScreen<T extends Element>(ref: React.RefObject<T>): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return on
}

function useReducedMotion(): boolean {
  const [rm, setRm] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setRm(mq.matches)
    const on = () => setRm(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return rm
}

/** Steps an index through `count` items every `ms` while `run` is true. */
function useCycle(count: number, ms: number, run: boolean): [number, (n: number) => void] {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!run || count < 2) return
    const t = window.setInterval(() => setI(n => (n + 1) % count), ms)
    return () => window.clearInterval(t)
  }, [count, ms, run])
  return [i, setI]
}

// Rows land one after another on a parabolic path (x eases out, y eases in),
// spaced like rungs; then the active row (lifted, shifted right) walks
// down the list and starts again.
const LADDER_MS = 1300 // the last rung (delay 460ms) lands at 1.21s

function StepPrices({ priced, loading }: { priced: Priced[]; loading: boolean }) {
  const ref = useRef<HTMLUListElement>(null)
  const onScreen = useOnScreen(ref)
  const rm = useReducedMotion()
  const [armed, setArmed] = useState(false) // hide rows only once JS can bring them in
  const [landed, setLanded] = useState(false)
  useEffect(() => { setArmed(true) }, [])
  useEffect(() => {
    if (loading || landed || !(onScreen || rm)) return
    if (rm) { setLanded(true); return }
    const t = window.setTimeout(() => setLanded(true), LADDER_MS)
    return () => window.clearTimeout(t)
  }, [loading, landed, onScreen, rm])
  const entering = armed && !rm && !loading && onScreen && !landed
  const waiting = armed && !rm && !loading && !onScreen && !landed
  const [active] = useCycle(priced.length, 2200, landed && onScreen && !rm)
  return (
    <ul ref={ref} className={s.vList}>
      {loading
        ? Array.from({ length: 3 }, (_, i) => <li key={i} className={s.vRow}><Skeleton width={28} height={28} radius="8px" /><Skeleton width="50%" height={12} /></li>)
        : priced.map(({ p, price, period }, i) => (
            <li
              key={p.id}
              className={`${s.vRow} ${s.rung} ${waiting ? s.rungWait : ''} ${entering ? s.rungIn : ''} ${landed && i === active ? s.rungOn : ''}`}
              style={{ '--d': `${Math.round(90 * i + 70 * i * i)}ms` } as React.CSSProperties}
            >
              <ProductLogo product={p} size={28} radius="8px" />
              <span className={s.vName}>{p.name}</span>
              <span className={s.vPrice}>{fmtNGN(price)} <span className={s.vMuted}>{PERIODS[period]?.label}</span></span>
            </li>
          ))}
    </ul>
  )
}

type Way = { key: 'card' | 'transfer' | 'wallet' | 'whatsapp'; icon: IconName; label: string }

// A small checkout in the manner of a payment element: method tabs with a
// sliding selection, a panel that changes with the method, and the pay
// button. It walks through the methods checkout offers right now.
function StepPay({ priced }: { priced: Priced[] }) {
  const { services } = useSiteStatus()
  const ways: Way[] = ([
    { key: 'card', icon: 'card', label: 'Card', on: services.paystack },
    { key: 'transfer', icon: 'send', label: 'Transfer', on: services.paystack },
    { key: 'wallet', icon: 'wallet', label: 'Wallet', on: services.wallet_pay },
    { key: 'whatsapp', icon: 'message', label: 'WhatsApp', on: services.whatsapp },
  ] as (Way & { on: boolean })[]).filter(w => w.on)
  const ref = useRef<HTMLDivElement>(null)
  const onScreen = useOnScreen(ref)
  const rm = useReducedMotion()
  const [i] = useCycle(ways.length, 2600, onScreen && !rm)
  const at = Math.min(i, ways.length - 1)
  const first = priced[0]
  const pane = (w: Way) => {
    switch (w.key) {
      case 'card': return (
        <span className={s.field}><Icon name="card" size={16} /><span className={s.fieldText}>1234 1234 1234 1234</span><span className={s.fieldSide}>MM / YY</span></span>
      )
      case 'transfer': return <span className={s.paneNote}>Pay into the account Paystack shows you at checkout.</span>
      case 'wallet': return <span className={s.paneNote}>Your BuySub balance pays first; card or transfer covers the rest.</span>
      case 'whatsapp': return (
        <span className={s.bubble}>Hi, I’d like {first ? first.p.name : 'to order'}<span className={s.ticks}><Icon name="check" size={11} /><Icon name="check" size={11} /></span></span>
      )
    }
  }
  if (!ways.length) return null
  return (
    <div ref={ref} className={s.payEl}>
      <div className={s.tabs} style={{ '--n': ways.length, '--i': at } as React.CSSProperties}>
        <span className={s.tabInd} />
        {ways.map((w, n) => (
          <span key={w.key} className={`${s.tab} ${n === at ? s.tabOn : ''}`}><Icon name={w.icon} size={14} />{w.label}</span>
        ))}
      </div>
      <div className={s.panes}>
        {ways.map((w, n) => <div key={w.key} className={`${s.pane} ${n === at ? s.paneOn : ''}`}>{pane(w)}</div>)}
      </div>
      <span className={s.payBtn}>
        <span key={ways[at].key === 'whatsapp' ? 'wa' : 'pay'} className={s.payLabel}>
          {ways[at].key === 'whatsapp' ? 'Send order on WhatsApp' : first ? `Pay ${fmtNGN(first.price)}` : 'Pay now'}
        </span>
      </span>
    </div>
  )
}

const SETUP = ['Payment received', 'Our team sets it up', 'Access details sent']

function StepSetup() {
  return (
    <ol className={s.track3}>
      {SETUP.map((l, i) => (
        <li key={l} className={`${s.tStep} ${i === 0 ? s.tDone : i === 1 ? s.tNow : ''}`}>
          <span className={s.tMark} aria-hidden="true"><Icon name="check" size={12} /></span>
          {l}
        </li>
      ))}
    </ol>
  )
}

function HowItWorks({ priced, loading }: { priced: Priced[]; loading: boolean }) {
  const steps = [
    { title: 'Pick it, priced in Naira', body: 'Search or browse the catalog. Every price is in Naira and shown before you pay, so you don’t need a dollar card.', visual: <StepPrices priced={priced} loading={loading} /> },
    { title: 'Pay your way', body: 'Choose how to pay at checkout. Card and bank transfer go through Paystack.', visual: <StepPay priced={priced} /> },
    { title: 'We set it up', body: 'Our team sets up the subscription and sends you the access details. Follow each order from your account.', visual: <StepSetup /> },
  ]
  return (
    <div className={s.how} id="how">
      <div className={s.howHead}>
        <h3 className={s.h3}>How it works</h3>
        <p className={s.howNote}>
          Questions at any step?{' '}
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className={s.textLink}>Chat with us on WhatsApp</a>
        </p>
      </div>
      <ol className={s.steps}>
        {steps.map((st, i) => (
          <li key={st.title} className={s.step}>
            <div className={s.visual} aria-hidden="true">{st.visual}</div>
            <span className={s.num}>{String(i + 1).padStart(2, '0')}</span>
            <h4 className={s.stepTitle}>{st.title}</h4>
            <p className={s.stepBody}>{st.body}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

// Where the orbiting tiles sit around the logomark, in percent of the art box.
const ORBIT = [
  { x: 14, y: 20, r: -12 }, { x: 50, y: 6, r: 6 }, { x: 86, y: 22, r: 10 },
  { x: 88, y: 76, r: -8 }, { x: 50, y: 93, r: 8 }, { x: 13, y: 78, r: 12 },
]

/** Art for the closer until a mascot exists: the apps we sell orbiting the BuySub mark. */
function OrbitArt({ brands }: { brands: Brand[] }) {
  return (
    <div className={s.art} aria-hidden="true">
      <span className={s.ring} />
      <span className={`${s.ring} ${s.ringInner}`} />
      <span className={s.hub}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logomark-tint.svg" alt="" />
      </span>
      {brands.slice(0, ORBIT.length).map((b, i) => (
        <span
          key={b.name} className={s.orbitTile}
          style={{ left: `${ORBIT[i].x}%`, top: `${ORBIT[i].y}%`, background: b.hex, color: '#fff', '--r': `${ORBIT[i].r}deg`, animationDelay: `${i * -1.3}s` } as React.CSSProperties}
        >
          <BrandGlyph b={b} />
        </span>
      ))}
    </div>
  )
}

/** The closing call to action: why buy here, then the shop. */
function Closer({ brands }: { brands: Brand[] }) {
  return (
    <section className={s.closer} aria-labelledby="closer-title">
      <div className={s.closerCard}>
        <div className={s.closerMain}>
          <h2 id="closer-title" className={s.closerTitle}>Pay in Naira. We handle the rest.</h2>
          <p className={s.closerText}>No dollar card, no setup headaches. Pick a subscription and our team gets you in.</p>
          <div className={s.closerBtns}>
            <Link href={ROUTES.shop} className={s.closerBtn}>Browse the shop <Icon name="arrowRight" size={18} /></Link>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className={s.closerGhost}>Ask us on WhatsApp</a>
          </div>
        </div>
        <OrbitArt brands={brands} />
      </div>
    </section>
  )
}

export default function HomePage() {
  useReferral() // records ?ref= from partner links to the home page
  const { products, loading } = useProducts()
  const { cats, brands, priced } = useHomeData(products)

  return (
    <div className={s.home}>
      <section className={s.hero} aria-labelledby="home-title">
        <div className={s.titleCell}>
          <span className={s.cross} aria-hidden="true" />
          <h1 id="home-title" className={s.title}>
            <span className={s.titleLine}>Every subscription</span>{' '}
            <span className={s.titleLine}>you use, <span className={s.nowrap}>in one place.</span></span>
          </h1>
        </div>
        <div className={s.stage}><Device /></div>
      </section>

      <section className={s.band} aria-labelledby={loading || brands.length ? 'brands-title' : undefined} aria-label={loading || brands.length ? undefined : 'How it works'}>
        {(loading || brands.length > 0) && (
          <>
            <div className={s.head}>
              <h2 id="brands-title" className={s.h2}>The apps you already use</h2>
              <ButtonLink href={ROUTES.shop} size="lg">View all</ButtonLink>
            </div>
            {loading
              ? <div className={s.marqueeLoading}>{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} width={120} height={120} radius="28px" />)}</div>
              : <Marquee brands={brands} />}
          </>
        )}
        <HowItWorks priced={priced} loading={loading} />
      </section>

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

      <Closer brands={brands} />
    </div>
  )
}
