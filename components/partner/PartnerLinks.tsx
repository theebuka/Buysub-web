'use client'

// Builds a referral link to any page: the home page, the whole shop, a
// category or a single product. Every link carries ?ref=CODE, which
// useReferral records on arrival (home, catalog and product pages all read it).

import { useMemo, useState } from 'react'
import { ButtonLink, CopyField, Field, Select } from '@/components/ui'
import { useProducts } from '@/lib/useProducts'
import { getCategoryList, isInStock, TAB_ORDER } from '@/lib/constants'
import { categoryHref, productHref } from '@/lib/catalog'
import { categoryLabel } from '@/lib/format'
import { PageHead } from '@/components/account/AccountShell'
import { usePartner, referralLink } from './usePartner'
import s from '@/components/account/account.module.css'

type Kind = 'shop' | 'home' | 'category' | 'product'

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
