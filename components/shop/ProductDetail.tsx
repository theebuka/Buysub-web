'use client'

// Product content shared by the quick view and the full page.

import Link from 'next/link'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { Badge, Button, Icon, ProductLogo, type IconName } from '@/components/ui'
import { getCategoryList, isInStock, type Product } from '@/lib/constants'
import { categoryHref, faqs, features, howItWorks, productHref, TRUST_POINTS } from '@/lib/catalog'
import { categoryLabel } from '@/lib/format'
import { useSession, loadPartner } from '@/lib/useSession'
import { copyText } from '@/components/ui'
import s from './shop.module.css'

export function ProductHero({ product: p, headingId, as = 'h1' }: { product: Product; headingId?: string; as?: 'h1' | 'h2' }) {
  const H = as
  const cats = getCategoryList(p)
  return (
    <div className={s.hero}>
      <ProductLogo product={p} size={72} radius="var(--bs-radius-xl)" />
      <div style={{ minWidth: 0 }}>
        <H id={headingId} className={s.heroName}>{p.name}</H>
        {(p.short_description || p.category_tagline) && <p className={s.heroTag}>{p.short_description || p.category_tagline}</p>}
        <div className={s.heroMeta}>
          {p.badge && <Badge tone="info">{p.badge}</Badge>}
          {isInStock(p.stock_status) ? <Badge tone="success" dot>In stock</Badge> : <Badge tone="error" dot>Out of stock</Badge>}
          {p.billing_type === 'one_time' && <span className={s.metaChip}>One-time purchase</span>}
          {cats.map(c => <Link key={c} href={categoryHref(c)} className={s.metaChip}><Icon name="grid" size={12} /> {categoryLabel(c)}</Link>)}
        </div>
      </div>
    </div>
  )
}

export function Features({ product }: { product: Product }) {
  const list = features(product)
  if (!list.length) return null
  return (
    <section className={s.section}>
      <h2 className={s.sectionTitle}>What you get</h2>
      <ul className={s.checks}>{list.map((f, i) => <li key={i}><Icon name="check" size={16} />{f}</li>)}</ul>
    </section>
  )
}

export function Description({ product }: { product: Product }) {
  if (!product.description || product.description === product.short_description) return null
  return (
    <section className={s.section}>
      <h2 className={s.sectionTitle}>About {product.name}</h2>
      <p className={s.prose}>{product.description}</p>
    </section>
  )
}

export function HowItWorks({ product }: { product: Product }) {
  return (
    <section className={s.section}>
      <h2 className={s.sectionTitle}>How it works</h2>
      <ol className={s.steps}>{howItWorks(product).map((step, i) => <li key={i}>{step}</li>)}</ol>
    </section>
  )
}

export function Faqs({ product }: { product: Product }) {
  const list = faqs(product)
  if (!list.length) return null
  return (
    <section className={s.section}>
      <h2 className={s.sectionTitle}>Questions</h2>
      <div className={s.faq}>
        {list.map((f, i) => (
          <details key={i}>
            <summary>{f.q}<Icon name="chevronDown" size={16} /></summary>
            <div className={s.faqA}>{f.a}</div>
          </details>
        ))}
      </div>
    </section>
  )
}

export function Trust() {
  return (
    <div className={s.trust}>
      {TRUST_POINTS.map(t => (
        <div key={t.title} className={s.trustItem}>
          <Icon name={t.icon as IconName} size={20} />
          <div><div className={s.trustTitle}>{t.title}</div><div className={s.trustText}>{t.text}</div></div>
        </div>
      ))}
    </div>
  )
}

/** Share or copy the product link. Partners share it with their referral code. */
export function ShareButton({ product }: { product: Product }) {
  const session = useSession()
  useEffect(() => { if (session.status === 'signed_in') loadPartner() }, [session.status])
  const code = session.partner && session.partner.referral_code
  const share = async () => {
    const url = `${window.location.origin}${productHref(product)}${code ? `?ref=${encodeURIComponent(code)}` : ''}`
    if (navigator.share) {
      try { await navigator.share({ title: product.name, url }); return } catch { /* cancelled: fall back to copy */ }
    }
    if (await copyText(url)) toast.success(code ? 'Your referral link is copied' : 'Link copied')
    else toast.error('Couldn’t copy the link')
  }
  return <Button variant="ghost" size="md" icon="link" onClick={share}>{code ? 'Share & earn' : 'Share'}</Button>
}
