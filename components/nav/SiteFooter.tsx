'use client'

// ============================================================
// BUYSUB — Site footer
// ============================================================
// Replaces components/Footer.tsx, whose three links all pointed at buysub.ng
// paths: /privacy and /faqs return 404 there (the real pages are
// /privacy-policy and /#faq). Legal and company pages still live on the Framer
// site until the in-app landing pages exist; see EXTERNAL in lib/routes.ts.

import Link from 'next/link'
import { Icon } from '@/components/ui'
import { Logo } from './SiteHeader'
import { ROUTES, EXTERNAL } from '@/lib/routes'
import css from './nav.module.css'

type L = { label: string; href?: string; onClick?: () => void; external?: boolean }

const COLUMNS: { title: string; links: L[] }[] = [
  {
    title: 'Shop',
    links: [
      { label: 'All products', href: ROUTES.shop },
      { label: 'Video streaming', href: ROUTES.shopCategory('video streaming') },
      { label: 'Music streaming', href: ROUTES.shopCategory('music streaming') },
      { label: 'AI tools', href: ROUTES.shopCategory('ai') },
      { label: 'Productivity', href: ROUTES.shopCategory('productivity') },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', href: ROUTES.login },
      { label: 'Create an account', href: ROUTES.signup },
      { label: 'Orders', href: ROUTES.account.orders },
      { label: 'Wallet', href: ROUTES.account.wallet },
      { label: 'Saved', href: ROUTES.saved },
    ],
  },
  {
    title: 'Earn',
    links: [
      { label: 'Partner programme', href: ROUTES.partner.programme },
      { label: 'Partner sign in', href: ROUTES.loginNext(ROUTES.partner.home) },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help centre', href: ROUTES.help },
      { label: 'FAQs', href: EXTERNAL.faq, external: true },
      { label: 'Contact us', href: EXTERNAL.contact, external: true },
      { label: 'Privacy policy', href: EXTERNAL.privacy, external: true },
    ],
  },
]

function FooterLink({ l }: { l: L }) {
  if (l.onClick) return <button type="button" className={css.footerLink} onClick={l.onClick}>{l.label}</button>
  if (l.external) {
    return (
      <a className={css.footerLink} href={l.href} target="_blank" rel="noopener noreferrer">
        {l.label} <Icon name="external" size={12} />
      </a>
    )
  }
  return <Link className={css.footerLink} href={l.href!}>{l.label}</Link>
}

export default function SiteFooter() {
  return (
    <footer className={css.footer}>
      <div className={css.footerInner}>
        <div className={css.footerTop}>
          <div className={css.footerBrand}>
            <Logo />
            <p className={css.footerBlurb}>
              Digital subscriptions at Naira prices. Streaming, AI, productivity and more, paid by card,
              bank transfer or WhatsApp order.
            </p>
          </div>
          {COLUMNS.map(c => (
            <nav key={c.title} className={css.footerCol} aria-label={c.title}>
              <h3>{c.title}</h3>
              <ul>{c.links.map(l => <li key={l.label}><FooterLink l={l} /></li>)}</ul>
            </nav>
          ))}
        </div>
        <div className={css.footerBottom}>
          <span>© {new Date().getFullYear()} BuySub. All rights reserved.</span>
          <div className={css.payChips} aria-label="Ways to pay">
            <span className={css.payChip}><Icon name="lock" size={12} /> Secured by Paystack</span>
            <span className={css.payChip}><Icon name="card" size={12} /> Cards & transfer</span>
            <span className={css.payChip}><Icon name="message" size={12} /> WhatsApp orders</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
