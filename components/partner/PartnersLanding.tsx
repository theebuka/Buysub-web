'use client'

// ============================================================
// BUYSUB — Partner programme landing page (/partners)
// ============================================================
// Opens with the partner section that used to close the home page
// (PartnerPromo), then what partners get, questions, and a closing call to
// action. The application form itself is /partners/apply.
//
// Copy states only what the programme does today (see the terms in
// app/partners/apply/page.tsx): the rate is set at approval, 30-day
// referrals, payouts on the partner's chosen schedule by bank or crypto,
// commission forfeited on refunds. No partner counts or earnings claims.
// Shares the home page's display styles (home.module.css).

import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui'
import { useSiteStatus } from '@/lib/siteStatus'
import { ROUTES } from '@/lib/routes'
import PartnerPromo from './PartnerPromo'
import h from '@/components/home/home.module.css'
import s from './PartnersLanding.module.css'

/* ── Benefit visuals: small pieces of the partner portal ─────────── */

function LinkVisual() {
  return (
    <div className={s.stack}>
      <div className={h.tabs} style={{ '--n': 3, '--i': 1 } as React.CSSProperties}>
        <span className={h.tabInd} />
        {['Shop', 'Product', 'Category'].map((t, i) => <span key={t} className={`${h.tab} ${i === 1 ? h.tabOn : ''}`}>{t}</span>)}
      </div>
      <span className={h.field}><span className={h.fieldText} style={{ letterSpacing: 0, color: 'var(--bs-text-primary)' }}>Netflix Premium</span><Icon name="chevronDown" size={14} /></span>
      <span className={s.linkOut}><span className={s.linkUrl}>…/shop/netflix-premium?ref=<b>YOU</b></span><Icon name="copy" size={14} /></span>
    </div>
  )
}

// An illustrative shape, not data.
const BARS = [5, 8, 6, 9, 12, 7, 5, 7, 11, 15, 13, 9, 6, 8, 16, 19, 14, 10, 8, 12, 17, 21, 15, 11, 9, 13, 18, 22, 17, 20]

function ClicksVisual() {
  return (
    <div className={s.stack}>
      <span className={s.chartLabel}>Clicks, last 30 days</span>
      <div className={s.bars}>{BARS.map((v, i) => <span key={i} style={{ height: `${(v / 22) * 100}%` }} className={i === BARS.length - 1 ? s.barOn : undefined} />)}</div>
      <span className={s.axis}><span>30 days ago</span><span>Today</span></span>
    </div>
  )
}

const WAYS: { icon: IconName; label: string }[] = [{ icon: 'wallet', label: 'Bank transfer' }, { icon: 'link', label: 'Crypto wallet' }]

function PayoutVisual() {
  return (
    <div className={s.stack}>
      <div className={s.chips}>
        {['Monthly', 'Quarterly', 'Biannual', 'Annual'].map((f, i) => <span key={f} className={`${s.chip} ${i === 0 ? s.chipOn : ''}`}>{f}</span>)}
      </div>
      <ul className={h.vList}>
        {WAYS.map(w => <li key={w.label} className={h.vRow}><Icon name={w.icon} size={16} /><span className={h.vName}>{w.label}</span></li>)}
      </ul>
    </div>
  )
}

const BENEFITS = [
  { title: 'A link for anything', body: 'Share the whole shop, one category or a single product. Every link carries your code.', visual: <LinkVisual /> },
  { title: 'See what your links do', body: 'Clicks, orders and commission in your partner portal, with a 30-day chart.', visual: <ClicksVisual /> },
  { title: 'Paid on your schedule', body: 'Monthly, quarterly, every six months or yearly, by bank transfer or to a crypto wallet.', visual: <PayoutVisual /> },
]

const FAQS = [
  ['Who can become a partner?', 'Gadget stores, other businesses and creators whose customers or followers buy subscriptions. CAC registration is optional. You apply with your store name, your contact details and where you sell. If you already shop on BuySub, sign in first and apply with that account.'],
  ['How much commission do I earn?', 'Your rate is set when your application is approved, and it shows in your partner portal. BuySub may revise rates with 30 days’ notice.'],
  ['How long does a referral count?', '30 days. When someone opens your link, orders they place on that device in the next 30 days count toward your commission.'],
  ['When and how am I paid?', 'On the schedule you choose in the partner portal after approval: monthly, quarterly, every six months or yearly. Payouts go to your bank account or a crypto wallet, once you’ve added it there.'],
  ['What happens if an order is refunded?', 'Commission on an order that is refunded or reversed is forfeited.'],
  ['Where can I share my link?', 'Anywhere: WhatsApp, social media, email or your own website. Your portal has a WhatsApp share button for every link.'],
]

export default function PartnersLanding() {
  const status = useSiteStatus()
  // Until /v2/status answers, applications count as open (lib/siteStatus.ts).
  const open = status.services.partner_applications

  return (
    <div className={h.home}>
      <PartnerPromo headingLevel="h1" open={open} className={s.top} />

      <section className={h.band} aria-labelledby="benefits-title">
        <div className={h.head}><h2 id="benefits-title" className={h.h2}>What partners get</h2></div>
        <ol className={h.steps}>
          {BENEFITS.map((b, i) => (
            <li key={b.title} className={h.step}>
              <div className={h.visual} aria-hidden="true">{b.visual}</div>
              <span className={h.num}>{String(i + 1).padStart(2, '0')}</span>
              <h3 className={h.stepTitle}>{b.title}</h3>
              <p className={h.stepBody}>{b.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${h.band} ${h.faqBand}`} aria-labelledby="faq-title">
        <div className={h.faqHead}>
          <h2 id="faq-title" className={h.h2}>Questions</h2>
          <p className={h.faqNote}>Anything else? <Link href={ROUTES.help} className={h.textLink}>Visit the help centre</Link></p>
        </div>
        <div className={h.faqs}>
          {FAQS.map(([q, a]) => (
            <details key={q} className={h.faq}>
              <summary className={h.q}>{q}<Icon name="plus" size={18} /></summary>
              <p className={h.a}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={h.closer} aria-labelledby="partner-closer-title">
        <div className={`${h.closerCard} ${s.closerCard}`}>
          <div className={h.closerMain}>
            <h2 id="partner-closer-title" className={h.closerTitle}>{open ? 'Start earning with your own link' : 'Applications are closed for now'}</h2>
            <p className={h.closerText}>{open ? 'Apply in four short steps. We review every application; once you’re approved, you sign in to your partner portal.' : 'Already a partner? Sign in to your portal.'}</p>
            <div className={h.closerBtns}>
              {open && <Link href={ROUTES.partner.apply} className={h.closerBtn}>Apply now <Icon name="arrowRight" size={18} /></Link>}
              <Link href={ROUTES.loginNext(ROUTES.partner.home)} className={open ? h.closerGhost : h.closerBtn}>Partner sign in</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
