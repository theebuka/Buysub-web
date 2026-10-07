'use client'

// Builds a referral link to any page: the home page, the whole shop, a
// category or a single product. Every link carries ?ref=CODE, which
// useReferral records on arrival (home, catalog and product pages all read it).

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button, ButtonLink, CopyField, Field, Input, ProductLogo, Select, Skeleton, copyText } from '@/components/ui'
import { useProducts } from '@/lib/useProducts'
import { getCategoryList, isInStock, norm, TAB_ORDER, type Product } from '@/lib/constants'
import { categoryHref, isOneTime, productHref } from '@/lib/catalog'
import { fromPrice } from '@/lib/pricing'
import { categoryLabel, fmtNGN } from '@/lib/format'
import c from './share.module.css'
import { PageHead } from '@/components/account/AccountShell'
import { usePartner, referralLink } from './usePartner'
import s from '@/components/account/account.module.css'

type Kind = 'shop' | 'home' | 'category' | 'product'

// A product as it looks in the shop, with the partner's link and what one
// sale of its cheapest plan would earn them.
function ShareCard({ p, code, rate }: { p: Product; code: string; rate: number | null }) {
  const url = referralLink(code, productHref(p))
  const fp = fromPrice(p)
  const cat = getCategoryList(p)[0]
  const earn = fp && rate ? Math.floor(fp.price * rate / 100) : null
  const wa = `https://wa.me/?text=${encodeURIComponent(`${p.name} on BuySub: ${url}`)}`
  const copy = async () => { if (await copyText(url)) toast.success(`Link to ${p.name} copied`); else toast.error('Couldn’t copy the link') }
  return (
    <article className={c.card}>
      <div className={c.top}>
        <ProductLogo product={p} size={40} />
        <div className={c.head}>
          <h3 className={c.name} title={p.name}>{p.name}</h3>
          {cat && <span className={c.cat}>{categoryLabel(cat)}</span>}
        </div>
      </div>
      <div className={c.figures}>
        <div><span className={c.k}>{isOneTime(p) ? 'Price' : 'From'}</span><span className={c.v}>{fp ? fmtNGN(fp.price) : '–'}</span></div>
        <div><span className={c.k}>You earn</span><span className={c.v}>{earn != null ? `~${fmtNGN(earn)}` : '–'}</span></div>
      </div>
      <div className={c.actions}>
        <Button variant="secondary" size="md" icon="copy" onClick={copy} full>Copy link</Button>
        <ButtonLink href={wa} external variant="ghost" size="md" aria-label={`Share ${p.name} on WhatsApp`}>Share</ButtonLink>
      </div>
    </article>
  )
}

function ShareGrid({ code, rate }: { code: string; rate: number | null }) {
  const { products, loading } = useProducts()
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean)
    return products
      .filter(p => isInStock(p.stock_status) && fromPrice(p))
      .filter(p => !words.length || words.every(w => norm(`${p.name} ${getCategoryList(p).join(' ')}`).includes(w)))
      .sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || (b.sold_count ?? 0) - (a.sold_count ?? 0) || a.name.localeCompare(b.name))
  }, [products, q])
  return (
    <section className={s.section}>
      <div className={s.sectionHead} style={{ alignItems: 'center' }}>
        <h2 className={s.h2}>Products to share</h2>
        <div style={{ width: 260, maxWidth: '50%' }}><Input icon="search" fieldSize="md" placeholder="Find a product" aria-label="Find a product" value={q} onChange={e => setQ(e.target.value)} /></div>
      </div>
      {loading ? (
        <div className={c.grid}>{[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} height={184} radius="var(--bs-radius-xl)" />)}</div>
      ) : list.length === 0 ? (
        <p className={s.muted}>No products match “{q}”.</p>
      ) : (
        <div className={c.grid}>{list.slice(0, 24).map(p => <ShareCard key={p.id} p={p} code={code} rate={rate} />)}</div>
      )}
      {rate != null && <p className={s.muted}>Estimates use the cheapest plan at your {rate}% rate. Longer plans earn more.</p>}
    </section>
  )
}

export default function PartnerLinks() {
  const { affiliate } = usePartner()
  const { products, loading } = useProducts()
  const [kind, setKind] = useState<Kind>('shop')
  const [category, setCategory] = useState('')
  const [product, setProduct] = useState('')

  const cats = useMemo(() => {
    const found = new Set(products.flatMap(getCategoryList))
    return [...TAB_ORDER.filter(c => c !== 'all' && found.has(c)), ...Array.from(found).filter(c => !TAB_ORDER.includes(c)).sort()]
  }, [products])
  const grouped = useMemo(() => cats.map(c => ({
    c, items: products.filter(p => getCategoryList(p)[0] === c && isInStock(p.stock_status)).sort((a, b) => a.name.localeCompare(b.name)),
  })).filter(g => g.items.length), [cats, products])

  if (!affiliate) return null
  const code = affiliate.referral_code
  const path =
    kind === 'home' ? '/'
    : kind === 'category' && category ? categoryHref(category)
    : kind === 'product' && product ? productHref({ slug: product })
    : '/shop'
  const url = referralLink(code, path)
  const label = kind === 'product' ? products.find(p => p.slug === product)?.name : kind === 'category' && category ? `${categoryLabel(category)} on BuySub` : 'BuySub'
  const wa = `https://wa.me/?text=${encodeURIComponent(`${label ? `${label}: ` : ''}${url}`)}`

  return (
    <>
      <PageHead title="Referral links" lede="Send people straight to what they want. Every link here carries your code." />
      <div className={`${s.panel} ${s.panelPad}`} style={{ display: 'grid', gap: 'var(--bs-space-5)' }}>
        <div style={{ display: 'grid', gap: 'var(--bs-space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <Field label="Link to">
            {p => (
              <Select {...p} value={kind} onChange={e => setKind(e.target.value as Kind)}>
                <option value="shop">The shop</option>
                <option value="home">The home page</option>
                <option value="category">A category</option>
                <option value="product">A product</option>
              </Select>
            )}
          </Field>
          {kind === 'category' && (
            <Field label="Category">
              {p => (
                <Select {...p} value={category} onChange={e => setCategory(e.target.value)} disabled={loading}>
                  <option value="">{loading ? 'Loading…' : 'Choose a category'}</option>
                  {cats.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                </Select>
              )}
            </Field>
          )}
          {kind === 'product' && (
            <Field label="Product" hint="Only products in stock are listed.">
              {p => (
                <Select {...p} value={product} onChange={e => setProduct(e.target.value)} disabled={loading}>
                  <option value="">{loading ? 'Loading…' : 'Choose a product'}</option>
                  {grouped.map(g => (
                    <optgroup key={g.c} label={categoryLabel(g.c)}>
                      {g.items.map(x => <option key={x.id} value={x.slug}>{x.name}</option>)}
                    </optgroup>
                  ))}
                </Select>
              )}
            </Field>
          )}
        </div>
        <div style={{ display: 'grid', gap: 'var(--bs-space-2)' }}>
          <span className={s.statLabel}>Your link</span>
          <div style={{ display: 'flex', gap: 'var(--bs-space-2)', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 320px', minWidth: 0 }}><CopyField value={url} label="Copy link" /></div>
            <ButtonLink href={wa} external variant="secondary">Share on WhatsApp</ButtonLink>
            <ButtonLink href={url} external variant="ghost">Open</ButtonLink>
          </div>
        </div>
      </div>
      <ShareGrid code={code} rate={affiliate.commission_rate ?? null} />
      <section className={s.section}>
        <h2 className={s.h2}>How referrals are counted</h2>
        <div className={`${s.panel} ${s.panelPad}`}>
          <ul style={{ listStyle: 'disc', paddingLeft: 'var(--bs-space-5)', display: 'grid', gap: 'var(--bs-space-2)' }} className={s.secondary}>
            <li>Someone opens your link and we remember your code on their device for 30 days.</li>
            <li>Any order they place in that time is credited to you, even if they come back without the link.</li>
            <li>Commission is recorded when the order is paid. It shows as pending while BuySub reviews it, and as paid once it has been sent to you.</li>
            <li>If they open another partner’s link later, that partner’s code replaces yours.</li>
          </ul>
        </div>
      </section>
    </>
  )
}
