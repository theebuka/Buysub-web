'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"
import { useTheme as useThemeController } from '@/lib/theme'
import { getAccessToken } from '@/lib/session'
import { API_BASE } from '@/lib/config'

import { ALL_CATEGORIES, FieldLabel, Order, Product, SmallBtn, T, sentenceCase } from '../_lib/shared'

// ── Product page content (supabase-migrations/07) ──
// What the storefront's product page and quick view show beyond the name and
// prices. Every field is optional: blank ones are simply not rendered, and the
// page falls back to generic "How it works" steps. Lists are one item per
// line; the API drops blank lines and empty FAQ rows.
export function ProductPageFields({ form, setForm, IS }: { form: any; setForm: (f: any) => void; IS: React.CSSProperties }) {
  const set = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }))
  const lines = (key: string) => (Array.isArray(form[key]) ? form[key] : []).join('\n')
  const setLines = (key: string, v: string) => set(key, v.split('\n'))
  const faqs: { q: string; a: string }[] = Array.isArray(form.faqs) ? form.faqs : []
  const setFaq = (i: number, k: 'q' | 'a', v: string) => set('faqs', faqs.map((f, j) => j === i ? { ...f, [k]: v } : f))
  const TA: React.CSSProperties = { ...IS, height: 88, padding: '10px 14px', resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }
  return (
    <div style={{ marginTop: 12, marginBottom: 12, padding: '16px 18px', background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 'var(--bs-radius-lg)' }}>
      <div style={{ fontSize: 'var(--bs-text-2xs)', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>
        Product page
      </div>
      <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 12 }}>
        Optional. Shown on /shop/{form.slug || 'slug'} and in the quick view. Leave a field blank to hide it.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="Badge"><input style={IS} value={form.badge || ''} onChange={e => set('badge', e.target.value)} placeholder="e.g. Best seller" /></FieldLabel>
        <FieldLabel label="Delivery time"><input style={IS} value={form.delivery_time || ''} onChange={e => set('delivery_time', e.target.value)} placeholder="e.g. Within 1 hour" /></FieldLabel>
        <FieldLabel label="Delivery method"><input style={IS} value={form.delivery_method || ''} onChange={e => set('delivery_method', e.target.value)} placeholder="e.g. Login details by WhatsApp" /></FieldLabel>
        <FieldLabel label="Region"><input style={IS} value={form.region || ''} onChange={e => set('region', e.target.value)} placeholder="e.g. Global" /></FieldLabel>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="What you get (one per line)"><textarea style={TA as any} value={lines('features')} onChange={e => setLines('features', e.target.value)} placeholder={'4 screens at once\nUltra HD'} /></FieldLabel>
        <FieldLabel label="How it works (one step per line)"><textarea style={TA as any} value={lines('how_it_works')} onChange={e => setLines('how_it_works', e.target.value)} placeholder="Blank uses the standard steps" /></FieldLabel>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 4 }}>FAQs</div>
        {faqs.map((f, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8, marginBottom: 8 }}>
            <input style={IS} value={f.q} onChange={e => setFaq(i, 'q', e.target.value)} placeholder="Question" aria-label={`Question ${i + 1}`} />
            <input style={IS} value={f.a} onChange={e => setFaq(i, 'a', e.target.value)} placeholder="Answer" aria-label={`Answer ${i + 1}`} />
            <SmallBtn color={T.error} onClick={() => set('faqs', faqs.filter((_, j) => j !== i))}>Remove</SmallBtn>
          </div>
        ))}
        <SmallBtn color={T.accent} onClick={() => set('faqs', [...faqs, { q: '', a: '' }])}>+ Add question</SmallBtn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
        <FieldLabel label="SEO title"><input style={IS} value={form.seo_title || ''} onChange={e => set('seo_title', e.target.value)} placeholder={`${form.name || 'Product'} · BuySub`} /></FieldLabel>
        <FieldLabel label="SEO description"><input style={IS} value={form.seo_description || ''} onChange={e => set('seo_description', e.target.value)} placeholder="Defaults to the short description" /></FieldLabel>
      </div>
    </div>
  )
}

// ── Product form (module-level, stable — fixes focus loss) ──
export function ProductFormPanel({ form, setForm, onSave, onCancel, saving, title }: { form: any; setForm: (f: any) => void; onSave: () => void; onCancel: () => void; saving?: boolean; title: string }) {
  const IS: React.CSSProperties = {
    height: 'var(--bs-control-md)',
    padding: '0 14px',
    borderRadius: 10,
    fontSize: 13,
    width: '100%',
    flex: 1,
    background: T.input,
    border: `1px solid ${T.border}`,
    color: T.text,
    boxSizing: 'border-box',
    outline: 'none',

  }
  const updateField = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }))
  const sl = form.social_links || {}
  const updateSocial = (k: string, v: string) => {
    setForm((f: any) => ({ ...f, social_links: { ...(f.social_links || {}), [k]: v } }))
  }
  return (
    <div style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 'var(--bs-radius-lg)', padding: '20px 24px', marginBottom: 14 }}>
      <div style={{ fontSize: 'var(--bs-text-2xs)', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, fontWeight: 600 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="Name *"><input style={IS} value={form.name || ''} onChange={e => updateField('name', e.target.value)} /></FieldLabel>
        <FieldLabel label="Slug"><input style={IS} value={form.slug || ''} onChange={e => updateField('slug', e.target.value)} placeholder="auto-generated from name" /></FieldLabel>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="Category"><select style={IS} value={form.category || ''} onChange={e => updateField('category', e.target.value)}><option value="">Select…</option>{ALL_CATEGORIES.filter(c => c !== 'all').map(c => <option key={c} value={c}>{sentenceCase(c)}</option>)}</select></FieldLabel>
        <FieldLabel label="Tags"><input style={IS} value={form.tags || ''} onChange={e => updateField('tags', e.target.value)} placeholder="e.g. No Ads" /></FieldLabel>
        <FieldLabel label="Domain"><input style={IS} value={form.domain || ''} onChange={e => updateField('domain', e.target.value)} placeholder="e.g. netflix.com" /></FieldLabel>
      </div>
      <div style={{ marginBottom: 12 }}><FieldLabel label="Short Description"><input style={IS} value={form.short_description || ''} onChange={e => updateField('short_description', e.target.value)} /></FieldLabel></div>
      <div style={{ marginBottom: 12 }}><FieldLabel label="Description"><textarea style={{ ...IS, height: 72, padding: '10px 14px', resize: 'vertical' } as any} value={form.description || ''} onChange={e => updateField('description', e.target.value)} /></FieldLabel></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
        <FieldLabel label="Price 1M (₦)"><input style={IS} type="number" value={form.price_1m || ''} onChange={e => updateField('price_1m', Number(e.target.value))} /></FieldLabel>
        <FieldLabel label="Price 3M (₦)"><input style={IS} type="number" value={form.price_3m || ''} onChange={e => updateField('price_3m', Number(e.target.value))} /></FieldLabel>
        <FieldLabel label="Price 6M (₦)"><input style={IS} type="number" value={form.price_6m || ''} onChange={e => updateField('price_6m', Number(e.target.value))} /></FieldLabel>
        <FieldLabel label="Price 1Y (₦)"><input style={IS} type="number" value={form.price_1y || ''} onChange={e => updateField('price_1y', Number(e.target.value))} /></FieldLabel>
      </div>
      {/* ── New: WhatsApp & Social Links ─────────────── */}
      <div style={{
        marginTop: 12, padding: '16px 18px',
        background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 'var(--bs-radius-lg)',
      }}>
        <div style={{
          fontSize: 'var(--bs-text-2xs)', color: T.textMuted, textTransform: 'uppercase',
          letterSpacing: '0.08em', fontWeight: 600, marginBottom: 12,
        }}>
          Product community links
        </div>
 
        <div style={{ marginBottom: 12 }}>
          <FieldLabel label="WhatsApp Group URL">
            <input
              style={IS}
              value={form.whatsapp_group_url || ''}
              onChange={e => setForm((f: any) => ({ ...f, whatsapp_group_url: e.target.value }))}
              placeholder="https://chat.whatsapp.com/…"
            />
          </FieldLabel>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
            Sent to the customer in the order confirmation email, after payment only. Never shown on the shop.
          </div>
        </div>
 
        {/* <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FieldLabel label="Telegram">
            <input style={IS} value={sl.telegram || ''} onChange={e => updateSocial('telegram', e.target.value)} placeholder="https://t.me/…" />
          </FieldLabel>
          <FieldLabel label="Discord">
            <input style={IS} value={sl.discord || ''} onChange={e => updateSocial('discord', e.target.value)} placeholder="https://discord.gg/…" />
          </FieldLabel>
          <FieldLabel label="Instagram">
            <input style={IS} value={sl.instagram || ''} onChange={e => updateSocial('instagram', e.target.value)} placeholder="https://instagram.com/…" />
          </FieldLabel>
          <FieldLabel label="Twitter / X">
            <input style={IS} value={sl.twitter || ''} onChange={e => updateSocial('twitter', e.target.value)} placeholder="https://x.com/…" />
          </FieldLabel>
          <FieldLabel label="TikTok">
            <input style={IS} value={sl.tiktok || ''} onChange={e => updateSocial('tiktok', e.target.value)} placeholder="https://tiktok.com/@…" />
          </FieldLabel>
          <FieldLabel label="Website">
            <input style={IS} value={sl.website || ''} onChange={e => updateSocial('website', e.target.value)} placeholder="https://…" />
          </FieldLabel>
        </div> */}
      </div>
      <ProductPageFields form={form} setForm={setForm} IS={IS} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="Billing Type"><select style={IS} value={form.billing_type || 'subscription'} onChange={e => updateField('billing_type', e.target.value)}><option value="subscription">Subscription</option><option value="one_time">One-time</option></select></FieldLabel>
        <FieldLabel label="Stock Status"><select style={IS} value={form.stock_status || 'in_stock'} onChange={e => updateField('stock_status', e.target.value)}><option value="in_stock">In Stock</option><option value="out_of_stock">Out of Stock</option><option value="preorder">Preorder</option></select></FieldLabel>
        <FieldLabel label="Status"><select style={IS} value={form.status || 'active'} onChange={e => updateField('status', e.target.value)}><option value="active">Active</option><option value="hidden">hidden</option><option value="archived">Archived</option></select></FieldLabel>
        <FieldLabel label="Sort Order"><input style={IS} type="number" value={form.sort_order ?? 100} onChange={e => updateField('sort_order', Number(e.target.value))} /></FieldLabel>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: T.text, cursor: 'pointer' }}><input type="checkbox" checked={!!form.featured} onChange={e => updateField('featured', e.target.checked)} style={{ accentColor: T.accent, width: 16, height: 16 }} />Featured</label>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <SmallBtn color={T.success} onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</SmallBtn>
        <SmallBtn color={T.textMuted} onClick={onCancel}>Cancel</SmallBtn>
      </div>
    </div>
  )
}
