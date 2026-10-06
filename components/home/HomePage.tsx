'use client'

// ============================================================
// BUYSUB — Home (/)
// ============================================================
// Hero with search, trust strip, category explorer, popular products, how it
// works and the partner promo. Product data is the shared catalog cache, so
// moving on to /shop costs no second request. Copy makes no promises the
// business hasn't made (no delivery times, no guarantees).

import Link from 'next/link'
import { useMemo } from 'react'
import { ButtonLink, Icon, ProductLogo, Skeleton, type IconName } from '@/components/ui'
import { ProductCard, ProductCardSkeleton } from '@/components/shop/ProductCard'
import { useProducts } from '@/lib/useProducts'
import { useReferral } from '@/lib/useReferral'
import { getCategoryList, isInStock, TAB_ORDER, type Product } from '@/lib/constants'
import { fromPrice } from '@/lib/pricing'
import { categoryHref } from '@/lib/catalog'
import { categoryLabel } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { shop } from '@/lib/shopBus'
import s from './home.module.css'

const TRUST: { icon: IconName; title: string; text: string }[] = [
  { icon: 'tag', title: 'Naira prices', text: 'No dollar card needed' },
  { icon: 'lock', title: 'Secure checkout', text: 'Cards and transfer via Paystack' },
  { icon: 'message', title: 'Human support', text: 'Talk to us on WhatsApp' },
  { icon: 'receipt', title: 'Order tracking', text: 'Every order in your account' },
]

const STEPS = [
  { icon: 'search' as IconName, title: 'Find it', text: 'Search or browse streaming, AI, productivity, gaming and more.' },
  { icon: 'card' as IconName, title: 'Pay in Naira', text: 'Check out with Paystack, or place the order on WhatsApp.' },
  { icon: 'zap' as IconName, title: 'Get access', text: 'We set up your subscription and send your details.' },
]

function useHomeData(products: Product[]) {
  return useMemo(() => {
    const byCat: Record<string, Product[]> = {}
    for (const p of products) for (const c of getCategoryList(p)) (byCat[c] ||= []).push(p)
    const cats = [...TAB_ORDER.filter(c => c !== 'all' && byCat[c]), ...Object.keys(byCat).filter(c => !TAB_ORDER.includes(c))]
      .map(c => ({ key: c, items: byCat[c] }))
    const sellable = products.filter(p => isInStock(p.stock_status) && fromPrice(p))
    const popular = [...sellable]
      .sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .slice(0, 8)
    return { cats, popular, count: sellable.length }
  }, [products])
}

export default function HomePage() {
  useReferral() // records ?ref= from partner links to the home page
  const { products, loading } = useProducts()
  const { cats, popular, count } = useHomeData(products)

  return (
    <div className={s.home}>
      <section className={s.hero}>
        <div className={s.heroGlow} aria-hidden="true" />
        <p className={s.eyebrow}><Icon name="sparkles" size={14} /> Digital subscriptions, paid in Naira</p>
        <h1 className={s.heroTitle}>Every subscription you use, <span>in one place.</span></h1>
        <p className={s.heroText}>
          Streaming, AI tools, productivity apps, games and more. Pay in Naira with Paystack or order on WhatsApp.
        </p>
        <button type="button" className={s.heroSearch} onClick={() => shop.openSearch()}>
          <Icon name="search" size={18} />
          <span>Search Netflix, Spotify, ChatGPT…</span>
          <kbd className={s.kbd}>/</kbd>
        </button>
        <div className={s.heroChips}>
          {loading
            ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} width={110} height={36} radius="var(--bs-radius-full)" />)
            : cats.slice(0, 6).map(c => (
                <Link key={c.key} href={categoryHref(c.key)} className={s.heroChip}>{categoryLabel(c.key)}</Link>
              ))}
        </div>
      </section>

      <section className={s.trust} aria-label="Why BuySub">
        {TRUST.map(t => (
          <div key={t.title} className={s.trustItem}>
            <span className={s.trustIcon}><Icon name={t.icon} size={18} /></span>
            <span><b>{t.title}</b><br /><span className={s.muted}>{t.text}</span></span>
          </div>
        ))}
      </section>

      <section className={s.section}>
        <div className={s.sectionHead}>
          <h2 className={s.sectionTitle}>Browse by category</h2>
          <Link href={ROUTES.shop} className={s.more}>All {count ? `${count} ` : ''}products <Icon name="arrowRight" size={14} /></Link>
        </div>
        <div className={s.cats}>
          {loading
            ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} height={112} radius="var(--bs-radius-xl)" />)
            : cats.map(c => (
                <Link key={c.key} href={categoryHref(c.key)} className={s.cat}>
                  <span className={s.catLogos}>
                    {c.items.slice(0, 3).map(p => <ProductLogo key={p.id} product={p} size={32} radius="var(--bs-radius-md)" />)}
                  </span>
                  <span className={s.catName}>{categoryLabel(c.key)}</span>
                  <span className={s.muted}>{c.items.length} product{c.items.length === 1 ? '' : 's'}</span>
                </Link>
              ))}
        </div>
      </section>

      <section className={s.section}>
        <div className={s.sectionHead}>
          <h2 className={s.sectionTitle}>Popular right now</h2>
          <Link href={ROUTES.shop} className={s.more}>See all <Icon name="arrowRight" size={14} /></Link>
        </div>
        <div className={s.grid}>
          {loading
            ? Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)
            : popular.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      <section className={s.section}>
        <h2 className={s.sectionTitle}>How it works</h2>
        <ol className={s.steps}>
          {STEPS.map((st, i) => (
            <li key={st.title} className={s.step}>
              <span className={s.stepIcon}><Icon name={st.icon} size={20} /></span>
              <span className={s.stepNum}>Step {i + 1}</span>
              <b className={s.stepTitle}>{st.title}</b>
              <span className={s.muted}>{st.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={s.promo}>
        <div>
          <p className={s.promoEyebrow}>BuySub Partners</p>
          <h2 className={s.promoTitle}>Earn on every subscription you refer</h2>
          <p className={s.promoText}>Share your link with friends, followers or customers. When they buy, you earn commission.</p>
        </div>
        <div className={s.promoBtns}>
          <ButtonLink href={ROUTES.partner.apply} size="xl" iconRight="arrowRight">Become a partner</ButtonLink>
          <ButtonLink href={ROUTES.loginAs('partner')} size="xl" variant="ghost" className={s.promoGhost}>Partner sign in</ButtonLink>
        </div>
      </section>
    </div>
  )
}
