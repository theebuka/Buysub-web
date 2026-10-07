'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"
import { useTheme as useThemeController } from '@/lib/theme'
import { getAccessToken } from '@/lib/session'
import { API_BASE } from '@/lib/config'

import { Discount, FieldLabel, Order, SmallBtn, T, inputStyle } from '../_lib/shared'

// ── Discount form (module-level, stable — fixes focus loss) ──
export function DiscountFormPanel({ form, setForm, onSave, onCancel, saving, title }: { form: any; setForm: (f: any) => void; onSave: () => void; onCancel: () => void; saving?: boolean; title: string }) {
  const IS = inputStyle()
  const uf = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }))
  return (
    <div style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 'var(--bs-radius-lg)', padding: '20px 24px', marginBottom: 14 }}>
      <div style={{ fontSize: 'var(--bs-text-2xs)', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, fontWeight: 600 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="Code *"><input style={IS} value={form.code || ''} onChange={e => uf('code', e.target.value.toUpperCase())} placeholder="e.g. SAVE10" /></FieldLabel>
        <FieldLabel label="Type"><select style={IS} value={form.type || 'percentage'} onChange={e => uf('type', e.target.value)}><option value="percentage">Percentage</option><option value="fixed">Fixed Amount (₦)</option></select></FieldLabel>
        <FieldLabel label="Value"><input style={IS} type="number" value={form.value || ''} onChange={e => uf('value', Number(e.target.value))} /></FieldLabel>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="Min Order (₦)"><input style={IS} type="number" value={form.min_order_ngn || ''} onChange={e => uf('min_order_ngn', Number(e.target.value))} /></FieldLabel>
        <FieldLabel label="Max Discount (₦)"><input style={IS} type="number" value={form.max_discount_ngn || ''} onChange={e => uf('max_discount_ngn', Number(e.target.value) || null)} placeholder="No cap" /></FieldLabel>
        <FieldLabel label="Max Uses"><input style={IS} type="number" value={form.max_uses || ''} onChange={e => uf('max_uses', Number(e.target.value) || null)} placeholder="Unlimited" /></FieldLabel>
        <FieldLabel label="Scope"><select style={IS} value={form.scope || 'site_wide'} onChange={e => uf('scope', e.target.value)}><option value="site_wide">Site-wide</option><option value="category">Category</option></select></FieldLabel>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="Active From"><input style={{ ...IS, colorScheme: 'dark' }} type="date" value={form.active_from || ''} onChange={e => uf('active_from', e.target.value || null)} /></FieldLabel>
        <FieldLabel label="Expires"><input style={{ ...IS, colorScheme: 'dark' }} type="date" value={form.expires_at || ''} onChange={e => uf('expires_at', e.target.value || null)} /></FieldLabel>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="Included Products"><input style={IS} value={form.included_products || ''} onChange={e => uf('included_products', e.target.value || null)} placeholder="All products" /></FieldLabel>
        <FieldLabel label="Excluded Products"><input style={IS} value={form.excluded_products || ''} onChange={e => uf('excluded_products', e.target.value || null)} /></FieldLabel>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="Included Categories"><input style={IS} value={form.included_categories || ''} onChange={e => uf('included_categories', e.target.value || null)} placeholder="All categories" /></FieldLabel>
        <FieldLabel label="Excluded Categories"><input style={IS} value={form.excluded_categories || ''} onChange={e => uf('excluded_categories', e.target.value || null)} /></FieldLabel>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: T.text, cursor: 'pointer' }}><input type="checkbox" checked={!!form.active} onChange={e => uf('active', e.target.checked)} style={{ accentColor: T.accent, width: 16, height: 16 }} />Active</label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: T.text, cursor: 'pointer' }}><input type="checkbox" checked={!!form.auto_apply} onChange={e => uf('auto_apply', e.target.checked)} style={{ accentColor: T.accent, width: 16, height: 16 }} />Auto Apply</label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: T.text, cursor: 'pointer' }}><input type="checkbox" checked={!!form.exclusive} onChange={e => uf('exclusive', e.target.checked)} style={{ accentColor: T.accent, width: 16, height: 16 }} />Exclusive</label>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <SmallBtn color={T.success} onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</SmallBtn>
        <SmallBtn color={T.textMuted} onClick={onCancel}>Cancel</SmallBtn>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// NEW ORDER DRAWER — module-level, stable reference (no focus loss)
// ════════════════════════════════════════════════════════════════════
