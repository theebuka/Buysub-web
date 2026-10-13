'use client'

// ============================================================
// BUYSUB — Partner hero
// ============================================================
// Opens the partner landing page (/partners, PartnersLanding.tsx): a full
// violet hero under a header of the same violet (nav.module.css .onBrand).
// The art is the thing a partner gets: their own link. One white link field
// sits on a slow-moving wall of shop links, one per product the catalog sells
// and each carrying a referral code.
// While admins have applications switched off, the apply button gives way to
// a closed notice.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/ui'
import { ROUTES } from '@/lib/routes'
import { productHref } from '@/lib/catalog'
import type { Product } from '@/lib/constants'
import { BRANDS, type Brand } from '@/components/home/brands'
import BrandGlyph from '@/components/home/BrandGlyph'
import s from './PartnerPromo.module.css'

const PARTNER_STEPS = [
  ['Apply', 'Tell us about you or your business. We review every application.'],
  ['Share your link', 'Send it to friends, followers or customers, for the whole shop or one product.'],
  ['Earn commission', 'When someone buys through your link, you earn commission on the sale.'],
]

// Made-up codes for the link field. A real one is the partner's store name.
const CODES = ['YOURNAME', 'ADA-GADGETS', 'TUNDE-TECH', 'CHIOMA-TV']

type Chip = { path: string; brand?: Brand }

// The fourth row shows on tall desktop screens only (PartnerPromo.module.css).
const ROWS = 4
// Chips per row before the loop's copy, so a short catalog still spans a wide screen.
const MIN_PER_ROW = 10

/** One shop link per brand the catalog sells, dealt across the rows. */
function useLinkRows(products: Product[]): Chip[][] {
  return useMemo(() => {
    const chips: Chip[] = []
    for (const b of BRANDS) {
      const name = b.name.toLowerCase()
      const hit = products.find(p => String(p.domain || '').toLowerCase() === b.domain)
        || products.find(p => p.name.toLowerCase().startsWith(name))
      if (hit?.slug) chips.push({ path: productHref(hit), brand: b })
    }
    if (!chips.length) return []
    chips.splice(Math.min(2, chips.length), 0, { path: ROUTES.shop })
    const rows: Chip[][] = Array.from({ length: ROWS }, () => [])
    chips.forEach((c, i) => rows[i % ROWS].push(c))
    return rows.map((row, n) => {
      // A row the catalog left empty borrows the others' chips, offset so
      // neighbouring rows don't line up.
      const base = row.length ? row : [...chips.slice(n), ...chips.slice(0, n)]
      const out: Chip[] = []
      while (out.length < MIN_PER_ROW) out.push(...base)
      return out
    })
  }, [products])
}

function LinkChip({ c }: { c: Chip }) {
  return (
    <span className={s.chip}>
      {c.brand
        ? <span className={s.tile} style={{ background: c.brand.hex }}><BrandGlyph b={c.brand} /></span>
        // eslint-disable-next-line @next/next/no-img-element
        : <span className={`${s.tile} ${s.tileOwn}`}><img src="/brand/logomark-tint.svg" alt="" /></span>}
      <span className={s.chipPath}>{c.path}<b>?ref=YOU</b></span>
    </span>
  )
}

/** The code in the link field. It changes every few seconds, unless the visitor asked for less motion. */
function useCode() {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = window.setInterval(() => setI(n => (n + 1) % CODES.length), 2800)
    return () => window.clearInterval(t)
  }, [])
  return CODES[i]
}

export default function PartnerPromo({ headingLevel = 'h2', open = true, products = [] }: { headingLevel?: 'h1' | 'h2'; open?: boolean; products?: Product[] }) {
  const Heading = headingLevel
  const rows = useLinkRows(products)
  const code = useCode()
  return (
    <section className={s.hero} aria-labelledby="partner-title">
      <div className={s.top}>
        <Heading id="partner-title" className={s.title}>Earn on every subscription you refer</Heading>
        <div className={s.aside}>
          <p className={s.lede}>
            {open ? 'Join the BuySub partner programme and get a link of your own.' : 'We’re not taking new partner applications at the moment. Please check back soon.'}
          </p>
          <div className={s.btns}>
            {open && <Link href={ROUTES.partner.apply} className={s.btn}>Become a partner <Icon name="arrowRight" size={18} /></Link>}
            <Link href={ROUTES.loginNext(ROUTES.partner.home)} className={open ? s.btnLine : s.btn}>Partner sign in</Link>
          </div>
        </div>
      </div>

      <div className={s.wall} aria-hidden="true">
        <div className={s.wallTilt}>
          <div className={`${s.rows} ${rows.length ? s.rowsOn : ''}`}>
            {rows.map((row, n) => (
              <div key={n} className={`${s.run} ${n % 2 ? s.runReverse : ''}`}>
                {/* Two copies so the loop is seamless. */}
                {row.map((c, k) => <LinkChip key={k} c={c} />)}
                <span className={s.runCopy}>{row.map((c, k) => <LinkChip key={k} c={c} />)}</span>
              </div>
            ))}
          </div>
          <div className={s.field}>
            <span className={s.fieldLabel}>Your link</span>
            <span className={s.fieldUrl}>app.buysub.ng/shop?ref=<b key={code} className={s.code}>{code}</b></span>
            <Icon name="copy" size={18} />
          </div>
        </div>
      </div>

      <ol className={s.steps}>
        {PARTNER_STEPS.map(([t, b], i) => (
          <li key={t} className={s.step}>
            <span className={s.num}>{String(i + 1).padStart(2, '0')}</span>
            <strong className={s.stepTitle}>{t}</strong>
            <span className={s.stepBody}>{b}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
