'use client'

// Product editor, shown in a side panel from /admin/products for both create
// and edit. Sections follow what a product is: listing, prices, availability,
// product page (migration 07) and after purchase.

import { useState } from 'react'
import { Button, SegmentedControl, Textarea } from '@/components/ui'
import { AreaField, FormSection, SelectField, SidePanel, SwitchRow, TextField } from '@/components/admin/AdminForm'
import { adminStyles as s } from '@/components/admin/AdminUI'
import { ALL_CATEGORIES, sentenceCase } from '../_lib/shared'

export type ProductFormState = Record<string, any>

const CATEGORY_OPTIONS = [{ value: '', label: 'Choose a category' }, ...ALL_CATEGORIES.filter(c => c !== 'all').map(c => ({ value: c, label: sentenceCase(c) }))]
const PRICE_FIELDS: [string, string][] = [['price_1m', '1 month'], ['price_3m', '3 months'], ['price_6m', '6 months'], ['price_1y', '1 year']]

export const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** "How it works" as numbered steps (one per line, stored one per entry) or
 *  as paragraphs (stored as a single entry; lib/catalog howItWorksProse). */
function HowItWorksField({ value, onChange }: { value: unknown; onChange: (v: string[]) => void }) {
  const list: string[] = Array.isArray(value) ? value : []
  const [mode, setMode] = useState<'steps' | 'prose'>(() => list.filter(Boolean).length === 1 ? 'prose' : 'steps')
  const text = mode === 'prose' ? list.join('\n\n') : list.join('\n')
  const write = (v: string, m = mode) => onChange(m === 'prose' ? (v.trim() ? [v] : []) : v.split('\n'))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bs-space-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--bs-space-2)' }}>
        <span style={{ fontSize: 'var(--bs-text-xs)', fontWeight: 'var(--bs-weight-semibold)' as any, color: 'var(--bs-text-secondary)' }}>How it works</span>
        <SegmentedControl label="How it works format" value={mode}
          options={[{ value: 'steps', label: 'Steps' }, { value: 'prose', label: 'Paragraphs' }]}
          onChange={m => { setMode(m); write(text, m) }} />
      </div>
      <Textarea rows={5} aria-label="How it works" value={text} onChange={e => write(e.target.value)}
        placeholder={mode === 'prose' ? 'Describe what the subscription includes and how access works. Leave a blank line between paragraphs.' : 'One step per line'} />
      <p className={s.hint}>{mode === 'prose' ? 'Shown as paragraphs. Leave a blank line between them.' : 'One step per line, shown numbered. Blank uses the standard steps.'}</p>
    </div>
  )
}

/** Volume discounts (migration 19): buy min_qty or more on one line, get
 *  percent off that line. Cleaned the same way on save by the API. */
function VolumeTiersField({ value, onChange }: { value: unknown; onChange: (v: { min_qty: number | string; percent: number | string }[]) => void }) {
  const tiers: { min_qty: number | string; percent: number | string }[] = Array.isArray(value) ? value : []
  const setTier = (i: number, k: 'min_qty' | 'percent', v: string) => onChange(tiers.map((t, j) => j === i ? { ...t, [k]: v } : t))
  const last = tiers[tiers.length - 1]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bs-space-2)' }}>
      <span style={{ fontSize: 'var(--bs-text-xs)', fontWeight: 'var(--bs-weight-semibold)' as any, color: 'var(--bs-text-secondary)' }}>Volume discounts</span>
      <p className={s.hint} style={{ marginTop: 0 }}>Applied automatically when one cart line reaches the quantity. The highest tier reached wins; promo codes apply after it.</p>
      {tiers.map((t, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) auto', gap: 'var(--bs-space-2)', alignItems: 'center' }}>
          <label className={s.tierField}><span>Buy at least</span>
            <input className={s.searchInput} style={{ paddingLeft: 'var(--bs-space-3)' }} type="number" min={2} step={1} inputMode="numeric"
              value={t.min_qty} onChange={e => setTier(i, 'min_qty', e.target.value)} aria-label={`Tier ${i + 1} minimum quantity`} />
          </label>
          <label className={s.tierField}><span>Percent off</span>
            <input className={s.searchInput} style={{ paddingLeft: 'var(--bs-space-3)' }} type="number" min={1} max={90} step={0.5} inputMode="decimal"
              value={t.percent} onChange={e => setTier(i, 'percent', e.target.value)} aria-label={`Tier ${i + 1} percent off`} />
          </label>
          <Button size="sm" variant="ghost" onClick={() => onChange(tiers.filter((_, j) => j !== i))} aria-label={`Remove tier ${i + 1}`} style={{ alignSelf: 'end' }}>Remove</Button>
        </div>
      ))}
      {tiers.length < 5 && (
        <div>
          <Button size="sm" variant="secondary" icon="plus"
            onClick={() => onChange([...tiers, { min_qty: last ? Number(last.min_qty || 1) + 2 : 3, percent: last ? Number(last.percent || 0) + 5 : 5 }])}>
            Add tier
          </Button>
        </div>
      )}
    </div>
  )
}

/** Product-page fields (supabase-migrations/07). Blank fields are not shown on the shop. */
export function ProductPageFields({ form, setForm }: { form: ProductFormState; setForm: (f: (p: ProductFormState) => ProductFormState) => void }) {
  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }))
  const lines = (key: string) => (Array.isArray(form[key]) ? form[key] : []).join('\n')
  const setLines = (key: string, v: string) => set(key, v.split('\n'))
  const faqs: { q: string; a: string }[] = Array.isArray(form.faqs) ? form.faqs : []
  const setFaq = (i: number, k: 'q' | 'a', v: string) => set('faqs', faqs.map((f, j) => j === i ? { ...f, [k]: v } : f))
  return (
    <>
      <div className={s.cols2}>
        <TextField label="Badge" value={form.badge} onChange={v => set('badge', v)} placeholder="Best seller" />
        <TextField label="Region" value={form.region} onChange={v => set('region', v)} placeholder="Global" />
        <TextField label="Delivery time" value={form.delivery_time} onChange={v => set('delivery_time', v)} placeholder="Within 1 hour" />
        <TextField label="Delivery method" value={form.delivery_method} onChange={v => set('delivery_method', v)} placeholder="Login details by WhatsApp" />
      </div>
      <div className={s.cols2}>
        <AreaField label="What you get" hint="One per line." rows={4} value={lines('features')} onChange={v => setLines('features', v)} placeholder={'4 screens at once\nUltra HD'} />
        <HowItWorksField value={form.how_it_works} onChange={v => set('how_it_works', v)} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bs-space-2)' }}>
        <span style={{ fontSize: 'var(--bs-text-xs)', fontWeight: 'var(--bs-weight-semibold)' as any, color: 'var(--bs-text-secondary)' }}>Questions and answers</span>
        {faqs.length === 0 && <p className={s.hint}>None yet.</p>}
        {faqs.map((f, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.6fr) auto', gap: 'var(--bs-space-2)', alignItems: 'start' }}>
            <input className={s.searchInput} style={{ paddingLeft: 'var(--bs-space-3)' }} value={f.q} onChange={e => setFaq(i, 'q', e.target.value)} placeholder="Question" aria-label={`Question ${i + 1}`} />
            <input className={s.searchInput} style={{ paddingLeft: 'var(--bs-space-3)' }} value={f.a} onChange={e => setFaq(i, 'a', e.target.value)} placeholder="Answer" aria-label={`Answer ${i + 1}`} />
            <Button size="sm" variant="ghost" onClick={() => set('faqs', faqs.filter((_, j) => j !== i))} aria-label={`Remove question ${i + 1}`}>Remove</Button>
          </div>
        ))}
        <div><Button size="sm" variant="secondary" icon="plus" onClick={() => set('faqs', [...faqs, { q: '', a: '' }])}>Add question</Button></div>
      </div>
      <VolumeTiersField value={form.volume_tiers} onChange={v => set('volume_tiers', v)} />
      <div className={s.cols2}>
        <TextField label="Search title" value={form.seo_title} onChange={v => set('seo_title', v)} placeholder={`${form.name || 'Product'} · BuySub`} />
        <TextField label="Search description" value={form.seo_description} onChange={v => set('seo_description', v)} placeholder="Defaults to the short description" />
      </div>
    </>
  )
}

export function ProductEditor({ open, form, setForm, onSave, onClose, saving, isNew }: {
  open: boolean
  form: ProductFormState
  setForm: (f: (p: ProductFormState) => ProductFormState) => void
  onSave: () => void
  onClose: () => void
  saving?: boolean
  isNew?: boolean
}) {
  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }))
  const oneTime = form.billing_type === 'one_time'
  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={isNew ? 'New product' : form.name || 'Edit product'}
      subtitle={!isNew && form.slug ? `/shop/${form.slug}` : undefined}
      width={680}
      footer={<>
        <Button size="md" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button size="md" loading={saving} disabled={!String(form.name || '').trim()} onClick={onSave}>{isNew ? 'Create product' : 'Save changes'}</Button>
      </>}
    >
      <form onSubmit={e => { e.preventDefault(); onSave() }}>
        <FormSection title="Listing">
          <div className={s.cols2}>
            <TextField label="Name" required value={form.name} onChange={v => set('name', v)} autoFocus={isNew} />
            <TextField label="Slug" value={form.slug} onChange={v => set('slug', slugify(v))} placeholder={slugify(form.name || '') || 'made from the name'} hint="The product’s web address. Changing it breaks old links." />
            <SelectField label="Category" value={form.category || ''} onChange={v => set('category', v)} options={CATEGORY_OPTIONS} />
            <TextField label="Logo domain" value={form.domain} onChange={v => set('domain', v.trim())} placeholder="netflix.com" hint="Used to fetch the logo." />
            <TextField label="Tags" value={form.tags} onChange={v => set('tags', v)} placeholder="No ads, 4K" />
            <TextField label="Image URL" value={form.image_url} onChange={v => set('image_url', v.trim())} placeholder="Optional, overrides the logo" />
          </div>
          <TextField label="Short description" value={form.short_description} onChange={v => set('short_description', v)} hint="One line, shown on product cards." />
          <AreaField label="Description" rows={4} value={form.description} onChange={v => set('description', v)} />
        </FormSection>

        <FormSection title="Prices" hint={oneTime ? 'One-time products sell at the first price set.' : 'In naira. Leave a period empty to not sell it.'}>
          <SelectField label="Billing" value={form.billing_type || 'subscription'} onChange={v => set('billing_type', v)}
            options={[{ value: 'subscription', label: 'Subscription' }, { value: 'one_time', label: 'One-time purchase' }]} />
          <div className={s.cols4}>
            {PRICE_FIELDS.map(([k, label]) => (
              <TextField key={k} label={label} type="number" inputMode="numeric" min={0}
                value={form[k] ? form[k] : ''} onChange={v => set(k, v === '' ? 0 : Math.max(0, Number(v) || 0))} placeholder="Not sold" />
            ))}
          </div>
        </FormSection>

        <FormSection title="Availability">
          <div className={s.cols2}>
            <SelectField label="Visibility" value={form.status || 'active'} onChange={v => set('status', v)}
              options={[{ value: 'active', label: 'Active, shown in the shop' }, { value: 'hidden', label: 'Hidden' }]} />
            <SelectField label="Stock" value={form.stock_status || 'in_stock'} onChange={v => set('stock_status', v)}
              options={[{ value: 'in_stock', label: 'In stock' }, { value: 'out_of_stock', label: 'Out of stock' }, { value: 'preorder', label: 'Pre-order' }]} />
            <TextField label="Sort order" type="number" value={form.sort_order ?? 100} onChange={v => set('sort_order', Number(v) || 0)} hint="Lower numbers show first." />
          </div>
          <SwitchRow label="Featured" hint="Listed first on the home page and in the shop’s Recommended order." checked={!!form.featured} onChange={v => set('featured', v)} />
        </FormSection>

        <FormSection title="Product page" hint={`Optional. Shown on /shop/${form.slug || slugify(form.name || '') || 'slug'} and in the quick view. Blank fields are hidden.`}>
          <ProductPageFields form={form} setForm={setForm} />
        </FormSection>

        <FormSection title="After purchase">
          <TextField label="WhatsApp group link" value={form.whatsapp_group_url} onChange={v => set('whatsapp_group_url', v.trim())}
            placeholder="https://chat.whatsapp.com/…" hint="Sent in the order confirmation email after payment. Never shown in the shop." />
        </FormSection>
        <button type="submit" hidden />
      </form>
    </SidePanel>
  )
}
