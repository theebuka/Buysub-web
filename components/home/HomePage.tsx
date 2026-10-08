'use client'

// ============================================================
// BUYSUB — Home (/)
// ============================================================
// Hero on a ruled grid: the headline (bottom left) and, in the right column,
// the live shop in a tilted phone. Search lives in the header, so the hero
// has none. Then three sections: the brand marquee with how it works,
// browse by category, and the partner card. AppShell renders this route full width (isFullBleed),
// so every band sets its own gutters.
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

// The phone in the hero. Until the 3D mockup render arrives, a CSS phone
// tilted in perspective stands in. When it does, set MOCKUP to its path (a
// transparent PNG in /public) and SCREEN to where the phone's screen sits in
// it, in percent of the image; the live shop is placed there. An angled
// screen also needs SCREEN.transform (a CSS transform matching the render's
// perspective), or the render can carry a static screenshot instead.
const MOCKUP: string | null = null
const SCREEN = { left: 0, top: 0, width: 100, height: 100, radius: '11% / 5%', transform: 'none' }

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
  if (MOCKUP) {
    return (
      <div className={s.mockup}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MOCKUP} alt="" className={s.mockupImg} />
        <div className={s.mockupScreen} style={{ left: `${SCREEN.left}%`, top: `${SCREEN.top}%`, width: `${SCREEN.width}%`, height: `${SCREEN.height}%`, borderRadius: SCREEN.radius, transform: SCREEN.transform }}>
          <LiveShop />
        </div>
      </div>
    )
  }
  // Placeholder until the mockup render is supplied.
  return (
    <div className={s.phone}>
      <LiveShop />
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

type Priced = { p: Product; price: number; period: string }

// How it works: three steps, each over a small piece of the real UI it describes.
function StepPrices({ priced, loading }: { priced: Priced[]; loading: boolean }) {
  return (
    <ul className={s.vList}>
      {loading
        ? Array.from({ length: 3 }, (_, i) => <li key={i} className={s.vRow}><Skeleton width={28} height={28} radius="8px" /><Skeleton width="50%" height={12} /></li>)
        : priced.map(({ p, price, period }) => (
            <li key={p.id} className={s.vRow}>
              <ProductLogo product={p} size={28} radius="8px" />
              <span className={s.vName}>{p.name}</span>
              <span className={s.vPrice}>{fmtNGN(price)} <span className={s.vMuted}>{PERIODS[period]?.label}</span></span>
            </li>
          ))}
    </ul>
  )
}

function StepPay() {
  const { services } = useSiteStatus()
  // Only the options checkout offers right now (admins can switch them off).
  const ways: { icon: IconName; label: string; on: boolean }[] = [
    { icon: 'card', label: 'Card', on: services.paystack },
    { icon: 'send', label: 'Bank transfer', on: services.paystack },
    { icon: 'wallet', label: 'BuySub wallet', on: services.wallet_pay },
    { icon: 'message', label: 'WhatsApp', on: services.whatsapp },
  ].filter(w => w.on)
  return (
    <ul className={s.vList}>
      {ways.map((w, i) => (
        <li key={w.label} className={`${s.vRow} ${i === 0 ? s.vOn : ''}`}>
          <Icon name={w.icon} size={18} />
          <span className={s.vName}>{w.label}</span>
          <span className={s.radio} aria-hidden="true" />
        </li>
      ))}
    </ul>
  )
}

const SETUP = ['Payment received', 'Our team sets it up', 'Access details sent']

function StepSetup() {
  return (
    <ol className={s.track3}>
      {SETUP.map((l, i) => (
        <li key={l} className={`${s.tStep} ${i === 0 ? s.tDone : i === 1 ? s.tNow : ''}`}>
          <span className={s.tMark} aria-hidden="true">{i === 0 && <Icon name="check" size={12} />}</span>
          {l}
        </li>
      ))}
    </ol>
  )
}

function HowItWorks({ priced, loading }: { priced: Priced[]; loading: boolean }) {
  const steps = [
    { title: 'Pick it, priced in Naira', body: 'Search or browse the catalog. Every price is in Naira and shown before you pay, so you don’t need a dollar card.', visual: <StepPrices priced={priced} loading={loading} /> },
    { title: 'Pay your way', body: 'Choose how to pay at checkout. Card and bank transfer go through Paystack.', visual: <StepPay /> },
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

const PROMISES = ['Prices in Naira, shown before you pay', 'Card, transfer, wallet or WhatsApp', 'Set up for you by our team']

/** The closing call to action: why buy here, then the shop. */
function Closer() {
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
        <ul className={s.promises}>
          {PROMISES.map(p => (
            <li key={p} className={s.promise}><span className={s.promiseMark} aria-hidden="true"><Icon name="check" size={14} /></span>{p}</li>
          ))}
        </ul>
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

      <Closer />
    </div>
  )
}
