'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'

const API = process.env.NEXT_PUBLIC_API_BASE || 'https://buysub-api-v2.ebuka-nwaju.workers.dev'
const LOGO_DEV_TOKEN = 'pk_S77F38yQR6WQWErhPEEp1w'
const ALL_CATEGORIES = ['all','music streaming','video streaming','security','ai','productivity','sports','bundles','education','cloud','gaming','services','coins','social media','lifestyle']

// ── Types ──
interface Stats { total_revenue: number; revenue_today: number; revenue_this_month: number; orders_total: number; orders_today: number; orders_pending_manual: number; orders_paid: number; orders_rejected_pending: number; products_active: number; products_total: number; customers_total: number; partners_pending: number; top_products: { name: string; slug: string; order_count: number; revenue: number }[]; recent_orders: any[]; revenue_by_day: { day: string; revenue: number; orders: number }[] }
interface Order { id: string; order_ref: string; status: string; total_ngn: number; subtotal_ngn: number; discount_ngn: number; payment_method: string; currency: string; created_at: string; updated_at: string; customer_name: string|null; customer_email: string|null; customer_phone: string|null; notes: string|null; order_items?: any[] }
interface Product { id: string; name: string; slug: string; category: string; tags: string; price_1m: number; price_3m: number; price_6m: number; price_1y: number; billing_type: string; stock_status: string; status: string; domain: string; short_description: string; description: string; featured: boolean; created_at: string; sort_order: number; image_url: string; category_tagline: string; billing_period: string }
interface Customer { id: string; name: string; email: string; phone: string; category: string; source: string; is_active: boolean; created_at: string }
interface PartnerApp { id: string; legal_name: string; store_name: string; business_email: string; owner_name: string; owner_phone: string; status: string; payout_method: string; payout_frequency: string; state: string; lga: string; created_at: string; reviewer_notes: string|null; business_phone: string; address: string; cac_number: string|null; social_media: string|null; owner_email: string; gender: string|null; contact_method: string|null; bank_name: string|null; account_name: string|null; account_number: string|null; crypto_token: string|null; crypto_chain: string|null; wallet_address: string|null }
interface Discount { id: string; code: string; type: string; value: number; active: boolean; min_order_ngn: number; max_uses: number|null; times_used: number; expires_at: string|null; active_from: string|null; max_discount_ngn: number|null; included_products: string|null; excluded_products: string|null; included_categories: string|null; excluded_categories: string|null; auto_apply: boolean; scope: string; exclusive: boolean; created_at: string }
interface Pagination { page: number; limit: number; total: number; pages: number }

// ── Helpers ──
const fmt = (n: number) => `₦${Number(n||0).toLocaleString('en-NG',{minimumFractionDigits:0})}`
const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString('en-NG',{month:'short',day:'numeric',year:'numeric'}) } catch { return '—' } }
const fmtTime = (iso: string) => { try { return new Date(iso).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'}) } catch { return '' } }
const fmtFull = (iso: string) => `${fmtDate(iso)} ${fmtTime(iso)}`
const dayKey = (iso: string) => { try { return new Date(iso).toLocaleDateString('en-NG',{weekday:'long',month:'long',day:'numeric',year:'numeric'}) } catch { return '—' } }
const sentenceCase = (s: string) => s ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : ''
const statusColor = (s: string) => {
  if (s==='paid'||s==='approved'||s==='in_stock'||s==='active') return {bg:'rgba(22,163,74,0.12)',color:'#16a34a'}
  if (s==='pending_manual'||s==='pending_review'||s==='pending') return {bg:'rgba(217,119,6,0.12)',color:'#d97706'}
  if (s==='cancelled'||s==='rejected'||s==='out_of_stock'||s==='inactive'||s==='suspended'||s==='archived') return {bg:'rgba(220,38,38,0.12)',color:'#dc2626'}
  if (s==='rejected_pending') return {bg:'rgba(217,119,6,0.08)',color:'#92400e'}
  return {bg:'rgba(107,107,126,0.12)',color:'#6b6b7e'}
}
const emptyPagination: Pagination = {page:1,limit:20,total:0,pages:0}
const parsePagination = (r: any): Pagination => r?.meta?.pagination||r?.pagination||emptyPagination
const logoUrl = (domain: string) => domain ? `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=64` : ''

// ── Hydration-safe client hook ──
function useClientValue<T>(getter: () => T, fallback: T): T {
  const [value, setValue] = useState<T>(fallback)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true); try { setValue(getter()) } catch {} }, [])
  return mounted ? value : fallback
}

// ── Theme ──
const dark = {
  bg:'#050507',card:'#0B0B0F',elevated:'#141418',input:'#0E0E13',subtle:'#1a1a22',muted:'#18181c',
  border:'#27272e',borderSubtle:'#1c1c22',text:'#e8e8ec',textSecondary:'#a0a0b0',textMuted:'#6b6b7e',textFaint:'#4a4a5e',
  accent:'#7C5CFF',accentHover:'#9B85FF',success:'#16a34a',successBg:'rgba(22,163,74,0.12)',warning:'#d97706',warningBg:'rgba(217,119,6,0.12)',error:'#dc2626',errorBg:'rgba(220,38,38,0.12)',
  shadow:'0 1px 3px rgba(0,0,0,0.3)',shadowLg:'0 4px 12px rgba(0,0,0,0.4)'
}
const light = {
  bg:'#f8f9fb',card:'#ffffff',elevated:'#f1f3f5',input:'#ffffff',subtle:'#eef0f3',muted:'#e8eaed',
  border:'#e2e5e9',borderSubtle:'#eef0f3',text:'#1a1a2e',textSecondary:'#4a5568',textMuted:'#8896a6',textFaint:'#b0bac5',
  accent:'#7C5CFF',accentHover:'#6B4EE6',success:'#059669',successBg:'#ecfdf5',warning:'#d97706',warningBg:'#fffbeb',error:'#dc2626',errorBg:'#fef2f2',
  shadow:'0 1px 3px rgba(0,0,0,0.06)',shadowLg:'0 4px 12px rgba(0,0,0,0.08)'
}
type Theme = typeof dark

function useTheme() {
  const [isDark, setIsDark] = useState(true)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    try { const saved = localStorage.getItem('bs_admin_theme'); if (saved === 'light') setIsDark(false) } catch {}
  }, [])
  const toggle = () => {
    const next = !isDark; setIsDark(next)
    try { localStorage.setItem('bs_admin_theme', next ? 'dark' : 'light') } catch {}
  }
  return { T: isDark ? dark : light, isDark, toggle, mounted }
}

// ── Auth (only called inside useEffect / event handlers) ──
function readToken(): string {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const s = JSON.parse(localStorage.getItem(key) || '{}')
        if (s?.access_token) {
          if (s.expires_at && s.expires_at * 1000 < Date.now()) { localStorage.removeItem(key); return '' }
          return s.access_token
        }
      }
    }
  } catch {}
  return ''
}
function readAdminEmail(): string {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        return JSON.parse(localStorage.getItem(key) || '{}')?.user?.email || ''
      }
    }
  } catch {}
  return ''
}
function signOut() {
  try { Object.keys(localStorage).forEach(key => { if (key.startsWith('sb-') && key.endsWith('-auth-token')) localStorage.removeItem(key) }) } catch {}
  window.location.href = '/login'
}
async function apiFetch(path: string, opts: RequestInit = {}) {
  let token = ''
  try { token = readToken() } catch {}
  if (!token) { signOut(); return { ok: false, error: 'Session expired' } }
  try {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(opts.headers || {}) },
    })
    const data = await res.json()
    if (res.status === 401 || res.status === 403) { signOut(); return { ok: false, error: 'Session expired' } }
    return data
  } catch (e: any) {
    return { ok: false, error: e.message === 'Failed to fetch' ? 'Network error — check that the API is reachable and CORS allows this origin' : (e.message || 'Network error') }
  }
}

// ════════════════════════════════════════════════════════════════
// SHARED COMPONENTS (module-level — stable references, no re-mount)
// ════════════════════════════════════════════════════════════════
const inputStyle = (T: Theme): React.CSSProperties => ({
  height: 42, padding: '0 14px', borderRadius: 10, fontSize: 13,
  width: '100%', flex: 1, background: T.input, border: `1px solid ${T.border}`,
  color: T.text, boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter,sans-serif',
})
const pageBtnStyle = (T: Theme, disabled: boolean): React.CSSProperties => ({
  padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card,
  color: T.text, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 12,
  opacity: disabled ? 0.4 : 1, fontFamily: 'Inter,sans-serif',
})

function Shell({ T, isDark, toggle, adminEmail, children }: { T: Theme; isDark: boolean; toggle: () => void; adminEmail: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.bg, minHeight: '100vh', color: T.text, fontFamily: 'Inter,sans-serif', padding: '0 24px 60px', paddingTop: 'calc(5vh + 16px)', boxSizing: 'border-box', transition: 'background 0.2s, color 0.2s' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Admin Dashboard</div>
            {adminEmail && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>BuySub Internal · {adminEmail}</div>}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <a href="/admin/receipt" style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: T.accent, color: '#fff', textDecoration: 'none' }}>+ Receipt</a>
            <button onClick={toggle} style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, color: T.text, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{isDark ? '☀️' : '🌙'}</button>
            <button onClick={signOut} style={{ padding: '10px 18px', borderRadius: 10, fontSize: 13, background: 'transparent', border: `1px solid ${T.border}`, color: T.textMuted, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>Sign Out</button>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

function Card({ T, title, children, style }: { T: Theme; title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 16, padding: '20px 24px', boxShadow: T.shadow, ...style }}><div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14, fontWeight: 600 }}>{title}</div>{children}</div>
}
function KpiCard({ T, label, value, highlight }: { T: Theme; label: string; value: string; highlight?: boolean }) {
  return <div style={{ background: T.card, border: `1px solid ${highlight ? T.warning + '66' : T.borderSubtle}`, borderRadius: 16, padding: '18px 20px', boxShadow: T.shadow }}><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div><div style={{ fontSize: 24, fontWeight: 700, color: highlight ? T.warning : T.text }}>{value}</div></div>
}
function Badge({ status, T }: { status: string; T: Theme }) {
  const c = statusColor(status)
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500, background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>{status.replace(/_/g, ' ')}</span>
}
function SmallBtn({ T, children, color, onClick, disabled }: { T: Theme; children: React.ReactNode; color: string; onClick: () => void; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: `1px solid ${color}30`, background: `${color}10`, color, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap', fontFamily: 'Inter,sans-serif' }}>{children}</button>
}
function Loading({ T }: { T: Theme }) { return <div style={{ padding: '50px 0', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>Loading…</div> }
function ErrorMsg({ msg, T }: { msg: string; T: Theme }) { return <div style={{ padding: 20, background: T.errorBg, border: `1px solid ${T.error}30`, borderRadius: 12, color: T.error, fontSize: 13 }}>{msg}</div> }
function EmptyState({ text, T }: { text: string; T: Theme }) { return <div style={{ padding: '50px 0', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>{text}</div> }
function PaginationBar({ T, pagination, onPage }: { T: Theme; pagination: Pagination; onPage: (p: number) => void }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, fontSize: 12, color: T.textMuted }}><span>Page {pagination.page} of {pagination.pages} ({pagination.total} total)</span><div style={{ display: 'flex', gap: 8 }}><button disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)} style={pageBtnStyle(T, pagination.page <= 1)}>← Prev</button><button disabled={pagination.page >= pagination.pages} onClick={() => onPage(pagination.page + 1)} style={pageBtnStyle(T, pagination.page >= pagination.pages)}>Next →</button></div></div>
}
function DetailSection({ T, title, children }: { T: Theme; title: string; children: React.ReactNode }) {
  return <div><div style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{title}</div>{children}</div>
}
function DRow({ T, label, value }: { T: Theme; label: string; value: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0', fontSize: 12 }}><span style={{ color: T.textMuted }}>{label}</span><span style={{ color: T.textSecondary, textAlign: 'right' }}>{value}</span></div>
}

// ── Field label (module-level, stable) ──
function FieldLabel({ label, T, children }: { label: string; T: Theme; children: React.ReactNode }) {
  return <div><div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 4 }}>{label}</div>{children}</div>
}

// ── Product form (module-level, stable — fixes focus loss) ──
function ProductFormPanel({ T, form, setForm, onSave, onCancel, saving, title }: { T: Theme; form: any; setForm: (f: any) => void; onSave: () => void; onCancel: () => void; saving?: boolean; title: string }) {
  const IS = inputStyle(T)
  const updateField = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }))
  return (
    <div style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 16, padding: '20px 24px', marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, fontWeight: 600 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="Name *" T={T}><input style={IS} value={form.name || ''} onChange={e => updateField('name', e.target.value)} /></FieldLabel>
        <FieldLabel label="Slug" T={T}><input style={IS} value={form.slug || ''} onChange={e => updateField('slug', e.target.value)} placeholder="auto-generated from name" /></FieldLabel>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="Category" T={T}><select style={IS} value={form.category || ''} onChange={e => updateField('category', e.target.value)}><option value="">Select…</option>{ALL_CATEGORIES.filter(c => c !== 'all').map(c => <option key={c} value={c}>{sentenceCase(c)}</option>)}</select></FieldLabel>
        <FieldLabel label="Tags" T={T}><input style={IS} value={form.tags || ''} onChange={e => updateField('tags', e.target.value)} placeholder="e.g. No Ads" /></FieldLabel>
        <FieldLabel label="Domain" T={T}><input style={IS} value={form.domain || ''} onChange={e => updateField('domain', e.target.value)} placeholder="e.g. netflix.com" /></FieldLabel>
      </div>
      <div style={{ marginBottom: 12 }}><FieldLabel label="Short Description" T={T}><input style={IS} value={form.short_description || ''} onChange={e => updateField('short_description', e.target.value)} /></FieldLabel></div>
      <div style={{ marginBottom: 12 }}><FieldLabel label="Description" T={T}><textarea style={{ ...IS, height: 72, padding: '10px 14px', resize: 'vertical' } as any} value={form.description || ''} onChange={e => updateField('description', e.target.value)} /></FieldLabel></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
        <FieldLabel label="Price 1M (₦)" T={T}><input style={IS} type="number" value={form.price_1m || ''} onChange={e => updateField('price_1m', Number(e.target.value))} /></FieldLabel>
        <FieldLabel label="Price 3M (₦)" T={T}><input style={IS} type="number" value={form.price_3m || ''} onChange={e => updateField('price_3m', Number(e.target.value))} /></FieldLabel>
        <FieldLabel label="Price 6M (₦)" T={T}><input style={IS} type="number" value={form.price_6m || ''} onChange={e => updateField('price_6m', Number(e.target.value))} /></FieldLabel>
        <FieldLabel label="Price 1Y (₦)" T={T}><input style={IS} type="number" value={form.price_1y || ''} onChange={e => updateField('price_1y', Number(e.target.value))} /></FieldLabel>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="Billing Type" T={T}><select style={IS} value={form.billing_type || 'subscription'} onChange={e => updateField('billing_type', e.target.value)}><option value="subscription">Subscription</option><option value="one_time">One-time</option></select></FieldLabel>
        <FieldLabel label="Stock Status" T={T}><select style={IS} value={form.stock_status || 'in_stock'} onChange={e => updateField('stock_status', e.target.value)}><option value="in_stock">In Stock</option><option value="out_of_stock">Out of Stock</option><option value="preorder">Preorder</option></select></FieldLabel>
        <FieldLabel label="Status" T={T}><select style={IS} value={form.status || 'active'} onChange={e => updateField('status', e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></FieldLabel>
        <FieldLabel label="Sort Order" T={T}><input style={IS} type="number" value={form.sort_order ?? 100} onChange={e => updateField('sort_order', Number(e.target.value))} /></FieldLabel>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: T.text, cursor: 'pointer' }}><input type="checkbox" checked={!!form.featured} onChange={e => updateField('featured', e.target.checked)} style={{ accentColor: T.accent, width: 16, height: 16 }} />Featured</label>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <SmallBtn T={T} color={T.success} onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</SmallBtn>
        <SmallBtn T={T} color={T.textMuted} onClick={onCancel}>Cancel</SmallBtn>
      </div>
    </div>
  )
}

// ── Discount form (module-level, stable — fixes focus loss) ──
function DiscountFormPanel({ T, form, setForm, onSave, onCancel, saving, title }: { T: Theme; form: any; setForm: (f: any) => void; onSave: () => void; onCancel: () => void; saving?: boolean; title: string }) {
  const IS = inputStyle(T)
  const uf = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }))
  return (
    <div style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 16, padding: '20px 24px', marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, fontWeight: 600 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="Code *" T={T}><input style={IS} value={form.code || ''} onChange={e => uf('code', e.target.value.toUpperCase())} placeholder="e.g. SAVE10" /></FieldLabel>
        <FieldLabel label="Type" T={T}><select style={IS} value={form.type || 'percentage'} onChange={e => uf('type', e.target.value)}><option value="percentage">Percentage</option><option value="fixed">Fixed Amount (₦)</option></select></FieldLabel>
        <FieldLabel label="Value" T={T}><input style={IS} type="number" value={form.value || ''} onChange={e => uf('value', Number(e.target.value))} /></FieldLabel>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="Min Order (₦)" T={T}><input style={IS} type="number" value={form.min_order_ngn || ''} onChange={e => uf('min_order_ngn', Number(e.target.value))} /></FieldLabel>
        <FieldLabel label="Max Discount (₦)" T={T}><input style={IS} type="number" value={form.max_discount_ngn || ''} onChange={e => uf('max_discount_ngn', Number(e.target.value) || null)} placeholder="No cap" /></FieldLabel>
        <FieldLabel label="Max Uses" T={T}><input style={IS} type="number" value={form.max_uses || ''} onChange={e => uf('max_uses', Number(e.target.value) || null)} placeholder="Unlimited" /></FieldLabel>
        <FieldLabel label="Scope" T={T}><select style={IS} value={form.scope || 'site_wide'} onChange={e => uf('scope', e.target.value)}><option value="site_wide">Site-wide</option><option value="category">Category</option></select></FieldLabel>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="Active From" T={T}><input style={{ ...IS, colorScheme: 'dark' }} type="date" value={form.active_from || ''} onChange={e => uf('active_from', e.target.value || null)} /></FieldLabel>
        <FieldLabel label="Expires" T={T}><input style={{ ...IS, colorScheme: 'dark' }} type="date" value={form.expires_at || ''} onChange={e => uf('expires_at', e.target.value || null)} /></FieldLabel>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="Included Products" T={T}><input style={IS} value={form.included_products || ''} onChange={e => uf('included_products', e.target.value || null)} placeholder="All products" /></FieldLabel>
        <FieldLabel label="Excluded Products" T={T}><input style={IS} value={form.excluded_products || ''} onChange={e => uf('excluded_products', e.target.value || null)} /></FieldLabel>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="Included Categories" T={T}><input style={IS} value={form.included_categories || ''} onChange={e => uf('included_categories', e.target.value || null)} placeholder="All categories" /></FieldLabel>
        <FieldLabel label="Excluded Categories" T={T}><input style={IS} value={form.excluded_categories || ''} onChange={e => uf('excluded_categories', e.target.value || null)} /></FieldLabel>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: T.text, cursor: 'pointer' }}><input type="checkbox" checked={!!form.active} onChange={e => uf('active', e.target.checked)} style={{ accentColor: T.accent, width: 16, height: 16 }} />Active</label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: T.text, cursor: 'pointer' }}><input type="checkbox" checked={!!form.auto_apply} onChange={e => uf('auto_apply', e.target.checked)} style={{ accentColor: T.accent, width: 16, height: 16 }} />Auto Apply</label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: T.text, cursor: 'pointer' }}><input type="checkbox" checked={!!form.exclusive} onChange={e => uf('exclusive', e.target.checked)} style={{ accentColor: T.accent, width: 16, height: 16 }} />Exclusive</label>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <SmallBtn T={T} color={T.success} onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</SmallBtn>
        <SmallBtn T={T} color={T.textMuted} onClick={onCancel}>Cancel</SmallBtn>
      </div>
    </div>
  )
}


// ════════════════════ MAIN ════════════════════
const TABS = ['Overview','Orders','Rejected','Products','Customers','Partners','Wallets','Affiliates','Links','Ads','Discounts'] as const
type Tab = typeof TABS[number]

export default function AdminDashboard() {
  const { T, isDark, toggle, mounted } = useTheme()
  const [tab, setTab] = useState<Tab>('Overview')
  const [token, setToken] = useState('')
  const adminEmail = useClientValue(readAdminEmail, '')

  useEffect(() => {
    try { const t = readToken(); setToken(t) } catch {}
    const iv = setInterval(() => { try { if (!readToken()) setToken('') } catch {} }, 15000)
    return () => clearInterval(iv)
  }, [])

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted) return null

  if (!token) return (
    <Shell T={T} isDark={isDark} toggle={toggle} adminEmail="">
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 600, color: T.text, marginBottom: 8 }}>Admin Access Required</div>
        <div style={{ fontSize: 14, color: T.textMuted, marginBottom: 24 }}>Session expired or not logged in.</div>
        <a href="/login" style={{ display: 'inline-block', padding: '12px 32px', borderRadius: 10, background: '#7C5CFF', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Sign In</a>
      </div>
    </Shell>
  )

  return (
    <Shell T={T} isDark={isDark} toggle={toggle} adminEmail={adminEmail}>
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${T.border}`, marginBottom: 28, overflowX: 'auto', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '12px 18px', fontSize: 13, border: 'none', cursor: 'pointer', background: 'transparent',
            color: tab === t ? T.accent : T.textMuted, borderBottom: tab === t ? `2px solid ${T.accent}` : '2px solid transparent',
            fontWeight: tab === t ? 600 : 400, whiteSpace: 'nowrap', transition: 'all 0.15s', fontFamily: 'Inter,sans-serif',
          }}>{t}</button>
        ))}
      </div>
      {tab === 'Overview' && <OverviewTab T={T} />}
      {tab === 'Orders' && <OrdersTab T={T} />}
      {tab === 'Rejected' && <RejectedTab T={T} />}
      {tab === 'Products' && <ProductsTab T={T} />}
      {tab === 'Customers' && <CustomersTab T={T} />}
      {tab === 'Partners' && <PartnersTab T={T} />}
      {tab === 'Wallets' && <WalletsTab T={T} />}
      {tab === 'Affiliates' && <AffiliatesTab T={T} />}
      {tab === 'Links' && <LinksTab T={T} />}
      {tab === 'Ads' && <AdsTab T={T} />}
      {tab === 'Discounts' && <DiscountsTab T={T} />}
    </Shell>
  )
}

// ════════════════════ OVERVIEW ════════════════════
function OverviewTab({T}:{T:Theme}) {
  const [stats,setStats]=useState<Stats|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('')
  useEffect(()=>{apiFetch('/v2/admin/stats').then(r=>{if(r.ok)setStats(r.data);else setError(r.error||'Failed')}).catch(()=>setError('Network error')).finally(()=>setLoading(false))},[])
  if(loading) return <Loading T={T}/>; if(error) return <ErrorMsg msg={error} T={T}/>; if(!stats) return null
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14,marginBottom:28}}>
        <KpiCard T={T} label="Revenue Today" value={fmt(stats.revenue_today)}/>
        <KpiCard T={T} label="Revenue (Month)" value={fmt(stats.revenue_this_month)}/>
        <KpiCard T={T} label="Total Revenue" value={fmt(stats.total_revenue)}/>
        <KpiCard T={T} label="Orders Today" value={String(stats.orders_today)}/>
        <KpiCard T={T} label="Pending WhatsApp" value={String(stats.orders_pending_manual)} highlight={stats.orders_pending_manual>0}/>
        <KpiCard T={T} label="Active Products" value={`${stats.products_active}/${stats.products_total}`}/>
        <KpiCard T={T} label="Customers" value={String(stats.customers_total)}/>
        <KpiCard T={T} label="Partners Pending" value={String(stats.partners_pending)} highlight={stats.partners_pending>0}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(380px,1fr))',gap:18}}>
        <Card T={T} title="Top Products (by revenue)">
          {(!stats.top_products||stats.top_products.length===0)&&<EmptyState text="No sales data yet" T={T}/>}
          {stats.top_products?.map((p,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:i<stats.top_products.length-1?`1px solid ${T.borderSubtle}`:'none'}}>
              <div><div style={{fontSize:13,color:T.text}}>{p.name}</div><div style={{fontSize:11,color:T.textMuted}}>{p.order_count} orders</div></div>
              <div style={{fontSize:13,fontWeight:600,color:T.text}}>{fmt(p.revenue)}</div>
            </div>
          ))}
        </Card>
        <Card T={T} title="Recent Orders">
          {(!stats.recent_orders||stats.recent_orders.length===0)&&<EmptyState text="No orders yet" T={T}/>}
          {stats.recent_orders?.map((o:any,i:number)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:i<stats.recent_orders.length-1?`1px solid ${T.borderSubtle}`:'none',gap:12}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:13,color:T.text,display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontFamily:'monospace',fontSize:12}}>{o.order_ref}</span><Badge status={o.status} T={T}/>
                </div>
                <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{o.customer_name||o.customer_email||'—'} · {fmtFull(o.created_at)}</div>
              </div>
              <div style={{fontSize:14,fontWeight:600,color:T.text,flexShrink:0}}>{fmt(o.total_ngn)}</div>
            </div>
          ))}
        </Card>
      </div>
      {stats.revenue_by_day&&stats.revenue_by_day.length>0&&(
        <Card T={T} title="Revenue (Last 30 Days)" style={{marginTop:18}}>
          <div style={{display:'flex',alignItems:'flex-end',gap:3,height:140,paddingTop:8}}>
            {(()=>{const max=Math.max(...stats.revenue_by_day.map(d=>d.revenue),1);return stats.revenue_by_day.map((d,i)=>(
              <div key={i} title={`${fmtDate(d.day)}: ${fmt(d.revenue)} (${d.orders} orders)`} style={{flex:1,minWidth:4,maxWidth:24,height:`${Math.max(2,(d.revenue/max)*100)}%`,background:T.accent,borderRadius:'4px 4px 0 0',cursor:'help',opacity:0.65,transition:'opacity 0.15s'}} onMouseEnter={e=>(e.currentTarget.style.opacity='1')} onMouseLeave={e=>(e.currentTarget.style.opacity='0.65')}/>
            ))})()}
          </div>
        </Card>
      )}
    </div>
  )
}

// ════════════════════ ORDERS TAB (accordion, sub-filters) ════════════════════
function OrdersTab({T}:{T:Theme}) {
  const [orders,setOrders]=useState<Order[]>([]); const [pagination,setPagination]=useState<Pagination>(emptyPagination)
  const [loading,setLoading]=useState(true); const [statusFilter,setStatusFilter]=useState(''); const [search,setSearch]=useState('')
  const [actionLoading,setActionLoading]=useState<string|null>(null); const [expanded,setExpanded]=useState<string|null>(null)
  const [orderDetails,setOrderDetails]=useState<Record<string,any>>({}); const searchTimer=useRef<any>(null)

  const load = useCallback(async(page=1,status=statusFilter,q=search)=>{
    setLoading(true); const params=new URLSearchParams({page:String(page),limit:'30'})
    if(status)params.set('status',status); if(q)params.set('q',q)
    const r=await apiFetch(`/v2/admin/orders?${params}`)
    if(r.ok){setOrders(r.data||[]);setPagination(parsePagination(r))} setLoading(false)
  },[statusFilter,search])

  useEffect(()=>{load()},[])
  const onSearch=(q:string)=>{setSearch(q);clearTimeout(searchTimer.current);searchTimer.current=setTimeout(()=>load(1,statusFilter,q),400)}

  const toggleExpand = async(ref:string) => {
    if(expanded===ref){setExpanded(null);return}
    setExpanded(ref)
    if(!orderDetails[ref]){
      const r=await apiFetch(`/v2/admin/orders/${ref}`)
      if(r.ok&&r.data) setOrderDetails(prev=>({...prev,[ref]:r.data}))
    }
  }

  const approveOrder=async(ref:string)=>{if(!confirm(`Approve order ${ref}?`))return;setActionLoading(ref);const r=await apiFetch(`/v2/admin/orders/${ref}/approve`,{method:'POST',body:JSON.stringify({payment_method:'manual'})});if(r.ok||r.data?.approved)await load(pagination.page);else alert(r.error||'Failed');setActionLoading(null)}
  const rejectOrder=async(ref:string)=>{const reason=prompt('Reason (optional):');if(reason===null)return;setActionLoading(ref);const r=await apiFetch(`/v2/admin/orders/${ref}/reject`,{method:'POST',body:JSON.stringify({reason})});if(r.ok||r.data?.rejected)await load(pagination.page);else alert(r.error||'Failed');setActionLoading(null)}
  const openReceipt=(ref:string)=>{window.open(`/admin/receipt?ref=${ref}`,'_blank')}

  const grouped:{day:string;orders:Order[]}[]=[];let lastDay='';for(const o of orders){const d=dayKey(o.created_at);if(d!==lastDay){grouped.push({day:d,orders:[]});lastDay=d}grouped[grouped.length-1].orders.push(o)}
  const STATUS_FILTERS=[{label:'All',value:''},{label:'Pending',value:'pending_manual'},{label:'Paid',value:'paid'},{label:'Cancelled',value:'cancelled'},{label:'Refunded',value:'refunded'}]

  return (
    <div>
      {/* Sub-filters */}
      <div style={{display:'flex',gap:4,marginBottom:16,background:T.elevated,borderRadius:999,padding:4,border:`1px solid ${T.border}`,width:'fit-content'}}>
        {STATUS_FILTERS.map(f=>(
          <button key={f.value} onClick={()=>{setStatusFilter(f.value);load(1,f.value,search)}} style={{
            padding:'8px 16px',borderRadius:999,fontSize:12,fontWeight:statusFilter===f.value?600:400,border:'none',cursor:'pointer',
            background:statusFilter===f.value?T.accent:'transparent',color:statusFilter===f.value?'#fff':T.text,transition:'all 0.15s',fontFamily:'Inter,sans-serif'
          }}>{f.label}</button>
        ))}
      </div>
      <div style={{marginBottom:20}}><input placeholder="Search by ref, name, or email…" value={search} onChange={e=>onSearch(e.target.value)} style={inputStyle(T)}/></div>

      {loading?<Loading T={T}/>:orders.length===0?<EmptyState text="No orders found" T={T}/>:(
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {grouped.map(group=>(
            <div key={group.day}>
              <div style={{fontSize:11,fontWeight:600,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.06em',padding:'14px 0 8px'}}>{group.day}</div>
              {group.orders.map(o=>{
                const det = orderDetails[o.order_ref]
                const isExp = expanded===o.order_ref
                return (
                  <div key={o.id} style={{background:T.card,border:`1px solid ${T.borderSubtle}`,borderRadius:16,marginBottom:8,overflow:'hidden'}}>
                    {/* Compact row */}
                    <div onClick={()=>toggleExpand(o.order_ref)} style={{padding:'14px 20px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                      <div style={{display:'flex',gap:10,alignItems:'center',minWidth:0,flex:1}}>
                        <span style={{fontFamily:'monospace',fontSize:13,fontWeight:600,color:T.text}}>{o.order_ref}</span>
                        <Badge status={o.status} T={T}/>
                        <span style={{fontSize:12,color:T.textSecondary}}>{o.customer_name||'—'}</span>
                        <span style={{fontSize:11,color:T.textMuted}}>{fmtTime(o.created_at)}</span>
                      </div>
                      <div style={{display:'flex',gap:12,alignItems:'center',flexShrink:0}}>
                        <span style={{fontSize:16,fontWeight:700,color:T.text}}>{fmt(o.total_ngn)}</span>
                        <span style={{color:T.textMuted,fontSize:12}}>{isExp?'▾':'▸'}</span>
                      </div>
                    </div>
                    {/* Expanded details */}
                    {isExp&&(
                      <div style={{padding:'0 20px 18px',borderTop:`1px solid ${T.borderSubtle}`}}>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:20,padding:'16px 0'}}>
                          <DetailSection T={T} title="Customer">
                            <DRow T={T} label="Name" value={o.customer_name||'—'}/>
                            <DRow T={T} label="Email" value={o.customer_email||'—'}/>
                            <DRow T={T} label="Phone" value={o.customer_phone||'—'}/>
                          </DetailSection>
                          <DetailSection T={T} title="Order">
                            <DRow T={T} label="Ref" value={o.order_ref}/>
                            <DRow T={T} label="Status" value={o.status.replace(/_/g,' ')}/>
                            <DRow T={T} label="Payment" value={o.payment_method||'—'}/>
                            <DRow T={T} label="Currency" value={o.currency}/>
                          </DetailSection>
                          <DetailSection T={T} title="Amounts">
                            <DRow T={T} label="Subtotal" value={fmt(o.subtotal_ngn)}/>
                            {o.discount_ngn>0&&<DRow T={T} label="Discount" value={`-${fmt(o.discount_ngn)}`}/>}
                            <DRow T={T} label="Total" value={fmt(o.total_ngn)}/>
                          </DetailSection>
                          <DetailSection T={T} title="Timestamps">
                            <DRow T={T} label="Created" value={fmtFull(o.created_at)}/>
                            <DRow T={T} label="Updated" value={fmtFull(o.updated_at)}/>
                          </DetailSection>
                        </div>
                        {det?.order_items&&det.order_items.length>0&&(
                          <div style={{marginBottom:12}}>
                            <div style={{fontSize:10,fontWeight:600,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Items</div>
                            {det.order_items.map((it:any,i:number)=>(
                              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:i<det.order_items.length-1?`1px solid ${T.borderSubtle}`:'none',fontSize:12}}>
                                <span style={{color:T.text}}>{it.product_name} <span style={{color:T.textMuted}}>× {it.quantity}</span></span>
                                <span style={{color:T.textSecondary}}>{fmt(it.total_price_ngn||it.unit_price_ngn*it.quantity)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {o.notes&&<div style={{fontSize:12,color:T.textMuted,marginBottom:10}}>Notes: {o.notes}</div>}
                        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                          {o.status==='pending_manual'&&<>
                            <SmallBtn T={T} color={T.success} onClick={()=>approveOrder(o.order_ref)} disabled={actionLoading===o.order_ref}>{actionLoading===o.order_ref?'…':'✓ Approve'}</SmallBtn>
                            <SmallBtn T={T} color={T.error} onClick={()=>rejectOrder(o.order_ref)} disabled={actionLoading===o.order_ref}>✕ Reject</SmallBtn>
                          </>}
                          {o.status==='paid'&&<SmallBtn T={T} color={T.accent} onClick={()=>openReceipt(o.order_ref)}>📄 Receipt</SmallBtn>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
      {pagination?.pages>1&&<PaginationBar T={T} pagination={pagination} onPage={p=>load(p)}/>}
    </div>
  )
}

// ════════════════════ REJECTED TAB ════════════════════
function RejectedTab({T}:{T:Theme}) {
  const [orders,setOrders]=useState<Order[]>([]); const [loading,setLoading]=useState(true); const [actionLoading,setActionLoading]=useState<string|null>(null)
  const load=useCallback(async()=>{setLoading(true);const r=await apiFetch('/v2/admin/orders?status=rejected_pending&limit=50');if(r.ok)setOrders(r.data||[]);setLoading(false)},[])
  useEffect(()=>{load()},[])
  const confirmReject=async(ref:string)=>{if(!confirm(`Permanently reject ${ref}?`))return;setActionLoading(ref);const r=await apiFetch(`/v2/admin/orders/${ref}/reject`,{method:'POST',body:JSON.stringify({confirm:true})});if(r.ok||r.data?.rejected)await load();else alert(r.error||'Failed');setActionLoading(null)}
  const undoReject=async(ref:string)=>{setActionLoading(ref);const r=await apiFetch(`/v2/admin/orders/${ref}/undo-reject`,{method:'POST'});if(r.ok||r.data?.undone)await load();else alert(r.error||'Failed');setActionLoading(null)}
  return (
    <div>
      <div style={{fontSize:13,color:T.warning,marginBottom:20,padding:'12px 16px',background:T.warningBg,borderRadius:12,border:`1px solid ${T.warning}30`}}>Orders here need a second confirmation before permanent cancellation. Use Undo to restore.</div>
      {loading?<Loading T={T}/>:orders.length===0?<EmptyState text="No rejected orders pending" T={T}/>:(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {orders.map(o=>(
            <div key={o.id} style={{background:T.card,border:`1px solid ${T.borderSubtle}`,borderRadius:16,padding:'18px 22px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                <div>
                  <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}><span style={{fontFamily:'monospace',fontSize:13,fontWeight:600,color:T.text}}>{o.order_ref}</span><Badge status="rejected_pending" T={T}/></div>
                  <div style={{fontSize:13,color:T.textSecondary}}>{o.customer_name||o.customer_email||'—'}</div>
                  {o.notes&&<div style={{fontSize:12,color:T.textMuted,marginTop:4}}>Reason: {o.notes}</div>}
                </div>
                <div style={{fontSize:20,fontWeight:700,color:T.text}}>{fmt(o.total_ngn)}</div>
              </div>
              <div style={{display:'flex',gap:8,marginTop:12}}>
                <SmallBtn T={T} color={T.success} onClick={()=>undoReject(o.order_ref)} disabled={actionLoading===o.order_ref}>↩ Undo</SmallBtn>
                <SmallBtn T={T} color={T.error} onClick={()=>confirmReject(o.order_ref)} disabled={actionLoading===o.order_ref}>✕ Confirm</SmallBtn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════ PRODUCTS TAB (full overhaul) ════════════════════
const EMPTY_PRODUCT = ():Partial<Product>&{[k:string]:any} => ({name:'',slug:'',category:'',tags:'',description:'',short_description:'',category_tagline:'',domain:'',billing_type:'subscription',billing_period:'',price_1m:0,price_3m:0,price_6m:0,price_1y:0,stock_status:'in_stock',status:'active',featured:false,sort_order:100,image_url:''})

function ProductsTab({T}:{T:Theme}) {
  const [allProducts,setAllProducts]=useState<Product[]>([]); const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState(''); const [statusFilter,setStatusFilter]=useState(''); const [categoryFilter,setCategoryFilter]=useState('')
  const [editingId,setEditingId]=useState<string|null>(null); const [editForm,setEditForm]=useState<any>({})
  const [showCreate,setShowCreate]=useState(false); const [newProduct,setNewProduct]=useState<any>(EMPTY_PRODUCT())
  const [creating,setCreating]=useState(false); const [page,setPage]=useState(1); const PAGE_SIZE=24

  // Fetch ALL products for stable client-side filtering+pagination
  const loadAll = useCallback(async()=>{
    setLoading(true)
    const r=await apiFetch('/v2/admin/products?limit=100&page=1')
    let products = r.ok?(r.data||[]):[]
    // If there are more pages, fetch them
    const totalPages = r?.meta?.pagination?.pages||1
    for(let p=2;p<=totalPages;p++){
      const r2=await apiFetch(`/v2/admin/products?limit=100&page=${p}`)
      if(r2.ok&&r2.data) products=products.concat(r2.data)
    }
    setAllProducts(products); setLoading(false)
  },[])
  useEffect(()=>{loadAll()},[])

  // Client-side filter+paginate
  const filtered = useMemo(()=>{
    let list = allProducts
    if(statusFilter) list=list.filter(p=>p.status===statusFilter)
    if(categoryFilter) list=list.filter(p=>(p.category||'').toLowerCase().includes(categoryFilter.toLowerCase()))
    if(search) { const q=search.toLowerCase(); list=list.filter(p=>(p.name||'').toLowerCase().includes(q)||(p.category||'').toLowerCase().includes(q)||(p.tags||'').toLowerCase().includes(q)) }
    return list
  },[allProducts,statusFilter,categoryFilter,search])

  const totalPages = Math.ceil(filtered.length/PAGE_SIZE)
  const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
  useEffect(()=>{setPage(1)},[search,statusFilter,categoryFilter])

  const toggleStatus=async(p:Product)=>{const ns=p.status==='active'?'inactive':'active';const r=await apiFetch(`/v2/admin/products/${p.id}`,{method:'PATCH',body:JSON.stringify({status:ns})});if(r.ok)setAllProducts(prev=>prev.map(x=>x.id===p.id?{...x,status:ns}:x))}
  const toggleStock=async(p:Product)=>{const ns=p.stock_status==='in_stock'?'out_of_stock':'in_stock';const r=await apiFetch(`/v2/admin/products/${p.id}`,{method:'PATCH',body:JSON.stringify({stock_status:ns})});if(r.ok)setAllProducts(prev=>prev.map(x=>x.id===p.id?{...x,stock_status:ns}:x))}
  const archiveProduct=async(p:Product)=>{if(!confirm(`Archive "${p.name}"?`))return;const r=await apiFetch(`/v2/admin/products/${p.id}`,{method:'PATCH',body:JSON.stringify({status:'archived'})});if(r.ok)setAllProducts(prev=>prev.filter(x=>x.id!==p.id))}

  const startEdit=(p:Product)=>{setEditingId(p.id);setEditForm({name:p.name,slug:p.slug,category:p.category,tags:p.tags,description:p.description||'',short_description:p.short_description||'',category_tagline:p.category_tagline||'',domain:p.domain||'',billing_type:p.billing_type||'subscription',billing_period:p.billing_period||'',price_1m:p.price_1m||0,price_3m:p.price_3m||0,price_6m:p.price_6m||0,price_1y:p.price_1y||0,stock_status:p.stock_status,status:p.status,featured:!!p.featured,sort_order:p.sort_order||100,image_url:p.image_url||''})}

  const saveEdit=async()=>{
    if(!editingId)return
    const r=await apiFetch(`/v2/admin/products/${editingId}`,{method:'PATCH',body:JSON.stringify(editForm)})
    if(r.ok&&r.data){ setAllProducts(prev=>prev.map(x=>x.id===editingId?{...x,...r.data}:x)); setEditingId(null) }
    else alert(r.error||r.data?.error||'Failed to save. Check that all fields are valid.')
  }

  const createProduct=async()=>{
    if(!newProduct.name){alert('Name is required');return} setCreating(true)
    const slug = newProduct.slug || newProduct.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-+$/,'')
    const r=await apiFetch('/v2/admin/products',{method:'POST',body:JSON.stringify({...newProduct,slug})})
    if(r.ok){setNewProduct(EMPTY_PRODUCT());setShowCreate(false);await loadAll()}
    else alert(r.error||r.data?.error||'Failed to create. API route /v2/admin/products POST may need to be added.')
    setCreating(false)
  }

  const IS = inputStyle(T)

  // Product form uses module-level ProductFormPanel (prevents focus loss)

  return (
    <div>
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap',alignItems:'center'}}>
        <input placeholder="Search products…" value={search} onChange={e=>setSearch(e.target.value)} style={{...IS,maxWidth:300}}/>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...IS,width:140,flex:'none'}}><option value="">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} style={{...IS,width:200,flex:'none'}}><option value="">All categories</option>{ALL_CATEGORIES.filter(c=>c!=='all').map(c=><option key={c} value={c}>{sentenceCase(c)}</option>)}</select>
        <button onClick={()=>setShowCreate(!showCreate)} style={{height:42,padding:'0 20px',borderRadius:10,background:T.accent,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,marginLeft:'auto'}}>+ New Product</button>
      </div>

      {showCreate&&<ProductFormPanel T={T} form={newProduct} setForm={setNewProduct} onSave={createProduct} onCancel={()=>setShowCreate(false)} saving={creating} title="Create New Product"/>}
      {editingId&&<ProductFormPanel T={T} form={editForm} setForm={setEditForm} onSave={saveEdit} onCancel={()=>setEditingId(null)} title="Edit Product"/>}

      {loading?<Loading T={T}/>:paged.length===0?<EmptyState text="No products found" T={T}/>:(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>
          {paged.map(p=>(
            <div key={p.id} style={{background:T.card,border:`1px solid ${T.borderSubtle}`,borderRadius:16,padding:'20px 22px',opacity:p.status!=='active'?0.55:1,display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                {p.domain&&logoUrl(p.domain)?(<img src={logoUrl(p.domain)} alt="" style={{width:44,height:44,borderRadius:14,background:T.elevated,border:'1px solid rgba(255,255,255,0.06)',objectFit:'contain',flexShrink:0}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>):(<div style={{width:44,height:44,borderRadius:14,background:T.accent+'30',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:T.accent,flexShrink:0}}>{(p.name||'?')[0]}</div>)}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:6}}>
                    <div style={{fontSize:14,fontWeight:600,color:T.text,lineHeight:1.3}}>{p.name}</div>
                    <div style={{display:'flex',gap:4,flexShrink:0}}><Badge status={p.status} T={T}/><Badge status={p.stock_status} T={T}/></div>
                  </div>
                  <div style={{fontSize:12,color:T.accent,marginTop:2}}>{sentenceCase(p.category||'')}</div>
                  {p.tags&&<div style={{fontSize:11,color:T.textMuted,marginTop:1}}>{sentenceCase(p.tags)}</div>}
                  {p.short_description&&<div style={{fontSize:11,color:T.textFaint,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.short_description}</div>}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                {[{l:'1M',v:p.price_1m},{l:'3M',v:p.price_3m},{l:'6M',v:p.price_6m},{l:'1Y',v:p.price_1y}].map(x=>(
                  <div key={x.l} style={{background:T.elevated,borderRadius:10,padding:8,textAlign:'center'}}>
                    <div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.06em'}}>{x.l}</div>
                    <div style={{fontSize:12,fontWeight:600,color:T.text,fontFamily:'monospace',marginTop:2}}>{x.v?fmt(x.v):'—'}</div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                <SmallBtn T={T} color={T.accent} onClick={()=>startEdit(p)}>Edit</SmallBtn>
                <SmallBtn T={T} color={p.status==='active'?T.textMuted:T.success} onClick={()=>toggleStatus(p)}>{p.status==='active'?'Deactivate':'Activate'}</SmallBtn>
                <SmallBtn T={T} color={p.stock_status==='in_stock'?T.warning:T.success} onClick={()=>toggleStock(p)}>{p.stock_status==='in_stock'?'Mark OOS':'In Stock'}</SmallBtn>
                <SmallBtn T={T} color={T.error} onClick={()=>archiveProduct(p)}>Archive</SmallBtn>
              </div>
            </div>
          ))}
        </div>
      )}
      {totalPages>1&&(
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:20,fontSize:12,color:T.textMuted}}>
          <span>Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length} products</span>
          <div style={{display:'flex',gap:8}}>
            <button disabled={page<=1} onClick={()=>setPage(page-1)} style={pageBtnStyle(T,page<=1)}>← Prev</button>
            <button disabled={page>=totalPages} onClick={()=>setPage(page+1)} style={pageBtnStyle(T,page>=totalPages)}>Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════ CUSTOMERS TAB ════════════════════
function CustomersTab({T}:{T:Theme}) {
  const [customers,setCustomers]=useState<Customer[]>([]); const [pagination,setPagination]=useState<Pagination>(emptyPagination)
  const [loading,setLoading]=useState(true); const [search,setSearch]=useState(''); const searchTimer=useRef<any>(null)
  const load=useCallback(async(page=1,q=search)=>{setLoading(true);const params=new URLSearchParams({page:String(page),limit:'30'});if(q)params.set('q',q);const r=await apiFetch(`/v2/admin/customers?${params}`);if(r.ok){setCustomers(r.data||[]);setPagination(parsePagination(r))}setLoading(false)},[search])
  useEffect(()=>{load()},[])
  const onSearch=(q:string)=>{setSearch(q);clearTimeout(searchTimer.current);searchTimer.current=setTimeout(()=>load(1,q),400)}
  return (
    <div>
      <input placeholder="Search customers…" value={search} onChange={e=>onSearch(e.target.value)} style={{...inputStyle(T),marginBottom:20}}/>
      {loading?<Loading T={T}/>:customers.length===0?<EmptyState text="No customers found" T={T}/>:(
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{borderBottom:`2px solid ${T.border}`}}>
              {['Name','Email','Phone','Category','Source','Active','Joined'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:11,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
            </tr></thead>
            <tbody>{customers.map(c=>(
              <tr key={c.id} style={{borderBottom:`1px solid ${T.borderSubtle}`}}>
                <td style={{padding:12,color:T.text,fontWeight:500}}>{c.name||'—'}</td>
                <td style={{padding:12,color:T.textSecondary}}>{c.email||'—'}</td>
                <td style={{padding:12,color:T.textSecondary}}>{c.phone||'—'}</td>
                <td style={{padding:12,color:T.textMuted}}>{c.category||'—'}</td>
                <td style={{padding:12,color:T.textMuted}}>{c.source||'—'}</td>
                <td style={{padding:12}}><Badge status={c.is_active?'active':'inactive'} T={T}/></td>
                <td style={{padding:12,color:T.textMuted,whiteSpace:'nowrap'}}>{fmtDate(c.created_at)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {pagination?.pages>1&&<PaginationBar T={T} pagination={pagination} onPage={p=>load(p)}/>}
    </div>
  )
}

// ════════════════════ PARTNERS TAB ════════════════════
function PartnersTab({T}:{T:Theme}) {
  const [apps,setApps]=useState<PartnerApp[]>([]); const [pagination,setPagination]=useState<Pagination>(emptyPagination)
  const [loading,setLoading]=useState(true); const [statusFilter,setStatusFilter]=useState(''); const [expanded,setExpanded]=useState<string|null>(null)
  const [actionLoading,setActionLoading]=useState<string|null>(null)
  const load=useCallback(async(page=1,status=statusFilter)=>{setLoading(true);const params=new URLSearchParams({page:String(page),limit:'20'});if(status)params.set('status',status);const r=await apiFetch(`/v2/admin/partners?${params}`);if(r.ok){setApps(r.data||[]);setPagination(parsePagination(r))}setLoading(false)},[statusFilter])
  useEffect(()=>{load()},[])
  const approve=async(id:string)=>{const notes=prompt('Approval notes (optional):');if(notes===null)return;setActionLoading(id);const r=await apiFetch(`/v2/admin/partners/${id}/approve`,{method:'POST',body:JSON.stringify({notes})});if(r.ok)await load(pagination.page);else alert(r.error||'Failed');setActionLoading(null)}
  const reject=async(id:string)=>{const reason=prompt('Rejection reason:');if(!reason)return;setActionLoading(id);const r=await apiFetch(`/v2/admin/partners/${id}/reject`,{method:'POST',body:JSON.stringify({reason})});if(r.ok)await load(pagination.page);else alert(r.error||'Failed');setActionLoading(null)}
  return (
    <div>
      <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);load(1,e.target.value)}} style={{...inputStyle(T),width:200,marginBottom:20}}>
        <option value="">All applications</option><option value="pending_review">Pending Review</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
      </select>
      {loading?<Loading T={T}/>:apps.length===0?<EmptyState text="No partner applications" T={T}/>:(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {apps.map(a=>(
            <div key={a.id} style={{background:T.card,border:`1px solid ${T.borderSubtle}`,borderRadius:16,overflow:'hidden'}}>
              <div onClick={()=>setExpanded(expanded===a.id?null:a.id)} style={{padding:'16px 22px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:14,color:T.text,fontWeight:500}}>{a.legal_name}</div>
                  <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>{a.owner_name} · {a.business_email} · {a.state}</div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
                  <Badge status={a.status} T={T}/><span style={{fontSize:11,color:T.textMuted}}>{fmtDate(a.created_at)}</span>
                  <span style={{color:T.textMuted}}>{expanded===a.id?'▾':'▸'}</span>
                </div>
              </div>
              {expanded===a.id&&(
                <div style={{padding:'0 22px 22px',borderTop:`1px solid ${T.borderSubtle}`}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:20,padding:'18px 0'}}>
                    <DetailSection T={T} title="Business">
                      <DRow T={T} label="Store" value={a.store_name}/><DRow T={T} label="Address" value={a.address}/>
                      <DRow T={T} label="LGA/State" value={`${a.lga}, ${a.state}`}/><DRow T={T} label="Phone" value={a.business_phone}/>
                      <DRow T={T} label="CAC" value={a.cac_number||'—'}/>
                    </DetailSection>
                    <DetailSection T={T} title="Owner">
                      <DRow T={T} label="Name" value={a.owner_name}/><DRow T={T} label="Email" value={a.owner_email}/>
                      <DRow T={T} label="Phone" value={a.owner_phone}/><DRow T={T} label="Gender" value={a.gender||'—'}/>
                    </DetailSection>
                    <DetailSection T={T} title="Payout">
                      <DRow T={T} label="Frequency" value={a.payout_frequency}/><DRow T={T} label="Method" value={a.payout_method}/>
                      {a.bank_name&&<DRow T={T} label="Bank" value={`${a.bank_name} - ${a.account_name}`}/>}
                    </DetailSection>
                  </div>
                  {a.status==='pending_review'&&(
                    <div style={{display:'flex',gap:8}}>
                      <SmallBtn T={T} color={T.success} onClick={()=>approve(a.id)} disabled={actionLoading===a.id}>{actionLoading===a.id?'…':'✓ Approve'}</SmallBtn>
                      <SmallBtn T={T} color={T.error} onClick={()=>reject(a.id)} disabled={actionLoading===a.id}>✕ Reject</SmallBtn>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {pagination?.pages>1&&<PaginationBar T={T} pagination={pagination} onPage={p=>load(p)}/>}
    </div>
  )
}

// ════════════════════ WALLETS TAB ════════════════════
function WalletsTab({T}:{T:Theme}) {
  const [loading,setLoading]=useState(true)
  useEffect(()=>{apiFetch('/v2/admin/wallets?page=1&limit=20').finally(()=>setLoading(false))},[])
  if(loading) return <Loading T={T}/>
  return <EmptyState text="Wallet transactions will appear here once customers start using wallets." T={T}/>
}

// ════════════════════ AFFILIATES TAB ════════════════════
function AffiliatesTab({T}:{T:Theme}) {
  const [affiliates,setAffiliates]=useState<any[]>([]); const [pagination,setPagination]=useState<Pagination>(emptyPagination)
  const [loading,setLoading]=useState(true); const [statusFilter,setStatusFilter]=useState(''); const [actionLoading,setActionLoading]=useState<string|null>(null)
  const load=useCallback(async(page=1,status=statusFilter)=>{setLoading(true);const params=new URLSearchParams({page:String(page),limit:'20'});if(status)params.set('status',status);const r=await apiFetch(`/v2/admin/affiliates?${params}`);if(r.ok){setAffiliates(r.data||[]);setPagination(parsePagination(r))}setLoading(false)},[statusFilter])
  useEffect(()=>{load()},[])
  const approve=async(id:string)=>{const rate=prompt('Commission rate (%):','5');if(rate===null)return;setActionLoading(id);await apiFetch(`/v2/admin/affiliates/${id}/approve`,{method:'POST',body:JSON.stringify({commission_rate:parseFloat(rate)||5})});await load(pagination.page);setActionLoading(null)}
  const suspend=async(id:string)=>{setActionLoading(id);await apiFetch(`/v2/admin/affiliates/${id}/suspend`,{method:'POST',body:JSON.stringify({reason:'Admin action'})});await load(pagination.page);setActionLoading(null)}
  return (
    <div>
      <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);load(1,e.target.value)}} style={{...inputStyle(T),width:170,marginBottom:20}}>
        <option value="">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="suspended">Suspended</option>
      </select>
      {loading?<Loading T={T}/>:affiliates.length===0?<EmptyState text="No affiliates" T={T}/>:(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {affiliates.map((a:any)=>(
            <div key={a.id} style={{background:T.card,border:`1px solid ${T.borderSubtle}`,borderRadius:16,padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              <div>
                <div style={{fontSize:14,fontWeight:500,color:T.text}}>{a.business_name||a.store_name||'—'}</div>
                <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>Code: <span style={{fontFamily:'monospace',background:T.elevated,padding:'2px 8px',borderRadius:6}}>{a.referral_code}</span> · {a.commission_rate}%</div>
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <Badge status={a.status} T={T}/>
                {a.status==='pending'&&<SmallBtn T={T} color={T.success} onClick={()=>approve(a.id)} disabled={actionLoading===a.id}>Approve</SmallBtn>}
                {a.status==='approved'&&<SmallBtn T={T} color={T.warning} onClick={()=>suspend(a.id)} disabled={actionLoading===a.id}>Suspend</SmallBtn>}
              </div>
            </div>
          ))}
        </div>
      )}
      {pagination?.pages>1&&<PaginationBar T={T} pagination={pagination} onPage={p=>load(p)}/>}
    </div>
  )
}

// ════════════════════ LINKS TAB ════════════════════
function LinksTab({T}:{T:Theme}) {
  const [links,setLinks]=useState<any[]>([]); const [pagination,setPagination]=useState<Pagination>(emptyPagination)
  const [loading,setLoading]=useState(true); const [search,setSearch]=useState('')
  const [showCreate,setShowCreate]=useState(false); const [newSlug,setNewSlug]=useState(''); const [newDest,setNewDest]=useState(''); const [newTags,setNewTags]=useState('')
  const [creating,setCreating]=useState(false); const searchTimer=useRef<any>(null)
  const load=useCallback(async(page=1,q=search)=>{setLoading(true);const params=new URLSearchParams({page:String(page),limit:'20'});if(q)params.set('q',q);const r=await apiFetch(`/v2/admin/links?${params}`);if(r.ok){setLinks(r.data||[]);setPagination(parsePagination(r))}setLoading(false)},[search])
  useEffect(()=>{load()},[])
  const onSearch=(q:string)=>{setSearch(q);clearTimeout(searchTimer.current);searchTimer.current=setTimeout(()=>load(1,q),400)}
  const createLink=async()=>{if(!newDest)return;setCreating(true);const r=await apiFetch('/v2/admin/links',{method:'POST',body:JSON.stringify({slug:newSlug||undefined,destination_url:newDest,tags:newTags||undefined})});if(r.ok){setNewSlug('');setNewDest('');setNewTags('');setShowCreate(false);await load(1)}else alert(r.error||'Failed');setCreating(false)}
  const toggleActive=async(l:any)=>{const r=await apiFetch(`/v2/admin/links/${l.id}`,{method:'PATCH',body:JSON.stringify({active:!l.active})});if(r.ok)setLinks(prev=>prev.map(x=>x.id===l.id?{...x,active:!l.active}:x))}
  const deleteLink=async(id:string)=>{if(!confirm('Delete this link?'))return;await apiFetch(`/v2/admin/links/${id}`,{method:'DELETE'});await load(pagination.page)}
  const IS=inputStyle(T)
  return (
    <div>
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <input placeholder="Search…" value={search} onChange={e=>onSearch(e.target.value)} style={IS}/>
        <button onClick={()=>setShowCreate(!showCreate)} style={{height:42,padding:'0 20px',borderRadius:10,background:T.accent,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600}}>+ New Link</button>
      </div>
      {showCreate&&(
        <div style={{background:T.card,border:`1px solid ${T.borderSubtle}`,borderRadius:16,padding:20,marginBottom:20,display:'flex',flexDirection:'column',gap:10}}>
          <input placeholder="Destination URL *" value={newDest} onChange={e=>setNewDest(e.target.value)} style={IS}/>
          <div style={{display:'flex',gap:10}}><input placeholder="Custom slug" value={newSlug} onChange={e=>setNewSlug(e.target.value)} style={IS}/><input placeholder="Tags" value={newTags} onChange={e=>setNewTags(e.target.value)} style={IS}/></div>
          <div style={{display:'flex',gap:6}}><SmallBtn T={T} color={T.accent} onClick={createLink}>{creating?'…':'Create'}</SmallBtn><SmallBtn T={T} color={T.textMuted} onClick={()=>setShowCreate(false)}>Cancel</SmallBtn></div>
        </div>
      )}
      {loading?<Loading T={T}/>:links.length===0?<EmptyState text="No links" T={T}/>:(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {links.map((l:any)=>(
            <div key={l.id} style={{background:T.card,border:`1px solid ${T.borderSubtle}`,borderRadius:16,padding:'14px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,opacity:l.active?1:0.5,flexWrap:'wrap'}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,color:T.accent,fontFamily:'monospace'}}>/{l.slug}</div>
                <div style={{fontSize:12,color:T.textMuted,marginTop:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.destination_url}</div>
                <div style={{fontSize:11,color:T.textFaint,marginTop:2}}>{l.click_count||0} clicks · {l.tags||'—'}</div>
              </div>
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                <SmallBtn T={T} color={l.active?T.warning:T.success} onClick={()=>toggleActive(l)}>{l.active?'Pause':'Resume'}</SmallBtn>
                <SmallBtn T={T} color={T.error} onClick={()=>deleteLink(l.id)}>Delete</SmallBtn>
              </div>
            </div>
          ))}
        </div>
      )}
      {pagination?.pages>1&&<PaginationBar T={T} pagination={pagination} onPage={p=>load(p)}/>}
    </div>
  )
}

// ════════════════════ ADS TAB ════════════════════
function AdsTab({T}:{T:Theme}) {
  const [ads,setAds]=useState<any[]>([]); const [pagination,setPagination]=useState<Pagination>(emptyPagination)
  const [loading,setLoading]=useState(true); const [showCreate,setShowCreate]=useState(false); const [creating,setCreating]=useState(false)
  const PLACEMENTS=['shop_banner','shop_sidebar','shop_product_card','cart_drawer','receipt_footer']
  const [newAd,setNewAd]=useState({title:'',image_url:'',link:'',placement:'shop_banner'})
  const load=useCallback(async(page=1)=>{setLoading(true);const r=await apiFetch(`/v2/admin/ads?page=${page}&limit=20`);if(r.ok){setAds(r.data||[]);setPagination(parsePagination(r))}setLoading(false)},[])
  useEffect(()=>{load()},[])
  const createAd=async()=>{if(!newAd.title||!newAd.image_url||!newAd.link)return;setCreating(true);const r=await apiFetch('/v2/admin/ads',{method:'POST',body:JSON.stringify(newAd)});if(r.ok){setNewAd({title:'',image_url:'',link:'',placement:'shop_banner'});setShowCreate(false);await load(1)}else alert(r.error||'Failed');setCreating(false)}
  const toggleActive=async(a:any)=>{const r=await apiFetch(`/v2/admin/ads/${a.id}`,{method:'PATCH',body:JSON.stringify({active:!a.active})});if(r.ok)setAds(prev=>prev.map(x=>x.id===a.id?{...x,active:!a.active}:x))}
  const deleteAd=async(id:string)=>{if(!confirm('Delete this ad?'))return;await apiFetch(`/v2/admin/ads/${id}`,{method:'DELETE'});await load(pagination.page)}
  const IS=inputStyle(T)
  return (
    <div>
      <button onClick={()=>setShowCreate(!showCreate)} style={{height:42,padding:'0 20px',borderRadius:10,background:T.accent,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,marginBottom:20}}>+ New Ad</button>
      {showCreate&&(
        <div style={{background:T.card,border:`1px solid ${T.borderSubtle}`,borderRadius:16,padding:20,marginBottom:20,display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10}}>
            <input placeholder="Title *" value={newAd.title} onChange={e=>setNewAd({...newAd,title:e.target.value})} style={IS}/>
            <input placeholder="Image URL *" value={newAd.image_url} onChange={e=>setNewAd({...newAd,image_url:e.target.value})} style={IS}/>
            <input placeholder="Link URL *" value={newAd.link} onChange={e=>setNewAd({...newAd,link:e.target.value})} style={IS}/>
            <select value={newAd.placement} onChange={e=>setNewAd({...newAd,placement:e.target.value})} style={IS}>{PLACEMENTS.map(p=><option key={p} value={p}>{p.replace(/_/g,' ')}</option>)}</select>
          </div>
          <div style={{display:'flex',gap:6}}><SmallBtn T={T} color={T.accent} onClick={createAd}>{creating?'…':'Create'}</SmallBtn><SmallBtn T={T} color={T.textMuted} onClick={()=>setShowCreate(false)}>Cancel</SmallBtn></div>
        </div>
      )}
      {loading?<Loading T={T}/>:ads.length===0?<EmptyState text="No ads" T={T}/>:(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {ads.map((a:any)=>(
            <div key={a.id} style={{background:T.card,border:`1px solid ${T.borderSubtle}`,borderRadius:16,padding:'14px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,opacity:a.active?1:0.5,flexWrap:'wrap'}}>
              <div style={{display:'flex',gap:12,alignItems:'center',minWidth:0}}>
                <img src={a.image_url} alt="" style={{width:44,height:44,borderRadius:10,objectFit:'cover',flexShrink:0}}/>
                <div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:500,color:T.text}}>{a.title}</div><div style={{fontSize:11,color:T.textMuted}}>{a.placement?.replace(/_/g,' ')} · {a.click_count||0} clicks · {a.view_count||0} views</div></div>
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <SmallBtn T={T} color={a.active?T.warning:T.success} onClick={()=>toggleActive(a)}>{a.active?'Pause':'Resume'}</SmallBtn>
                <SmallBtn T={T} color={T.error} onClick={()=>deleteAd(a.id)}>Delete</SmallBtn>
              </div>
            </div>
          ))}
        </div>
      )}
      {pagination?.pages>1&&<PaginationBar T={T} pagination={pagination} onPage={p=>load(p)}/>}
    </div>
  )
}


// ════════════════════ DISCOUNTS TAB (full CRUD) ════════════════════
const EMPTY_DISCOUNT = (): any => ({ code: '', type: 'percentage', value: 0, active: true, min_order_ngn: 0, max_uses: null, expires_at: null, active_from: null, max_discount_ngn: null, included_products: null, excluded_products: null, included_categories: null, excluded_categories: null, auto_apply: false, scope: 'site_wide', exclusive: false })

function DiscountsTab({ T }: { T: Theme }) {
  const [discounts, setDiscounts] = useState<Discount[]>([]); const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false); const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [newDiscount, setNewDiscount] = useState<any>(EMPTY_DISCOUNT())
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await apiFetch('/v2/admin/discounts?limit=100')
    if (r.ok) setDiscounts(r.data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [])

  const createDiscount = async () => {
    if (!newDiscount.code) { alert('Code is required'); return }
    setCreating(true)
    const r = await apiFetch('/v2/admin/discounts', { method: 'POST', body: JSON.stringify({ ...newDiscount, code: newDiscount.code.toUpperCase() }) })
    if (r.ok) { setNewDiscount(EMPTY_DISCOUNT()); setShowCreate(false); await load() }
    else alert(r.error || r.data?.error || 'Failed to create discount')
    setCreating(false)
  }

  const startEdit = (d: Discount) => {
    setEditingId(d.id); setExpanded(null)
    setEditForm({ code: d.code, type: d.type, value: d.value, active: d.active, min_order_ngn: d.min_order_ngn || 0, max_uses: d.max_uses, expires_at: d.expires_at ? d.expires_at.slice(0, 10) : '', active_from: d.active_from ? d.active_from.slice(0, 10) : '', max_discount_ngn: d.max_discount_ngn, included_products: d.included_products || '', excluded_products: d.excluded_products || '', included_categories: d.included_categories || '', excluded_categories: d.excluded_categories || '', auto_apply: !!d.auto_apply, scope: d.scope || 'site_wide', exclusive: !!d.exclusive })
  }

  const saveEdit = async () => {
    if (!editingId) return
    const r = await apiFetch(`/v2/admin/discounts/${editingId}`, { method: 'PATCH', body: JSON.stringify(editForm) })
    if (r.ok) { setEditingId(null); await load() } else alert(r.error || r.data?.error || 'Failed to update')
  }

  const deleteDiscount = async (id: string) => {
    if (!confirm('Delete this discount code?')) return
    const r = await apiFetch(`/v2/admin/discounts/${id}`, { method: 'DELETE' })
    if (r.ok) await load(); else alert(r.error || 'Failed')
  }

  const toggleActive = async (d: Discount) => {
    const r = await apiFetch(`/v2/admin/discounts/${d.id}`, { method: 'PATCH', body: JSON.stringify({ active: !d.active }) })
    if (r.ok) setDiscounts(prev => prev.map(x => x.id === d.id ? { ...x, active: !d.active } : x))
  }

  return (
    <div>
      <button onClick={() => { setShowCreate(!showCreate); setEditingId(null) }} style={{ height: 42, padding: '0 20px', borderRadius: 10, background: T.accent, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 20 }}>+ New Discount</button>

      {showCreate && <DiscountFormPanel T={T} form={newDiscount} setForm={setNewDiscount} onSave={createDiscount} onCancel={() => setShowCreate(false)} saving={creating} title="Create Discount Code" />}
      {editingId && <DiscountFormPanel T={T} form={editForm} setForm={setEditForm} onSave={saveEdit} onCancel={() => setEditingId(null)} title="Edit Discount Code" />}

      {loading ? <Loading T={T} /> : discounts.length === 0 ? <EmptyState text="No discount codes" T={T} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {discounts.map(d => (
            <div key={d.id} style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 16, overflow: 'hidden', opacity: d.active ? 1 : 0.55 }}>
              <div onClick={() => setExpanded(expanded === d.id ? null : d.id)} style={{ padding: '14px 22px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: T.accent, background: T.accent + '18', padding: '3px 10px', borderRadius: 6 }}>{d.code}</span>
                  <span style={{ fontSize: 13, color: T.text }}>{d.type === 'percentage' ? `${d.value}% off` : `₦${Number(d.value).toLocaleString()} off`}</span>
                  <Badge status={d.active ? 'active' : 'inactive'} T={T} />
                  {d.auto_apply && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: T.accent + '15', color: T.accent, fontWeight: 600 }}>Auto</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: T.textMuted }}>{d.times_used || 0} uses</span>
                  <span style={{ color: T.textMuted }}>{expanded === d.id ? '▾' : '▸'}</span>
                </div>
              </div>
              {expanded === d.id && (
                <div style={{ padding: '0 22px 18px', borderTop: `1px solid ${T.borderSubtle}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, padding: '14px 0' }}>
                    <DetailSection T={T} title="Rules">
                      <DRow T={T} label="Min Order" value={d.min_order_ngn ? fmt(d.min_order_ngn) : 'None'} />
                      <DRow T={T} label="Max Discount" value={d.max_discount_ngn ? fmt(d.max_discount_ngn) : 'No cap'} />
                      <DRow T={T} label="Max Uses" value={d.max_uses ? String(d.max_uses) : 'Unlimited'} />
                      <DRow T={T} label="Used" value={String(d.times_used || 0)} />
                    </DetailSection>
                    <DetailSection T={T} title="Dates">
                      <DRow T={T} label="Active From" value={d.active_from ? fmtDate(d.active_from) : 'Immediately'} />
                      <DRow T={T} label="Expires" value={d.expires_at ? fmtDate(d.expires_at) : 'Never'} />
                      <DRow T={T} label="Created" value={fmtDate(d.created_at)} />
                    </DetailSection>
                    <DetailSection T={T} title="Targeting">
                      <DRow T={T} label="Scope" value={d.scope || 'site_wide'} />
                      <DRow T={T} label="Incl. Products" value={d.included_products || 'All'} />
                      <DRow T={T} label="Excl. Products" value={d.excluded_products || 'None'} />
                    </DetailSection>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <SmallBtn T={T} color={T.accent} onClick={() => startEdit(d)}>Edit</SmallBtn>
                    <SmallBtn T={T} color={d.active ? T.warning : T.success} onClick={() => toggleActive(d)}>{d.active ? 'Deactivate' : 'Activate'}</SmallBtn>
                    <SmallBtn T={T} color={T.error} onClick={() => deleteDiscount(d.id)}>Delete</SmallBtn>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}