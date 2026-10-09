// ============================================================
// BUYSUB — Partner promo
// ============================================================
// The partner section that used to close the home page; it now opens the
// partner landing page (/partners, components/partner/PartnersLanding.tsx).
// While admins have applications switched off, the apply button gives way to
// a closed notice.

import { ButtonLink, Icon } from '@/components/ui'
import { ROUTES } from '@/lib/routes'
import s from './PartnerPromo.module.css'

const PARTNER_STEPS = [
  ['Apply', 'Tell us about you or your business. We review every application.'],
  ['Share your link', 'Send it to friends, followers or customers, for the whole shop or one product.'],
  ['Earn commission', 'When someone buys through your link, you earn commission on the sale.'],
]

export default function PartnerPromo({ headingLevel = 'h2', open = true, className }: { headingLevel?: 'h1' | 'h2'; open?: boolean; className?: string }) {
  const Heading = headingLevel
  return (
    <section className={`${s.partner} ${className ?? ''}`} aria-labelledby="partner-title">
      <div className={s.partnerCard}>
        <div className={s.partnerMain}>
          <Heading id="partner-title" className={s.partnerTitle}>Earn on every subscription you refer</Heading>
          <p className={s.partnerText}>
            {open ? 'Join the BuySub partner programme and get a link of your own.' : 'We’re not taking new partner applications at the moment. Please check back soon.'}
          </p>
          <div className={s.partnerBtns}>
            {open && <ButtonLink href={ROUTES.partner.apply} size="xl" iconRight="arrowRight">Become a partner</ButtonLink>}
            <ButtonLink href={ROUTES.loginNext(ROUTES.partner.home)} size="xl" variant="secondary">Partner sign in</ButtonLink>
          </div>
        </div>
        <div className={s.partnerSide}>
          <div className={s.refLink} aria-hidden="true">
            <span className={s.refLabel}>Your link</span>
            <span className={s.refUrl}>app.buysub.ng/shop?ref=<b>YOURNAME</b></span>
            <Icon name="copy" size={16} />
          </div>
          <ol className={s.pSteps}>
            {PARTNER_STEPS.map(([t, b], i) => (
              <li key={t} className={s.pStep}>
                <span className={s.num}>{String(i + 1).padStart(2, '0')}</span>
                <span><strong className={s.pStepTitle}>{t}</strong><span className={s.pStepBody}>{b}</span></span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
