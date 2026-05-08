'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"

const API = process.env.NEXT_PUBLIC_API_URL!
const LOGO_DEV_TOKEN = 'pk_S77F38yQR6WQWErhPEEp1w'
const ALL_CATEGORIES = ['all','music streaming','video streaming','security','ai','productivity','sports','bundles','education','cloud','gaming','services','coins','social media','lifestyle']

// ── Types ──
interface Stats { total_revenue: number; revenue_today: number; revenue_this_month: number; orders_total: number; orders_today: number; orders_pending_manual: number; orders_paid: number; orders_rejected_pending: number; products_active: number; products_total: number; customers_total: number; partners_pending: number; top_products: { name: string; slug: string; order_count: number; revenue: number }[]; recent_orders: any[]; revenue_by_day: { day: string; revenue: number; orders: number }[] }
interface Order { id: string; order_ref: string; status: string; total_ngn: number; subtotal_ngn: number; discount_ngn: number; payment_method: string; currency: string; created_at: string; updated_at: string; customer_name: string|null; customer_email: string|null; customer_phone: string|null; notes: string|null; order_items?: any[] }
interface Product { id: string; name: string; slug: string; category: string; tags: string; price_1m: number; price_3m: number; price_6m: number; price_1y: number; billing_type: string; stock_status: string; status: string; domain: string; short_description: string; description: string; featured: boolean; created_at: string; sort_order: number; image_url: string; category_tagline: string; billing_period: string; whatsapp_group_url?: string
  social_links?: {
    telegram?: string
    instagram?: string
    twitter?: string
    tiktok?: string
    discord?: string
    website?: string
  } | null }
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
  if (s==='cancelled'||s==='rejected'||s==='out_of_stock'||s==='hidden'||s==='suspended'||s==='archived') return {bg:'rgba(220,38,38,0.12)',color:'#dc2626'}
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
    <div style={{ background: T.bg, minHeight: '100vh', color: T.text, fontFamily: 'Inter,sans-serif', padding: '0 24px 60px', paddingTop: 'calc(2vh + 16px)', boxSizing: 'border-box', transition: 'background 0.2s, color 0.2s' }}>
      <div style={{ margin: '0 auto', width: '100%' }}>
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
  const IS: React.CSSProperties = {
    height: 42,
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
    fontFamily: 'Inter,sans-serif',
  }
  const updateField = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }))
  const sl = form.social_links || {}
  const updateSocial = (k: string, v: string) => {
    setForm((f: any) => ({ ...f, social_links: { ...(f.social_links || {}), [k]: v } }))
  }
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
      {/* ── New: WhatsApp & Social Links ─────────────── */}
      <div style={{
        marginTop: 12, padding: '16px 18px',
        background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 12,
      }}>
        <div style={{
          fontSize: 10, color: T.textMuted, textTransform: 'uppercase',
          letterSpacing: '0.08em', fontWeight: 600, marginBottom: 12,
        }}>
          Product community links
        </div>
 
        <div style={{ marginBottom: 12 }}>
          <FieldLabel label="WhatsApp Group URL" T={T}>
            <input
              style={IS}
              value={form.whatsapp_group_url || ''}
              onChange={e => setForm((f: any) => ({ ...f, whatsapp_group_url: e.target.value }))}
              placeholder="https://chat.whatsapp.com/…"
            />
          </FieldLabel>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
            Shown in the order confirmation email and the admin WA approval message.
          </div>
        </div>
 
        {/* <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FieldLabel label="Telegram" T={T}>
            <input style={IS} value={sl.telegram || ''} onChange={e => updateSocial('telegram', e.target.value)} placeholder="https://t.me/…" />
          </FieldLabel>
          <FieldLabel label="Discord" T={T}>
            <input style={IS} value={sl.discord || ''} onChange={e => updateSocial('discord', e.target.value)} placeholder="https://discord.gg/…" />
          </FieldLabel>
          <FieldLabel label="Instagram" T={T}>
            <input style={IS} value={sl.instagram || ''} onChange={e => updateSocial('instagram', e.target.value)} placeholder="https://instagram.com/…" />
          </FieldLabel>
          <FieldLabel label="Twitter / X" T={T}>
            <input style={IS} value={sl.twitter || ''} onChange={e => updateSocial('twitter', e.target.value)} placeholder="https://x.com/…" />
          </FieldLabel>
          <FieldLabel label="TikTok" T={T}>
            <input style={IS} value={sl.tiktok || ''} onChange={e => updateSocial('tiktok', e.target.value)} placeholder="https://tiktok.com/@…" />
          </FieldLabel>
          <FieldLabel label="Website" T={T}>
            <input style={IS} value={sl.website || ''} onChange={e => updateSocial('website', e.target.value)} placeholder="https://…" />
          </FieldLabel>
        </div> */}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <FieldLabel label="Billing Type" T={T}><select style={IS} value={form.billing_type || 'subscription'} onChange={e => updateField('billing_type', e.target.value)}><option value="subscription">Subscription</option><option value="one_time">One-time</option></select></FieldLabel>
        <FieldLabel label="Stock Status" T={T}><select style={IS} value={form.stock_status || 'in_stock'} onChange={e => updateField('stock_status', e.target.value)}><option value="in_stock">In Stock</option><option value="out_of_stock">Out of Stock</option><option value="preorder">Preorder</option></select></FieldLabel>
        <FieldLabel label="Status" T={T}><select style={IS} value={form.status || 'active'} onChange={e => updateField('status', e.target.value)}><option value="active">Active</option><option value="hidden">hidden</option><option value="archived">Archived</option></select></FieldLabel>
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

// ════════════════════════════════════════════════════════════════════
// NEW ORDER DRAWER — module-level, stable reference (no focus loss)
// ════════════════════════════════════════════════════════════════════

const BILLING_PERIODS = ['Monthly', 'Quarterly', 'Biannual', 'Annual', 'One-time']
const PAYMENT_METHODS_MANUAL: { label: string; value: string }[] = [
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Cash',          value: 'cash' },
  { label: 'WhatsApp',      value: 'whatsapp' },
  { label: 'Coupon',        value: 'coupon' },
  { label: 'Cashback',      value: 'cashback' },
  { label: 'POS',           value: 'pos' },
  { label: 'Manual',        value: 'manual' },
]

type NewOrderItem = {
  _key: string          // local only
  product_id: string
  product_name: string
  billing_period: string
  duration_months: number
  unit_price_ngn: number | ''
  quantity: number
  is_overridden: boolean
}

const BILLING_MONTHS: Record<string, number> = {
  Monthly: 1, Quarterly: 3, Biannual: 6, Annual: 12, 'One-time': 1,
}

const PRICE_FIELD: Record<string, keyof Product> = {
  Monthly: 'price_1m', Quarterly: 'price_3m', Biannual: 'price_6m', Annual: 'price_1y', 'One-time': 'price_1m',
}

function newItemRow(): NewOrderItem {
  return {
    _key: Math.random().toString(36).slice(2),
    product_id: '',
    product_name: '',
    billing_period: 'Quarterly',
    duration_months: 3,
    unit_price_ngn: '',
    quantity: 1,
    is_overridden: false,
  }
}

// ── Inline product search combobox (stable, module-level) ──
function ProductSearchBox({
  T, allProducts, value, onChange,
}: {
  T: Theme
  allProducts: Product[]
  value: NewOrderItem
  onChange: (patch: Partial<NewOrderItem>) => void
}) {
  const [query, setQuery] = useState(value.product_name)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value.product_name) }, [value.product_name])

  const filtered = query.length > 0
    ? allProducts
        .filter(p =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.category || '').toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 8)
    : []

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectProduct = (p: Product) => {
    const priceField = PRICE_FIELD[value.billing_period] || 'price_3m'
    const price = (p[priceField] as number) || 0
    setQuery(p.name)
    setOpen(false)
    setActiveIdx(-1)
    onChange({
      product_id: p.id,
      product_name: p.name,
      unit_price_ngn: price,
      is_overridden: false,
    })
  }

  const IS: React.CSSProperties = {
    height: 40, padding: '0 12px', borderRadius: 10, fontSize: 13,
    width: '100%', background: T.input, border: `1px solid ${T.border}`,
    color: T.text, boxSizing: 'border-box', outline: 'none',
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1 }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIdx(-1) }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (!open || !filtered.length) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)) }
          if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
          if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); selectProduct(filtered[activeIdx]) }
          if (e.key === 'Escape') setOpen(false)
        }}
        placeholder="Search product…"
        style={IS}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: T.elevated, border: `1px solid ${T.border}`,
          borderRadius: 10, zIndex: 300, boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
          maxHeight: 260, overflowY: 'auto',
        }}>
          {filtered.map((p, i) => (
            <div
              key={p.id}
              onMouseDown={() => selectProduct(p)}
              style={{
                padding: '9px 13px',
                cursor: 'pointer',
                background: i === activeIdx ? T.muted : 'transparent',
                borderBottom: `1px solid ${T.borderSubtle}`,
              }}
            >
              <div style={{ fontSize: 13, color: T.text }}>{p.name}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                <span>{sentenceCase(p.category || '')}</span>
                <span style={{ fontFamily: 'monospace' }}>
                  {fmt((p[PRICE_FIELD['Quarterly']] as number) || 0)} /qtr
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main drawer ──
function NewOrderDrawer({
  T, allProducts, onClose, onCreated,
}: {
  T: Theme
  allProducts: Product[]
  onClose: () => void
  onCreated: () => void
}) {
  const [custName,    setCustName]    = useState('')
  const [custEmail,   setCustEmail]   = useState('')
  const [custPhone,   setCustPhone]   = useState('')
  const [payMethod,   setPayMethod]   = useState('bank_transfer')
  const [orderStatus, setOrderStatus] = useState('pending_manual')
  const [notes,       setNotes]       = useState('')
  const [items,       setItems]       = useState<NewOrderItem[]>([newItemRow()])
  const [saving,      setSaving]      = useState(false)
  const [errors,      setErrors]      = useState<Record<string, string>>({})

  // Discount state
  const [discountMode,  setDiscountMode]  = useState<'code' | 'manual'>('code')
  const [discountCode,  setDiscountCode]  = useState('')
  const [discountType,  setDiscountType]  = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [discountValid, setDiscountValid] = useState<{ display: string; ngn: number } | null>(null)
  const [discountError, setDiscountError] = useState('')
  const [discountChecking, setDiscountChecking] = useState(false)

  const setItem = (key: string, patch: Partial<NewOrderItem>) =>
    setItems(prev => prev.map(i => i._key === key ? { ...i, ...patch } : i))

  const onPeriodChange = (item: NewOrderItem, period: string) => {
    const product = allProducts.find(p => p.id === item.product_id)
    const priceField = PRICE_FIELD[period] || 'price_3m'
    const price = product ? ((product[priceField] as number) || 0) : 0
    setItem(item._key, {
      billing_period: period,
      duration_months: BILLING_MONTHS[period] || 3,
      unit_price_ngn: price,
      is_overridden: false,
    })
  }

  const subtotal = items.reduce((s, i) => {
    const price = typeof i.unit_price_ngn === 'number' ? i.unit_price_ngn : 0
    return s + price * i.quantity
  }, 0)
  
  // Compute discount NGN from whichever mode is active
  const discNGN = (() => {
    if (discountMode === 'code') return discountValid?.ngn ?? 0
    if (!discountValue) return 0
    const v = parseFloat(discountValue) || 0
    if (discountType === 'percentage') return Math.round(subtotal * v / 100)
    return v
  })()
  
  const total = Math.max(0, subtotal - discNGN)

  const applyDiscountCode = async () => {
    const code = discountCode.trim().toUpperCase()
    if (!code) return
    setDiscountChecking(true)
    setDiscountError('')
    setDiscountValid(null)
    const r = await apiFetch(`/v2/admin/discounts?code=${encodeURIComponent(code)}`)
    if (!r.ok || !r.data?.length) {
      setDiscountError('Code not found or inactive.')
      setDiscountChecking(false)
      return
    }
    const d = r.data[0]
    if (!d.active) { setDiscountError('Code is inactive.'); setDiscountChecking(false); return }
    if (d.expires_at && new Date(d.expires_at) < new Date()) { setDiscountError('Code has expired.'); setDiscountChecking(false); return }
    if (d.max_uses != null && d.times_used >= d.max_uses) { setDiscountError('Usage limit reached.'); setDiscountChecking(false); return }
    const minNGN = Number(d.min_order_ngn) || 0
    if (minNGN > 0 && subtotal < minNGN) {
      setDiscountError(`Minimum order of ${fmt(minNGN)} required.`)
      setDiscountChecking(false)
      return
    }
    const v = Number(d.value) || 0
    let ngn = d.type === 'percentage' ? Math.round(subtotal * v / 100) : v
    if (d.max_discount_ngn) ngn = Math.min(ngn, Number(d.max_discount_ngn))
    const display = d.type === 'percentage'
      ? `${v}% off${d.max_discount_ngn ? ` (max ${fmt(d.max_discount_ngn)})` : ''}`
      : `${fmt(v)} off`
    setDiscountValid({ display, ngn })
    setDiscountChecking(false)
  }
  
  const validate = () => {
    const e: Record<string, string> = {}
    if (!custEmail.trim()) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(custEmail)) e.email = 'Invalid email'
    if (items.some(i => !i.product_id)) e.items = 'All items must have a product selected'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    const payload = {
      customer_name:  custName  || null,
      customer_email: custEmail.trim(),
      customer_phone: custPhone || null,
      payment_method: payMethod,
      status:         orderStatus,
      notes:          notes || null,
      discount_ngn:   discNGN,
      discount_code:  discountMode === 'code' && discountValid ? discountCode.trim().toUpperCase() : null,
      items: items.map(i => ({
        product_id:      i.product_id,
        billing_period:  i.billing_period,
        duration_months: i.duration_months,
        unit_price_ngn:  typeof i.unit_price_ngn === 'number' ? i.unit_price_ngn : 0,
        quantity:        i.quantity,
      })),
    }
    const r = await apiFetch('/v2/admin/orders', { method: 'POST', body: JSON.stringify(payload) })
    setSaving(false)
    if (r.ok) {
      toast.success(`Order ${r.data?.order_ref} created`)
      onCreated()
      onClose()
    } else {
      toast.error(r.error || 'Failed to create order')
    }
  }

  const IS: React.CSSProperties = {
    height: 40, padding: '0 12px', borderRadius: 10, fontSize: 13,
    width: '100%', background: T.input, border: `1px solid ${T.border}`,
    color: T.text, boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter,sans-serif',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:150, animation:'bsFadeIn .2s ease' }}
      />

      {/* Drawer */}
      <div style={{
        position:'fixed', top:0, right:0, bottom:0,
        width:'min(560px,100vw)',
        background: T.card,
        borderLeft:`1px solid ${T.border}`,
        zIndex:200,
        display:'flex', flexDirection:'column',
        animation:'bsSlideIn .25s cubic-bezier(0.4,0,0.2,1)',
        fontFamily:'Inter,sans-serif',
      }}>

        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:T.text }}>New Manual Order</div>
              <div style={{ fontSize:11, color:T.textMuted, marginTop:3 }}>
                Creates order directly in DB — no Paystack
              </div>
            </div>
            <button onClick={onClose} style={{
              width:32, height:32, borderRadius:8, background:'transparent',
              border:`1px solid ${T.border}`, color:T.textSecondary, cursor:'pointer', fontSize:18,
            }}>×</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:20 }}>

          {/* ── Customer ── */}
          <section>
            <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:12 }}>
              Customer
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div>
                <div style={{ fontSize:11, color:T.textSecondary, marginBottom:4 }}>Email *</div>
                <input
                  style={{ ...IS, borderColor: errors.email ? T.error : T.border }}
                  type="email"
                  placeholder="customer@email.com"
                  value={custEmail}
                  onChange={e => { setCustEmail(e.target.value); setErrors(p => ({...p, email:''})) }}
                />
                {errors.email && <div style={{ fontSize:11, color:T.error, marginTop:3 }}>{errors.email}</div>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:T.textSecondary, marginBottom:4 }}>Full Name</div>
                  <input style={IS} placeholder="Optional" value={custName} onChange={e => setCustName(e.target.value)} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:T.textSecondary, marginBottom:4 }}>Phone</div>
                  <input style={IS} placeholder="080…" value={custPhone} onChange={e => setCustPhone(e.target.value)} />
                </div>
              </div>
            </div>
          </section>

          {/* ── Items ── */}
          <section>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600 }}>
                Items
              </div>
              <button
                onClick={() => setItems(p => [...p, newItemRow()])}
                style={{
                  height:28, padding:'0 12px', borderRadius:8, background:'transparent',
                  border:`1px solid ${T.border}`, color:T.accent, fontSize:12,
                  fontWeight:600, cursor:'pointer',
                }}
              >+ Add item</button>
            </div>

            {errors.items && (
              <div style={{ fontSize:11, color:T.error, marginBottom:8 }}>{errors.items}</div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {items.map((item, idx) => (
                <div key={item._key} style={{
                  background:T.elevated, border:`1px solid ${T.border}`,
                  borderRadius:12, padding:14,
                }}>
                  {/* Row 1: product search + remove */}
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
                    <ProductSearchBox
                      T={T}
                      allProducts={allProducts}
                      value={item}
                      onChange={patch => setItem(item._key, patch)}
                    />
                    <button
                      onClick={() => setItems(p => p.filter(i => i._key !== item._key))}
                      disabled={items.length === 1}
                      style={{
                        width:32, height:32, borderRadius:8, flexShrink:0,
                        background:'transparent', border:`1px solid ${T.border}`,
                        color:T.textMuted, cursor:items.length===1?'not-allowed':'pointer',
                        fontSize:16, opacity:items.length===1?0.3:1,
                      }}
                    >×</button>
                  </div>

                  {/* Row 2: period / price / qty */}
                  <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1.4fr 0.7fr', gap:8 }}>
                    <div>
                      <div style={{ fontSize:10, color:T.textMuted, marginBottom:4 }}>Period</div>
                      <select
                        style={{ ...IS, height:36 }}
                        value={item.billing_period}
                        onChange={e => onPeriodChange(item, e.target.value)}
                      >
                        {BILLING_PERIODS.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:T.textMuted, marginBottom:4 }}>
                        Unit Price (₦){item.is_overridden && <span style={{ color:T.warning, marginLeft:4 }}>override</span>}
                      </div>
                      <input
                        style={{ ...IS, height:36 }}
                        type="number"
                        min={0}
                        value={item.unit_price_ngn}
                        onChange={e => setItem(item._key, {
                          unit_price_ngn: e.target.value === '' ? '' : Number(e.target.value),
                          is_overridden: true,
                        })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:T.textMuted, marginBottom:4 }}>Qty</div>
                      <input
                        style={{ ...IS, height:36, textAlign:'center' }}
                        type="number" min={1}
                        value={item.quantity}
                        onChange={e => setItem(item._key, { quantity: Math.max(1, parseInt(e.target.value)||1) })}
                      />
                    </div>
                  </div>

                  {/* Line total */}
                  {item.product_id && (
                    <div style={{ marginTop:8, textAlign:'right', fontSize:12, color:T.textSecondary }}>
                      Line total:{' '}
                      <span style={{ color:T.text, fontWeight:600 }}>
                        {fmt((typeof item.unit_price_ngn==='number' ? item.unit_price_ngn : 0) * item.quantity)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── Order details ── */}
          <section>
            <div style={{ fontSize:10, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600, marginBottom:12 }}>
              Order Details
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <div style={{ fontSize:11, color:T.textSecondary, marginBottom:4 }}>Payment Method</div>
                <select style={IS} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  {PAYMENT_METHODS_MANUAL.map(m => (<option key={m.value} value={m.value}>{m.label}</option>))}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, color:T.textSecondary, marginBottom:4 }}>Initial Status</div>
                <select style={IS} value={orderStatus} onChange={e => setOrderStatus(e.target.value)}>
                  <option value="pending_manual">Pending (needs approval)</option>
                  <option value="paid">Paid (mark as done)</option>
                </select>
              </div>
            </div>
            <div>
              <div style={{ fontSize:11, color:T.textSecondary, marginBottom:8 }}>Discount</div>

              {/* Mode toggle */}
              <div style={{
                display:'flex', gap:4, background:T.elevated, border:`1px solid ${T.border}`,
                borderRadius:999, padding:3, marginBottom:10, width:'fit-content',
              }}>
                {(['code','manual'] as const).map(m => (
                  <button key={m} onClick={() => {
                    setDiscountMode(m)
                    setDiscountValid(null)
                    setDiscountError('')
                    setDiscountCode('')
                    setDiscountValue('')
                  }} style={{
                    height:28, padding:'0 14px', borderRadius:999, border:'none',
                    background: discountMode===m ? T.accent : 'transparent',
                    color: discountMode===m ? '#fff' : T.text,
                    fontSize:12, fontWeight:600, cursor:'pointer',
                  }}>
                    {m === 'code' ? 'Promo code' : 'Manual'}
                  </button>
                ))}
              </div>

              {discountMode === 'code' ? (
                <>
                  {discountValid ? (
                    <div style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'10px 14px', borderRadius:10,
                      background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.2)',
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{
                          fontSize:11, background:'rgba(22,163,74,0.18)', borderRadius:4,
                          padding:'2px 8px', color:T.success, fontWeight:700, letterSpacing:'0.05em',
                        }}>{discountCode.toUpperCase()}</span>
                        <span style={{ fontSize:13, color:T.success }}>{discountValid.display} · saves {fmt(discountValid.ngn)}</span>
                      </div>
                      <button onClick={() => { setDiscountValid(null); setDiscountCode('') }}
                        style={{ background:'transparent', border:'none', color:T.textFaint, cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display:'flex', gap:8 }}>
                        <input
                          style={{ ...IS, flex:1, letterSpacing:'0.05em' }}
                          placeholder="PROMO CODE"
                          value={discountCode}
                          onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setDiscountError('') }}
                          onKeyDown={e => e.key === 'Enter' && applyDiscountCode()}
                        />
                        <button
                          onClick={applyDiscountCode}
                          disabled={discountChecking || !discountCode.trim()}
                          style={{
                            height:40, padding:'0 16px', borderRadius:10, border:'none', flexShrink:0,
                            background: discountCode.trim() ? T.accent : T.muted,
                            color: discountCode.trim() ? '#fff' : T.textFaint,
                            cursor: discountCode.trim() ? 'pointer' : 'not-allowed',
                            fontSize:13, fontWeight:600,
                          }}
                        >{discountChecking ? '…' : 'Apply'}</button>
                      </div>
                      {discountError && <div style={{ fontSize:11, color:T.error, marginTop:5 }}>{discountError}</div>}
                    </>
                  )}
                </>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:8 }}>
                  <select style={IS} value={discountType} onChange={e => setDiscountType(e.target.value as any)}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed amount (₦)</option>
                  </select>
                  <div style={{ position:'relative' }}>
                    <input
                      style={IS}
                      type="number" min={0}
                      placeholder={discountType === 'percentage' ? 'e.g. 10' : 'e.g. 5000'}
                      value={discountValue}
                      onChange={e => setDiscountValue(e.target.value)}
                    />
                    {discountValue && (
                      <div style={{
                        position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                        fontSize:11, color:T.textMuted, pointerEvents:'none',
                      }}>
                        {discountType === 'percentage'
                          ? `= ${fmt(Math.round(subtotal * (parseFloat(discountValue)||0) / 100))}`
                          : ''}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize:11, color:T.textSecondary, marginBottom:4 }}>Notes (internal)</div>
              <textarea
                style={{ ...IS, height:72, padding:'8px 12px', resize:'vertical', lineHeight:1.6 } as any}
                placeholder="e.g. Paid via transfer on 01/06, receipt sent"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </section>

          {/* ── Totals ── */}
          <section style={{
            background:T.elevated, border:`1px solid ${T.border}`,
            borderRadius:12, padding:'14px 16px',
          }}>
            {discNGN > 0 && (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:T.textSecondary, marginBottom:6 }}>
                  <span>Subtotal</span><span>{fmt(subtotal)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:T.success, marginBottom:8 }}>
                  <span>Discount</span><span>−{fmt(discNGN)}</span>
                </div>
                <div style={{ height:1, background:T.border, marginBottom:8 }} />
              </>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <span style={{ fontSize:13, color:T.textSecondary }}>Total</span>
              <span style={{ fontSize:20, fontWeight:700, color:T.text }}>{fmt(total)}</span>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 24px', borderTop:`1px solid ${T.border}`, display:'flex', gap:10, flexShrink:0 }}>
          <button
            onClick={onClose}
            style={{
              flex:'0 0 auto', height:44, padding:'0 22px', borderRadius:10,
              background:'transparent', border:`1px solid ${T.border}`,
              color:T.textSecondary, fontSize:14, fontWeight:600,
              cursor:'pointer',
            }}
          >Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex:1, height:44, borderRadius:10, background:T.accent, border:'none',
              color:'#fff', fontSize:14, fontWeight:600, cursor:saving?'not-allowed':'pointer',
              opacity:saving?0.6:1, transition:'opacity .15s',
            }}
          >
            {saving ? 'Creating…' : 'Create Order'}
          </button>
        </div>
      </div>
    </>
  )
}


// ════════════════════ MAIN ════════════════════
const TABS = ['Overview','Orders','Rejected','Products','Customers','Partners','Wallets','Affiliates','Links','Ads','Discounts','Notifications', 'Settings'] as const
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


  /* const [settings, setSettings] = useState<any>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)

  useEffect(() => {
    apiFetch('/v2/admin/settings').then(r => {
      if (r.ok) {
        setSettings(r.data)
        setLoadingSettings(false)
      }
    })
  }, [])
  
  const saveSettings = async () => {
    await apiFetch('/v2/admin/settings', {
      method: 'PATCH',
      body: settings
    })
  } */

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
      {tab === 'Notifications' && <NotificationsTab T={T} />}
      {tab === 'Settings' && <SettingsTab T={T} />}
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
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [allProducts, setAllProducts] = useState<Product[]>([])

useEffect(() => {
  apiFetch('/v2/admin/products?limit=500').then(r => {
    if (r.ok) setAllProducts(r.data || [])
  })
}, [])

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

  const approve = async (ref: string) => {
    const r = await apiFetch(`/v2/admin/orders/${ref}/approve`, {
      method: 'POST'
    })
  
    if (r.ok) {
      setOrders(prev =>
        prev.map(o =>
          o.order_ref === ref
            ? { ...o, status: 'approved' } // ✅ update UI instantly
            : o
        )
      )
      toast.success("Order approved")
    } else {
      toast.error(r.error || 'Failed to approve')
    }
  }
  const reject = async (ref: string) => {
    const r = await apiFetch(`/v2/admin/orders/${ref}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Rejected' }),
    })
  
    if (r.ok) {
      setOrders(prev =>
        prev.map(o =>
          o.order_ref === ref
            ? { ...o, status: 'rejected' }
            : o
        )
      )
      toast.success("Order rejected")
    } else {
      toast.error(r.error || 'Failed to reject')
    }
  }
  const openReceipt=(ref:string)=>{window.open(`/admin/receipt?ref=${ref}`,'_blank')}

  const grouped:{day:string;orders:Order[]}[]=[];let lastDay='';for(const o of orders){const d=dayKey(o.created_at);if(d!==lastDay){grouped.push({day:d,orders:[]});lastDay=d}grouped[grouped.length-1].orders.push(o)}
  const STATUS_FILTERS=[{label:'All',value:''},{label:'Pending',value:'pending_manual'},{label:'Paid',value:'paid'},{label:'Cancelled',value:'cancelled'},{label:'Refunded',value:'refunded'}]

  return (
    <div>
      {/* Sub-filters */}
      {/* <div style={{display:'flex',gap:4,marginBottom:16,background:T.elevated,borderRadius:999,padding:4,border:`1px solid ${T.border}`,width:'fit-content'}}>
        {STATUS_FILTERS.map(f=>(
          <button key={f.value} onClick={()=>{setStatusFilter(f.value);load(1,f.value,search)}} style={{
            padding:'8px 16px',borderRadius:999,fontSize:12,fontWeight:statusFilter===f.value?600:400,border:'none',cursor:'pointer',
            background:statusFilter===f.value?T.accent:'transparent',color:statusFilter===f.value?'#fff':T.text,transition:'all 0.15s',fontFamily:'Inter,sans-serif'
          }}>{f.label}</button>
        ))}
      </div> */}
      
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:4, background:T.elevated, borderRadius:999, padding:4, border:`1px solid ${T.border}` }}>
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => { setStatusFilter(f.value); load(1, f.value, search) }} style={{
              padding:'8px 16px', borderRadius:999, fontSize:12, fontWeight:statusFilter===f.value?600:400, border:'none', cursor:'pointer',
              background:statusFilter===f.value?T.accent:'transparent', color:statusFilter===f.value?'#fff':T.text, transition:'all 0.15s', fontFamily:'Inter,sans-serif',
            }}>{f.label}</button>
          ))}
        </div>
        <button
          onClick={() => setShowNewOrder(true)}
          style={{
            height:38, padding:'0 18px', borderRadius:10, background:T.accent, border:'none',
            color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600,
            display:'inline-flex', alignItems:'center', gap:6,
            boxShadow:'0 4px 14px rgba(124,92,255,0.25)',
          }}
        >
          <span style={{ fontSize:15, lineHeight:1 }}>+</span> New Order
        </button>
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
                            <SmallBtn T={T} color={T.success} onClick={()=>approve(o.order_ref)} disabled={actionLoading===o.order_ref}>{actionLoading===o.order_ref?'…':'✓ Approve'}</SmallBtn>
                            <SmallBtn T={T} color={T.error} onClick={()=>reject(o.order_ref)} disabled={actionLoading===o.order_ref}>✕ Reject</SmallBtn>
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
      {showNewOrder && (
        <NewOrderDrawer
          T={T}
          allProducts={allProducts}
          onClose={() => setShowNewOrder(false)}
          onCreated={() => load(pagination.page)}
        />
      )}
    </div>
  )
}

// ════════════════════ REJECTED TAB ════════════════════
function RejectedTab({T}:{T:Theme}) {
  const [orders,setOrders]=useState<Order[]>([]); const [loading,setLoading]=useState(true); const [actionLoading,setActionLoading]=useState<string|null>(null)
  const load=useCallback(async()=>{setLoading(true);const r=await apiFetch('/v2/admin/orders?status=rejected_pending&limit=50');if(r.ok)setOrders(r.data||[]);setLoading(false)},[])
  useEffect(()=>{load()},[])
  const confirmReject=async(ref:string)=>{if(!confirm(`Permanently reject ${ref}?`))return;setActionLoading(ref);const r=await apiFetch(`/v2/admin/orders/${ref}/reject`,{method:'POST',body:JSON.stringify({confirm:true})});if(r.ok||r.data?.rejected)await load();else toast.error(r.error||'Failed');setActionLoading(null)}
  const undoReject=async(ref:string)=>{setActionLoading(ref);const r=await apiFetch(`/v2/admin/orders/${ref}/undo-reject`,{method:'POST'});if(r.ok||r.data?.undone)await load();else toast.error(r.error||'Failed');setActionLoading(null)}
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
const EMPTY_PRODUCT = (): Partial<Product> & { [k: string]: any } => ({
  name: '',
  slug: '',
  category: '',
  tags: '',
  description: '',
  short_description: '',
  category_tagline: '',
  domain: '',
  billing_type: 'subscription',
  billing_period: '',
  price_1m: 0,
  price_3m: 0,
  price_6m: 0,
  price_1y: 0,
  stock_status: 'in_stock',
  status: 'active',
  featured: false,
  sort_order: 100,
  image_url: '',
  whatsapp_group_url: '',
  social_links: { telegram: '', instagram: '', twitter: '', tiktok: '', discord: '', website: '' },
})

function ProductsTab({ T }: { T: Theme }) {
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [showCreate, setShowCreate] = useState(false)
  const [newProduct, setNewProduct] = useState<any>(EMPTY_PRODUCT())
  const [creating, setCreating] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 24

  // Fetch ALL products for stable client-side filtering+pagination
  const loadAll = useCallback(async () => {
    setLoading(true)

    let page = 1
    let products: Product[] = []

    while (true) {
      const r = await apiFetch(`/v2/admin/products?limit=100&page=${page}`)

      if (!r.ok || !r.data?.length) break

      products = products.concat(r.data)

      if (r.data.length < 100) break
      page++
    }

    setAllProducts(products)
    setLoading(false)
  }, [])
  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Client-side filter+paginate
  const filtered = useMemo(() => {
    let list = allProducts
    if (statusFilter) list = list.filter(p => p.status === statusFilter)
    if (categoryFilter) list = list.filter(p => (p.category || '').toLowerCase().includes(categoryFilter.toLowerCase()))
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.tags || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [allProducts, statusFilter, categoryFilter, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  useEffect(() => { setPage(1) }, [search, statusFilter, categoryFilter])

  // Summary counts (for header strip)
  const counts = useMemo(() => ({
    total: allProducts.length,
    active: allProducts.filter(p => p.status === 'active').length,
    hidden: allProducts.filter(p => p.status === 'hidden').length,
    oos: allProducts.filter(p => p.stock_status !== 'in_stock').length,
  }), [allProducts])

  const toggleStatus = async (p: Product) => {
    const ns = p.status === 'active' ? 'hidden' : 'active'
    const r = await apiFetch(`/v2/admin/products/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: ns })
    })
    console.log('STATUS RESPONSE:', r)
    if (r.ok) {
      toast.success("Status updated")
      await loadAll()
    } else {
      toast.error(r.error || 'Failed to update status')
    }
  }
  const toggleStock = async (p: Product) => {
    const ns = p.stock_status === 'in_stock' ? 'out_of_stock' : 'in_stock'
    const r = await apiFetch(`/v2/admin/products/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ stock_status: ns })
    })
    if (r.ok) {
      await loadAll()
      toast.success("Stock inventory updated")
    } else {
      toast.error(r.error || 'Failed to update stock')
    }
  }
  const archiveProduct = async (p: Product) => {
    if (!confirm(`Archive "${p.name}"?`)) return
    const r = await apiFetch(`/v2/admin/products/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'archived' })
    })
    if (r.ok) {
      await loadAll()
      toast.success("Product Archived")
    } else {
      toast.error(r.error || 'Failed to archive')
    }
  }

  const startEdit = (p: Product) => {
    setEditingId(p.id)
    setEditForm({
      name: p.name,
      slug: p.slug,
      category: p.category,
      tags: p.tags,
      description: p.description || '',
      short_description: p.short_description || '',
      category_tagline: p.category_tagline || '',
      domain: p.domain || '',
      billing_type: p.billing_type || 'subscription',
      billing_period: p.billing_period || '',
      price_1m: p.price_1m || 0,
      price_3m: p.price_3m || 0,
      price_6m: p.price_6m || 0,
      price_1y: p.price_1y || 0,
      stock_status: p.stock_status,
      status: p.status,
      featured: !!p.featured,
      sort_order: p.sort_order || 100,
      image_url: p.image_url || '',
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    const r = await apiFetch(`/v2/admin/products/${editingId}`, { method: 'PATCH', body: JSON.stringify(editForm) })
    if (r.ok && r.data) {
      setAllProducts(prev => prev.map(x => x.id === editingId ? { ...x, ...r.data } : x))
      setEditingId(null)
    } else toast.error(r.error || r.data?.error || 'Failed to save. Check that all fields are valid.')
  }

  const createProduct = async () => {
    if (!newProduct.name) { toast.error('Name is required'); return }
    setCreating(true)
    const slug = newProduct.slug || newProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
    const r = await apiFetch('/v2/admin/products', { method: 'POST', body: JSON.stringify({ ...newProduct, slug }) })
    if (r.ok) {
      setNewProduct(EMPTY_PRODUCT())
      setShowCreate(false)
      await loadAll()
    } else toast.error(r.error || r.data?.error || 'Failed to create. API route /v2/admin/products POST may need to be added.')
    setCreating(false)
  }

  const IS = inputStyle(T)

  // Uppercase section label style (tiny all-caps)
  const metaLabel: React.CSSProperties = {
    fontSize: 10,
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 600,
  }

  // Generate a stable accent color per product name (same pattern as marketplace fallback avatar)
  const avatarTintFor = (name: string) => {
    const code = (name || '?').charCodeAt(0)
    const hues = [262, 200, 150, 30, 340, 20, 280, 180]
    const hue = hues[code % hues.length]
    return { bg: `hsl(${hue}, 65%, 18%)`, fg: `hsl(${hue}, 75%, 68%)` }
  }

  // Primary price for display on the card (prefer 1M, fall back in order)
  const primaryPrice = (p: Product) =>
    p.price_1m || p.price_3m || p.price_6m || p.price_1y || 0

  return (
    <div>
      <style>{`
        .bs-pt-input:focus,
        .bs-pt-input:focus-visible {
          outline: none !important;
          border-color: #7C5CFF !important;
        }
        .bs-pt-card {
          transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
        }
        .bs-pt-card:hover {
          border-color: var(--bs-border-strong) !important;
          transform: translateY(-1px);
        }
        .bs-pt-action {
          transition: all 0.15s ease;
        }
        .bs-pt-action:hover:not(:disabled) {
          background: var(--bs-bg-muted) !important;
        }
        .bs-pt-action-danger:hover:not(:disabled) {
          background: rgba(var(--bs-error-rgb), 0.08) !important;
          border-color: rgba(var(--bs-error-rgb), 0.35) !important;
          color: var(--bs-error) !important;
        }
        .bs-pt-action-accent:hover:not(:disabled) {
          background: rgba(var(--bs-accent-rgb), 0.1) !important;
          border-color: rgba(var(--bs-accent-rgb), 0.4) !important;
          color: #7C5CFF !important;
        }
        .bs-pt-new-btn:hover {
          background: #6B4EE6 !important;
        }
        .bs-pt-page-btn:hover:not(:disabled) {
          background: var(--bs-bg-muted) !important;
          border-color: var(--bs-border-strong) !important;
        }
      `}</style>

      {/* ============================================================ */}
      {/* TOP BAR — COUNTS + FILTERS                                   */}
      {/* ============================================================ */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 14,
        marginBottom: 18,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
        }}>
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            color: T.text,
            lineHeight: 1,
          }}>
            Products
          </div>
          <div style={{
            fontSize: 12,
            color: T.textMuted,
          }}>
            {counts.total} total
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatChip T={T} label="Active" value={counts.active} color={T.success} />
          <StatChip T={T} label="Hidden" value={counts.hidden} color={T.textMuted} />
          <StatChip T={T} label="Out of stock" value={counts.oos} color={T.warning} />
        </div>
      </div>

      {/* Filter row */}
      <div style={{
        display: 'flex',
        gap: 10,
        marginBottom: 20,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 340 }}>
          <input
            className="bs-pt-input"
            placeholder="Search name, category, or tag…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...IS, paddingLeft: 36, width: '100%' }}
          />
          <div style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: T.textMuted,
            pointerEvents: 'none',
            fontSize: 14,
          }}>
            ⌕
          </div>
        </div>

        <select
          className="bs-pt-input"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ ...IS, width: 150, flex: 'none' }}
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
        </select>

        <select
          className="bs-pt-input"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{ ...IS, width: 200, flex: 'none' }}
        >
          <option value="">All categories</option>
          {ALL_CATEGORIES.filter(c => c !== 'all').map(c => (
            <option key={c} value={c}>{sentenceCase(c)}</option>
          ))}
        </select>

        {(search || statusFilter || categoryFilter) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setCategoryFilter('') }}
            className="bs-pt-action"
            style={{
              height: 42,
              padding: '0 14px',
              borderRadius: 10,
              background: 'transparent',
              border: `1px solid ${T.border}`,
              color: T.textSecondary,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bs-pt-new-btn"
          style={{
            height: 42,
            padding: '0 20px',
            borderRadius: 10,
            background: T.accent,
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 14px rgba(124,92,255,0.25)',
            transition: 'background 0.15s',
          }}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
          New Product
        </button>
      </div>

      {/* Active filter summary */}
      {filtered.length !== allProducts.length && (
        <div style={{
          marginBottom: 16,
          fontSize: 12,
          color: T.textMuted,
        }}>
          Showing <span style={{ color: T.text, fontWeight: 600 }}>{filtered.length}</span> of {allProducts.length} products
        </div>
      )}

      {showCreate && <ProductFormPanel T={T} form={newProduct} setForm={setNewProduct} onSave={createProduct} onCancel={() => setShowCreate(false)} saving={creating} title="Create New Product" />}
      {editingId && <ProductFormPanel T={T} form={editForm} setForm={setEditForm} onSave={saveEdit} onCancel={() => setEditingId(null)} title="Edit Product" />}

      {loading ? (
        <Loading T={T} />
      ) : paged.length === 0 ? (
        <EmptyState text="No products found" T={T} />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 16,
        }}>
          {paged.map(p => {
            const tint = avatarTintFor(p.name || '?')
            const isHidden = p.status !== 'active'
            const isOOS = p.stock_status !== 'in_stock'
            const lead = primaryPrice(p)

            return (
              <div
                key={p.id}
                className="bs-pt-card"
                style={{
                  background: T.card,
                  border: `1px solid ${isHidden ? T.border : '#1C1C1F'}`,
                  borderRadius: 20,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  position: 'relative',
                  opacity: isHidden ? 0.65 : 1,
                }}
              >
                {/* Featured ribbon */}
                {p.featured && (
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: T.accent,
                    background: 'rgba(var(--bs-accent-rgb), 0.12)',
                    border: '1px solid rgba(var(--bs-accent-rgb), 0.3)',
                    padding: '3px 8px',
                    borderRadius: 4,
                  }}>
                    ★ Featured
                  </div>
                )}

                {/* ── HEADER: logo + identity ── */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
                  {p.domain && logoUrl(p.domain) ? (
                    <img
                      src={logoUrl(p.domain)}
                      alt=""
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: T.elevated,
                        border: '1px solid rgba(255,255,255,0.06)',
                        objectFit: 'contain',
                        flexShrink: 0,
                      }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: tint.bg,
                      border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      fontWeight: 700,
                      color: tint.fg,
                      flexShrink: 0,
                    }}>
                      {(p.name || '?')[0]?.toUpperCase()}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0, paddingRight: p.featured ? 68 : 0 }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: T.text,
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {p.name}
                    </div>
                    {p.category && (
                      <div style={{ fontSize: 12, color: T.accent, marginTop: 3, fontWeight: 500 }}>
                        {sentenceCase(p.category)}
                      </div>
                    )}
                    {p.short_description && (
                      <div style={{
                        fontSize: 12,
                        color: T.textSecondary,
                        marginTop: 4,
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {p.short_description}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── STATUS BADGES ROW ── */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <PillBadge
                    T={T}
                    color={p.status === 'active' ? T.success : T.textMuted}
                    tone="soft"
                    dot
                  >
                    {sentenceCase(p.status || 'active')}
                  </PillBadge>
                  <PillBadge
                    T={T}
                    color={isOOS ? T.warning : T.success}
                    tone="soft"
                  >
                    {isOOS ? 'Out of stock' : 'In stock'}
                  </PillBadge>
                  {p.billing_type && p.billing_type !== 'subscription' && (
                    <PillBadge T={T} color={T.textSecondary} tone="ghost">
                      {sentenceCase(p.billing_type)}
                    </PillBadge>
                  )}
                  {p.tags && (
                    <PillBadge T={T} color={T.textSecondary} tone="ghost">
                      {sentenceCase(String(p.tags).split(',')[0])}
                      {String(p.tags).split(',').length > 1 && ` +${String(p.tags).split(',').length - 1}`}
                    </PillBadge>
                  )}
                </div>

                {/* ── PRICE GRID ── */}
                <div>
                  <div style={{ ...metaLabel, marginBottom: 8 }}>Pricing</div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 6,
                    background: T.elevated,
                    border: `1px solid ${T.border}`,
                    borderRadius: 12,
                    padding: 6,
                  }}>
                    {[
                      { l: '1M', v: p.price_1m },
                      { l: '3M', v: p.price_3m },
                      { l: '6M', v: p.price_6m },
                      { l: '1Y', v: p.price_1y },
                    ].map(x => {
                      const isPrimary = x.v === lead && x.v > 0
                      return (
                        <div
                          key={x.l}
                          style={{
                            borderRadius: 8,
                            padding: '8px 6px',
                            textAlign: 'center',
                            background: isPrimary ? T.card : 'transparent',
                            border: isPrimary ? `1px solid ${T.border}` : '1px solid transparent',
                          }}
                        >
                          <div style={{
                            fontSize: 9,
                            color: isPrimary ? T.accent : T.textMuted,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            fontWeight: 600,
                          }}>
                            {x.l}
                          </div>
                          <div style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: x.v ? T.text : T.textFaint,
                            fontFamily: "'SF Mono', Menlo, monospace",
                            marginTop: 3,
                            lineHeight: 1,
                          }}>
                            {x.v ? fmt(x.v) : '—'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* ── ACTIONS ── */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 6,
                  marginTop: 'auto',
                }}>
                  <button
                    onClick={() => startEdit(p)}
                    className="bs-pt-action bs-pt-action-accent"
                    style={actionBtnStyle(T)}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleStatus(p)}
                    className="bs-pt-action"
                    style={actionBtnStyle(T)}
                  >
                    {p.status === 'active' ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => toggleStock(p)}
                    className="bs-pt-action"
                    style={actionBtnStyle(T)}
                  >
                    {p.stock_status === 'in_stock' ? 'Mark OOS' : 'In stock'}
                  </button>
                  <button
                    onClick={() => archiveProduct(p)}
                    className="bs-pt-action bs-pt-action-danger"
                    style={actionBtnStyle(T)}
                  >
                    Archive
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 24,
          paddingTop: 20,
          borderTop: `1px solid ${T.border}`,
          fontSize: 12,
          color: T.textMuted,
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <span>
            Showing <span style={{ color: T.text, fontWeight: 600 }}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}
            </span> of {filtered.length}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="bs-pt-page-btn"
              style={refinedPageBtnStyle(T, page <= 1)}
            >
              ← Prev
            </button>

            <div style={{
              padding: '0 12px',
              fontSize: 12,
              color: T.textSecondary,
            }}>
              Page <span style={{ color: T.text, fontWeight: 600 }}>{page}</span> of {totalPages}
            </div>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="bs-pt-page-btn"
              style={refinedPageBtnStyle(T, page >= totalPages)}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  LOCAL HELPERS (module-level so focus doesn't drop on re-render)   */
/* ------------------------------------------------------------------ */

function StatChip({
  T, label, value, color,
}: { T: Theme; label: string; value: number; color: string }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      height: 30,
      padding: '0 12px',
      borderRadius: 999,
      background: T.elevated,
      border: `1px solid ${T.border}`,
      fontSize: 12,
      color: T.textSecondary,
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: color,
      }} />
      <span>{label}</span>
      <span style={{ color: T.text, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function PillBadge({
  T, color, tone = 'soft', dot = false, children,
}: {
  T: Theme
  color: string
  tone?: 'soft' | 'ghost'
  dot?: boolean
  children: React.ReactNode
}) {
  // Derive an RGB tint. We assume `color` is already a CSS value from T.*.
  // For soft tone, use a semi-transparent companion; for ghost, neutral border.
  const soft = tone === 'soft'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      height: 22,
      padding: '0 9px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      color,
      background: soft
        ? 'rgba(255,255,255,0.04)'
        : 'transparent',
      border: `1px solid ${soft ? T.border : T.border}`,
      whiteSpace: 'nowrap',
    }}>
      {dot && (
        <span style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: color,
        }} />
      )}
      {children}
    </span>
  )
}

function actionBtnStyle(T: Theme): React.CSSProperties {
  return {
    height: 34,
    padding: '0 12px',
    borderRadius: 10,
    background: 'transparent',
    border: `1px solid ${T.border}`,
    color: T.text,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
  }
}

function refinedPageBtnStyle(T: Theme, disabled: boolean): React.CSSProperties {
  return {
    height: 34,
    padding: '0 14px',
    borderRadius: 10,
    background: 'transparent',
    border: `1px solid ${T.border}`,
    color: disabled ? T.textFaint : T.text,
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'all 0.15s',
  }
}


// ════════════════════ CUSTOMERS TAB ════════════════════
/* function CustomersTab({T}:{T:Theme}) {
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
                <td style={{padding:12}}><Badge status={c.is_active?'active':'hidden'} T={T}/></td>
                <td style={{padding:12,color:T.textMuted,whiteSpace:'nowrap'}}>{fmtDate(c.created_at)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {pagination?.pages>1&&<PaginationBar T={T} pagination={pagination} onPage={p=>load(p)}/>}
    </div>
  )
} */

  function CustomersTab({ T }: { T: Theme }) {
    const [customers, setCustomers]         = useState<Customer[]>([])
    const [pagination, setPagination]       = useState<Pagination>(emptyPagination)
    const [loading, setLoading]             = useState(true)
    const [search, setSearch]               = useState('')
    const [expanded, setExpanded]           = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const searchTimer = useRef<any>(null)
   
    // panel state
    const [msgPanel,     setMsgPanel]     = useState<Customer | null>(null)
    const [walletPanel,  setWalletPanel]  = useState<Customer | null>(null)
    const [resetResult,  setResetResult]  = useState<{ email: string; temp_password: string } | null>(null)
    const [debitCustomer, setDebitCustomer] = useState<Customer | null>(null)
   
    const load = useCallback(async (page = 1, q = search) => {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), limit: '30' })
      if (q) params.set('q', q)
      const r = await apiFetch(`/v2/admin/customers?${params}`)
      if (r.ok) { setCustomers(r.data || []); setPagination(parsePagination(r)) }
      setLoading(false)
    }, [search])
   
    useEffect(() => { load() }, [])
   
    const onSearch = (q: string) => {
      setSearch(q)
      clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(() => load(1, q), 400)
    }
   
    const forceReset = async (c: Customer) => {
      if (!confirm(`Force-reset password for ${c.name || c.email}?\nA temporary password will be shown once.`)) return
      setActionLoading(c.id)
      const r = await apiFetch(`/v2/admin/customers/${c.id}/reset-password`, { method: 'POST' })
      setActionLoading(null)
      if (r.ok && r.data?.temp_password) {
        setResetResult({ email: r.data.email, temp_password: r.data.temp_password })
      } else {
        toast.error(r.error || 'Reset failed — customer may not have an auth account yet')
      }
    }
   
    return (
      <div>
        {/* Force-reset result modal */}
        {resetResult && (
          <>
            <div onClick={() => setResetResult(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300 }} />
            <div style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              width: 'min(440px,calc(100vw - 32px))', zIndex: 301,
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 20, padding: '28px 28px 24px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>Password Reset</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 18, lineHeight: 1.6 }}>
                Temporary password for <strong style={{ color: T.text }}>{resetResult.email}</strong>.<br />
                Share this with the customer securely. It will only be shown once.
              </div>
              <div style={{
                background: T.elevated, border: `1px solid ${T.border}`,
                borderRadius: 10, padding: '12px 16px',
                fontFamily: "'SF Mono', Menlo, monospace", fontSize: 18,
                fontWeight: 700, color: T.accent, letterSpacing: '0.06em',
                textAlign: 'center', marginBottom: 18,
              }}>
                {resetResult.temp_password}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { navigator.clipboard.writeText(resetResult.temp_password); toast.success('Copied') }}
                  style={{ flex: 1, height: 40, borderRadius: 10, background: T.elevated, border: `1px solid ${T.border}`, color: T.text, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif' }}
                >
                  Copy
                </button>
                <button
                  onClick={() => setResetResult(null)}
                  style={{ flex: 1, height: 40, borderRadius: 10, background: T.accent, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif' }}
                >
                  Done
                </button>
              </div>
            </div>
          </>
        )}
   
        {/* Send message panel */}
        {msgPanel && (
          <SendMessagePanel
            T={T}
            customer={msgPanel}
            onClose={() => setMsgPanel(null)}
            onSent={() => { setMsgPanel(null); toast.success('Message sent') }}
          />
        )}
   
        {/* Wallet top-up panel */}
        {walletPanel && (
          <WalletTopupPanel
            T={T}
            customer={walletPanel}
            onClose={() => setWalletPanel(null)}
            onDone={() => { setWalletPanel(null); toast.success('Wallet topped up') }}
          />
        )}

          {debitCustomer && (
            <WalletDebitPanel
              T={T}
              customer={debitCustomer}
              onClose={() => setDebitCustomer(null)}
              onDone={() => {
                setDebitCustomer(null)
                toast.success('Wallet debited')
              }}
            />
          )}
   
        {/* Search */}
        <input
          placeholder="Search customers…"
          value={search}
          onChange={e => onSearch(e.target.value)}
          style={{ ...inputStyle(T), marginBottom: 20 }}
        />
   
        {loading ? <Loading T={T} /> : customers.length === 0 ? <EmptyState text="No customers found" T={T} /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {customers.map(c => {
              const isExp = expanded === c.id
              return (
                <div key={c.id} style={{
                  background: T.card, border: `1px solid ${T.borderSubtle}`,
                  borderRadius: 16, overflow: 'hidden',
                }}>
                  {/* Compact row */}
                  <div
                    onClick={() => setExpanded(isExp ? null : c.id)}
                    style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
                  >
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0, flex: 1 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 36, height: 36, borderRadius: 999, background: T.accent + '20',
                        border: `1px solid ${T.accent}30`, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: T.accent,
                      }}>
                        {(c.name || c.email || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{c.name || '—'}</div>
                        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{c.email}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      <Badge status={c.is_active ? 'active' : 'hidden'} T={T} />
                      <span style={{ color: T.textMuted, fontSize: 12 }}>{isExp ? '▾' : '▸'}</span>
                    </div>
                  </div>
   
                  {/* Expanded */}
                  {isExp && (
                    <div style={{ borderTop: `1px solid ${T.borderSubtle}`, padding: '14px 20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 16 }}>
                        <DetailSection T={T} title="Contact">
                          <DRow T={T} label="Email"    value={c.email   || '—'} />
                          <DRow T={T} label="Phone"    value={c.phone   || '—'} />
                          <DRow T={T} label="Category" value={c.category|| '—'} />
                          <DRow T={T} label="Source"   value={c.source  || '—'} />
                          <DRow T={T} label="Joined"   value={fmtDate(c.created_at)} />
                        </DetailSection>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <SmallBtn T={T} color={T.accent}   onClick={() => setMsgPanel(c)}>
                          📨 Send Message
                        </SmallBtn>
                        <SmallBtn T={T} color={T.success}  onClick={() => setWalletPanel(c)}>
                          💳 Top Up Wallet
                        </SmallBtn>
                        <SmallBtn T={T} color={T.warning}  onClick={() => setDebitCustomer(c)}>
                          💳 Debit Wallet
                        </SmallBtn>
                        <SmallBtn
                          T={T}
                          color={T.warning}
                          onClick={() => forceReset(c)}
                          disabled={actionLoading === c.id}
                        >
                          {actionLoading === c.id ? '…' : '🔑 Force Reset'}
                        </SmallBtn>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {pagination?.pages > 1 && <PaginationBar T={T} pagination={pagination} onPage={p => load(p)} />}
      </div>
    )
  }
   
  // ── MODULE-LEVEL: Send Message Panel ─────────────────────────────
  function SendMessagePanel({
    T, customer, onClose, onSent,
  }: {
    T: Theme
    customer: { id: string; name: string; email: string }
    onClose: () => void
    onSent: () => void
  }) {
    const [form, setForm] = useState({
      subject:        '',
      product_name:   '',
      product_domain: '',
      body:           '',
      expires_at:     '',
    })
    const [saving, setSaving] = useState(false)
    const IS = inputStyle(T)
   
    const send = async () => {
      if (!form.subject.trim()) { toast.error('Subject is required'); return }
      if (!form.body.trim())    { toast.error('Message body is required'); return }
      setSaving(true)
      const r = await apiFetch(`/v2/admin/customers/${customer.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          subject:        form.subject.trim(),
          product_name:   form.product_name   || null,
          product_domain: form.product_domain || null,
          body:           form.body.trim(),
          expires_at:     form.expires_at || null,
        }),
      })
      setSaving(false)
      if (r.ok) onSent()
      else toast.error(r.error || 'Failed to send message')
    }
   
    return (
      <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300 }} />
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(520px,100vw)',
          background: T.card, border: `1px solid ${T.border}`,
          zIndex: 301, display: 'flex', flexDirection: 'column',
          animation: 'bsSlideIn .25s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {/* Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Send Message</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                  To: {customer.name || customer.email}
                </div>
              </div>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary, cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
          </div>
   
          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
   
            <FieldLabel label="Subject *" T={T}>
              <input style={IS} value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. Your Netflix credentials" />
            </FieldLabel>
   
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FieldLabel label="Product Name" T={T}>
                <input style={IS} value={form.product_name}
                  onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
                  placeholder="e.g. Netflix" />
              </FieldLabel>
              <FieldLabel label="Product Domain" T={T}>
                <input style={IS} value={form.product_domain}
                  onChange={e => setForm(f => ({ ...f, product_domain: e.target.value }))}
                  placeholder="e.g. netflix.com" />
              </FieldLabel>
            </div>
   
            {/* Preview product logo */}
            {form.product_domain && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: T.elevated, borderRadius: 10, border: `1px solid ${T.border}` }}>
                <img
                  src={`https://img.logo.dev/${form.product_domain}?token=${LOGO_DEV_TOKEN}&size=64&theme=dark`}
                  alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <span style={{ fontSize: 12, color: T.textSecondary }}>Logo preview · shown in customer inbox</span>
              </div>
            )}
   
            <FieldLabel label="Message Body *" T={T}>
              <textarea
                style={{ ...IS, height: 200, padding: '10px 14px', resize: 'vertical', lineHeight: 1.7, fontFamily: "'SF Mono', Menlo, monospace", fontSize: 12 } as any}
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder={`Email: example@email.com\nPassword: abc123\n\nYour subscription is active until 31 Dec 2025.\n\nFor support, reply here.`}
              />
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 5 }}>
                Plain text — line breaks are preserved. Safe to include credentials, links, instructions.
              </div>
            </FieldLabel>
   
            <FieldLabel label="Expires (optional)" T={T}>
              <input style={{ ...IS, colorScheme: 'dark' }} type="date"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                After this date the message is marked expired in the customer's inbox.
              </div>
            </FieldLabel>
          </div>
   
          {/* Footer */}
          <div style={{ padding: '16px 24px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={onClose} style={{ flex: '0 0 auto', height: 44, padding: '0 22px', borderRadius: 10, background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
              Cancel
            </button>
            <button onClick={send} disabled={saving} style={{ flex: 1, height: 44, borderRadius: 10, background: T.accent, border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'Inter,sans-serif' }}>
              {saving ? 'Sending…' : 'Send Message'}
            </button>
          </div>
        </div>
      </>
    )
  }
   
  // ── MODULE-LEVEL: Wallet Top-Up Panel ────────────────────────────
  function WalletTopupPanel({
    T, customer, onClose, onDone,
  }: {
    T: Theme
    customer: { id: string; name: string; email: string }
    onClose: () => void
    onDone: () => void
  }) {
    const [amount,    setAmount]    = useState('')
    const [source,    setSource]    = useState('admin_topup')
    const [reference, setReference] = useState('')
    const [note,      setNote]      = useState('')
    const [saving,    setSaving]    = useState(false)
    const [balance,   setBalance]   = useState<number | null>(null)
    const IS = inputStyle(T)
   
    // Load current balance
    useEffect(() => {
      apiFetch(`/v2/admin/customers/${customer.id}/wallet`).then(r => {
        if (r.ok) setBalance(r.data?.balance_ngn ?? null)
      })
    }, [customer.id])
   
    const topup = async () => {
      const amt = parseFloat(amount)
      if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return }
      setSaving(true)
      const r = await apiFetch(`/v2/admin/customers/${customer.id}/wallet/topup`, {
        method: 'POST',
        body: JSON.stringify({
          amount_ngn: amt,
          source:     source || 'admin_topup',
          reference:  reference || null,
          note:       note || null,
        }),
      })
      setSaving(false)
      if (r.ok) {
        setBalance(r.data?.balance_ngn ?? null)
        onDone()
      } else {
        toast.error(r.error || 'Top-up failed')
      }
    }
   
    const TOPUP_SOURCES = [
      { value: 'admin_topup',      label: 'Manual Top-up'    },
      { value: 'refund',           label: 'Order Refund'     },
      { value: 'promotion',        label: 'Promotion/Bonus'  },
      { value: 'compensation',     label: 'Compensation'     },
    ]
   
    return (
      <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300 }} />
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 'min(420px,calc(100vw - 32px))',
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 20, zIndex: 301, display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          animation: 'bsFadeIn .2s ease',
        }}>
          {/* Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Top Up Wallet</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{customer.name || customer.email}</div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary, cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
   
          {/* Body */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Current balance */}
            <div style={{
              padding: '14px 16px', borderRadius: 12,
              background: 'linear-gradient(135deg, #7C5CFF 0%, #5B3FD4 100%)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>Current Balance</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                {balance != null ? `₦${Number(balance).toLocaleString('en-NG')}` : '…'}
              </span>
            </div>
   
            <FieldLabel label="Amount (₦) *" T={T}>
              <input style={IS} type="number" min={1} value={amount}
                onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000" autoFocus />
            </FieldLabel>
   
            <FieldLabel label="Source" T={T}>
              <select style={IS} value={source} onChange={e => setSource(e.target.value)}>
                {TOPUP_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </FieldLabel>
   
            <FieldLabel label="Reference (optional)" T={T}>
              <input style={IS} value={reference}
                onChange={e => setReference(e.target.value)} placeholder="e.g. order ref, transaction ID" />
            </FieldLabel>
   
            <FieldLabel label="Internal Note (optional)" T={T}>
              <input style={IS} value={note}
                onChange={e => setNote(e.target.value)} placeholder="Reason for top-up" />
            </FieldLabel>
   
            {amount && parseFloat(amount) > 0 && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: T.elevated, border: `1px solid ${T.border}`, fontSize: 12, color: T.textSecondary }}>
                New balance after top-up:{' '}
                <strong style={{ color: T.text }}>
                  ₦{((balance || 0) + parseFloat(amount)).toLocaleString('en-NG')}
                </strong>
              </div>
            )}
          </div>
   
          {/* Footer */}
          <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: '0 0 auto', height: 44, padding: '0 22px', borderRadius: 10, background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
              Cancel
            </button>
            <button onClick={topup} disabled={saving} style={{ flex: 1, height: 44, borderRadius: 10, background: T.success, border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'Inter,sans-serif' }}>
              {saving ? 'Processing…' : `Top Up ${amount ? `₦${parseFloat(amount).toLocaleString('en-NG')}` : ''}`}
            </button>
          </div>
        </div>
      </>
    )
  }

function WalletDebitPanel({
  T, customer, onClose, onDone,
}: {
  T: Theme
  customer: { id: string; name: string; email: string } | null
  onClose: () => void
  onDone: () => void
}) {
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)

  const IS = inputStyle(T)

  // hooks must come before any early return
  useEffect(() => {
    if (!customer?.id) return
    apiFetch(`/v2/admin/customers/${customer.id}/wallet`).then(r => {
      if (r.ok) setBalance(r.data?.balance_ngn ?? null)
    })
  }, [customer?.id])

  if (!customer) return null

  const debit = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return }
    if (balance != null && amt > balance) { toast.error('Amount exceeds wallet balance'); return }
    setSaving(true)
    const r = await apiFetch(`/v2/admin/wallet/debit`, {
      method: 'POST',
      body: JSON.stringify({ customer_id: customer.id, amount: amt, reference: reference || 'Admin debit' }),
    })
    setSaving(false)
    if (r.ok) { onDone() } else { toast.error(r.error || 'Debit failed') }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(420px,calc(100vw - 32px))',
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 20, zIndex: 301, display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)', animation: 'bsFadeIn .2s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Debit Wallet</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{customer.name || customer.email}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Balance */}
          <div style={{
            padding: '14px 16px', borderRadius: 12,
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>Current Balance</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
              {balance != null ? `₦${Number(balance).toLocaleString('en-NG')}` : '…'}
            </span>
          </div>

          <FieldLabel label="Amount to Deduct (₦) *" T={T}>
            <input style={IS} type="number" min={1} value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="e.g. 2000" autoFocus />
          </FieldLabel>

          <FieldLabel label="Reason (optional)" T={T}>
            <input style={IS} value={reference}
              onChange={e => setReference(e.target.value)} placeholder="e.g. subscription charge, correction" />
          </FieldLabel>

          {amount && parseFloat(amount) > 0 && balance != null && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: T.elevated, border: `1px solid ${T.border}`, fontSize: 12, color: T.textSecondary }}>
              Balance after debit:{' '}
              <strong style={{ color: parseFloat(amount) > balance ? '#dc2626' : T.text }}>
                ₦{Math.max(0, balance - parseFloat(amount)).toLocaleString('en-NG')}
              </strong>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: '0 0 auto', height: 44, padding: '0 22px', borderRadius: 10, background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
            Cancel
          </button>
          <button onClick={debit} disabled={saving} style={{ flex: 1, height: 44, borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'Inter,sans-serif' }}>
            {saving ? 'Processing…' : `Debit${amount && parseFloat(amount) > 0 ? ` ₦${parseFloat(amount).toLocaleString('en-NG')}` : ''}`}
          </button>
        </div>
      </div>
    </>
  )
}

// ════════════════════ PARTNERS TAB ════════════════════
function PartnersTab({T}:{T:Theme}) {
  const [apps,setApps]=useState<PartnerApp[]>([]); const [pagination,setPagination]=useState<Pagination>(emptyPagination)
  const [loading,setLoading]=useState(true); const [statusFilter,setStatusFilter]=useState(''); const [expanded,setExpanded]=useState<string|null>(null)
  const [actionLoading,setActionLoading]=useState<string|null>(null)
  const load=useCallback(async(page=1,status=statusFilter)=>{setLoading(true);const params=new URLSearchParams({page:String(page),limit:'20'});if(status)params.set('status',status);const r=await apiFetch(`/v2/admin/partners?${params}`);if(r.ok){setApps(r.data||[]);setPagination(parsePagination(r))}setLoading(false)},[statusFilter])
  useEffect(()=>{load()},[])
  const approve=async(id:string)=>{const notes=prompt('Approval notes (optional):');if(notes===null)return;setActionLoading(id);const r=await apiFetch(`/v2/admin/partners/${id}/approve`,{method:'POST',body:JSON.stringify({notes})});if(r.ok)await load(pagination.page);else toast.error(r.error||'Failed');setActionLoading(null)}
  const reject=async(id:string)=>{const reason=prompt('Rejection reason:');if(!reason)return;setActionLoading(id);const r=await apiFetch(`/v2/admin/partners/${id}/reject`,{method:'POST',body:JSON.stringify({reason})});if(r.ok)await load(pagination.page);else toast.error(r.error||'Failed');setActionLoading(null)}
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

// ════════════════════════════════════════════════════════════════════
// LINKS TAB — Short links management with full feature support
// ════════════════════════════════════════════════════════════════════
//
// Feature matrix (UI ↔ backend)
//   ✅ Edit destination               short_links.destination_url
//   ✅ Expiration by date             short_links.expires_at
//   ✅ Expiration by click limit      short_links.click_limit
//   ✅ Link cloaking                  short_links.cloak
//   ✅ Referrer hiding                short_links.hide_referrer
//   ✅ Password protection            short_links.password_hash (SHA-256)
//   ✅ Deep links (ios/android)       short_links.deep_link_* + *_app_store_id / *_package
//   ✅ Region / city / country / OS   short_link_rules (priority-ordered)
//   ✅ QR code w/ color + download    client-side, via api.qrserver.com
//   ✅ UTM params                     short_links.utm_*
//   ✅ Edit existing links            PATCH /v2/admin/links/:id
//   ⛔ Main-page redirect / 404        domain-level, belongs in shortener worker settings, not per-link
//
// Conventions
//   • All new sub-components (form sections, pickers, rule editors) are
//     defined at module level — never inside LinksTab — to preserve
//     input focus across re-renders. See userMemory: "Component stability".
//   • Only `SmallBtn`, `Card`, `Loading`, `EmptyState`, `PaginationBar`,
//     `apiFetch`, `toast`, `inputStyle`, `parsePagination`, `Pagination`,
//     `emptyPagination`, `Theme` are imported from the existing admin scope.

type LinkRow = {
  id: string
  slug: string
  destination_url: string
  active: boolean
  click_count: number
  click_limit: number | null
  expires_at: string | null
  tags: string | null
  has_password?: boolean
  cloak?: boolean
  hide_referrer?: boolean
  deep_link_ios?: string | null
  deep_link_android?: string | null
  ios_app_store_id?: string | null
  android_package?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  qr_config?: { fg?: string; bg?: string; logo_url?: string; ecc?: 'L'|'M'|'Q'|'H' } | null
  created_at?: string
  updated_at?: string
}

type LinkRule = {
  id?: string
  link_id?: string
  priority: number
  match_type: 'country' | 'region' | 'city' | 'os'
  match_value: string
  destination_url: string
}

type LinkFormState = Partial<LinkRow> & {
  password?: string        // plain text on write; never received back
  clearPassword?: boolean  // explicit flag to null out server-side
  rules: LinkRule[]
}

const EMPTY_LINK_FORM = (): LinkFormState => ({
  slug: '',
  destination_url: '',
  tags: '',
  active: true,
  click_limit: null,
  expires_at: null,
  cloak: false,
  hide_referrer: false,
  deep_link_ios: '',
  deep_link_android: '',
  ios_app_store_id: '',
  android_package: '',
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
  qr_config: { fg: '#000000', bg: '#ffffff', ecc: 'M' },
  rules: [],
})

const SHORT_BASE = 'https://go.buysub.ng'

function toDtLocal(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function fromDtLocal(v: string): string | null {
  if (!v) return null
  return new Date(v).toISOString()
}

// ════════════════════════════════════════════════════════════════════
// MAIN TAB
// ════════════════════════════════════════════════════════════════════
function LinksTab({ T }: { T: Theme }) {
  const [links, setLinks] = useState<LinkRow[]>([])
  const [pagination, setPagination] = useState<Pagination>(emptyPagination)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchTimer = useRef<any>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<LinkFormState>(EMPTY_LINK_FORM())
  const [panelOpen, setPanelOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [qrFor, setQrFor] = useState<LinkRow | null>(null)

  const load = useCallback(async (page = 1, q = search) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (q) params.set('q', q)
    const r = await apiFetch(`/v2/admin/links?${params}`)
    if (r.ok) {
      setLinks(r.data || [])
      setPagination(parsePagination(r))
    }
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [])

  const onSearch = (q: string) => {
    setSearch(q)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => load(1, q), 400)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_LINK_FORM())
    setPanelOpen(true)
  }

  const openEdit = async (l: LinkRow) => {
    setEditingId(l.id)
    setPanelOpen(true)
    // Fetch full detail (with rules)
    const r = await apiFetch(`/v2/admin/links/${l.id}`)
    const src: any = r.ok ? r.data : l
    setForm({
      ...EMPTY_LINK_FORM(),
      ...src,
      password: '',
      clearPassword: false,
      rules: Array.isArray(src.rules) ? src.rules : [],
      qr_config: src.qr_config || { fg: '#000000', bg: '#ffffff', ecc: 'M' },
    })
  }

  const closePanel = () => {
    setPanelOpen(false)
    setEditingId(null)
    setForm(EMPTY_LINK_FORM())
  }

  const saveLink = async () => {
    if (!form.destination_url) {
      toast.error('Destination URL is required')
      return
    }
    setSaving(true)

    const payload: any = {
      destination_url: form.destination_url,
      slug: form.slug || undefined,
      tags: form.tags || null,
      active: form.active,
      expires_at: form.expires_at || null,
      click_limit: form.click_limit || null,
      cloak: !!form.cloak,
      hide_referrer: !!form.hide_referrer,
      deep_link_ios: form.deep_link_ios || null,
      deep_link_android: form.deep_link_android || null,
      ios_app_store_id: form.ios_app_store_id || null,
      android_package: form.android_package || null,
      utm_source: form.utm_source || null,
      utm_medium: form.utm_medium || null,
      utm_campaign: form.utm_campaign || null,
      utm_content: form.utm_content || null,
      utm_term: form.utm_term || null,
      qr_config: form.qr_config || null,
    }

    // Password: only send if user actually entered a non-trivial value.
    // The ' ' sentinel (used to flip the "change password" UI into input mode)
    // must be ignored; only a real, non-empty password should be submitted.
    const pwTrimmed = (form.password || '').trim()
    if (pwTrimmed) payload.password = pwTrimmed
    else if (form.clearPassword) payload.password = null

    const url = editingId ? `/v2/admin/links/${editingId}` : '/v2/admin/links'
    const method = editingId ? 'PATCH' : 'POST'
    const r = await apiFetch(url, { method, body: JSON.stringify(payload) })

    if (!r.ok) {
      toast.error(r.error || 'Failed to save link')
      setSaving(false)
      return
    }

    const savedId = editingId || r.data?.id
    // Rule sync: delete removed rules, upsert current ones
    if (savedId) {
      const { data: existing } = await apiFetch(`/v2/admin/links/${savedId}/rules`)
      const existingIds = new Set((existing || []).map((r: any) => r.id))
      const keepIds = new Set(form.rules.filter(r => r.id).map(r => r.id!))
      // Delete removed
      for (const id of existingIds) {
        if (!keepIds.has(id as string)) {
          await apiFetch(`/v2/admin/links/${savedId}/rules/${id}`, { method: 'DELETE' })
        }
      }
      // Upsert
      for (const rule of form.rules) {
        if (rule.id) {
          await apiFetch(`/v2/admin/links/${savedId}/rules/${rule.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              priority: rule.priority,
              match_type: rule.match_type,
              match_value: rule.match_value,
              destination_url: rule.destination_url,
            }),
          })
        } else {
          await apiFetch(`/v2/admin/links/${savedId}/rules`, {
            method: 'POST',
            body: JSON.stringify(rule),
          })
        }
      }
    }

    toast.success(editingId ? 'Link updated' : 'Link created')
    closePanel()
    await load(pagination.page)
    setSaving(false)
  }

  const toggleActive = async (l: LinkRow) => {
    const r = await apiFetch(`/v2/admin/links/${l.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !l.active }),
    })
    if (r.ok) {
      setLinks(prev => prev.map(x => x.id === l.id ? { ...x, active: !l.active } : x))
    } else {
      toast.error(r.error || 'Failed')
    }
  }

  const deleteLink = async (id: string) => {
    if (!confirm('Delete this link? This cannot be undone.')) return
    await apiFetch(`/v2/admin/links/${id}`, { method: 'DELETE' })
    toast.success('Link deleted')
    await load(pagination.page)
  }

  const copyShort = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(`${SHORT_BASE}/${slug}`)
      toast.success('Short link copied')
    } catch {
      toast.error('Copy failed')
    }
  }

  const IS = inputStyle(T)

  return (
    <div>
      <style>{`
        .bs-lnk-input:focus, .bs-lnk-input:focus-visible {
          outline: none !important; border-color: #7C5CFF !important;
        }
        .bs-lnk-card { transition: border-color .18s, transform .18s; }
        .bs-lnk-card:hover { border-color: var(--bs-border-strong) !important; transform: translateY(-1px); }
        .bs-lnk-new-btn:hover { background:#6B4EE6 !important; }
        .bs-lnk-ghost:hover:not(:disabled) { background: var(--bs-bg-muted) !important; }
        .bs-lnk-ghost-danger:hover:not(:disabled) {
          background: rgba(var(--bs-error-rgb), .08) !important;
          border-color: rgba(var(--bs-error-rgb), .35) !important;
          color: var(--bs-error) !important;
        }
        .bs-lnk-ghost-accent:hover:not(:disabled) {
          background: rgba(var(--bs-accent-rgb), .1) !important;
          border-color: rgba(var(--bs-accent-rgb), .4) !important;
          color: #7C5CFF !important;
        }
      `}</style>

      {/* ─── HEADER ─── */}
      <div style={{
        display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 10,
        marginBottom: 18,
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1 }}>
          Short links
        </div>
        <div style={{ fontSize: 12, color: T.textMuted }}>
          {pagination.total || links.length} total · go.buysub.ng
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={openCreate}
          className="bs-lnk-new-btn"
          style={{
            height: 42, padding: '0 20px', borderRadius: 10,
            background: T.accent, border: 'none', color: '#fff',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 14px rgba(124,92,255,0.25)',
            transition: 'background .15s',
          }}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
          New link
        </button>
      </div>

      {/* ─── SEARCH ─── */}
      <div style={{ position: 'relative', maxWidth: 380, marginBottom: 20 }}>
        <input
          className="bs-lnk-input"
          placeholder="Search slug, destination, or tag…"
          value={search}
          onChange={e => onSearch(e.target.value)}
          style={{ ...IS, paddingLeft: 36, width: '100%' }}
        />
        <div style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: T.textMuted, fontSize: 14, pointerEvents: 'none',
        }}>⌕</div>
      </div>

      {/* ─── LIST ─── */}
      {loading ? (
        <Loading T={T} />
      ) : links.length === 0 ? (
        <EmptyState text="No links yet — create your first one" T={T} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {links.map(l => (
            <LinkRowCard
              key={l.id}
              T={T}
              link={l}
              onEdit={() => openEdit(l)}
              onToggle={() => toggleActive(l)}
              onDelete={() => deleteLink(l.id)}
              onCopy={() => copyShort(l.slug)}
              onQR={() => setQrFor(l)}
            />
          ))}
        </div>
      )}

      {pagination?.pages > 1 && (
        <div style={{ marginTop: 20 }}>
          <PaginationBar T={T} pagination={pagination} onPage={p => load(p)} />
        </div>
      )}

      {/* ─── EDITOR DRAWER ─── */}
      {panelOpen && (
        <LinkEditorDrawer
          T={T}
          form={form}
          setForm={setForm}
          onSave={saveLink}
          onCancel={closePanel}
          saving={saving}
          isEdit={!!editingId}
        />
      )}

      {/* ─── QR DIALOG ─── */}
      {qrFor && (
        <QrDialog
          T={T}
          link={qrFor}
          onClose={() => setQrFor(null)}
          onSaveConfig={async (cfg) => {
            await apiFetch(`/v2/admin/links/${qrFor.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ qr_config: cfg }),
            })
            toast.success('QR config saved')
            await load(pagination.page)
          }}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// LIST ROW
// ════════════════════════════════════════════════════════════════════
function LinkRowCard({
  T, link, onEdit, onToggle, onDelete, onCopy, onQR,
}: {
  T: Theme
  link: LinkRow
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  onCopy: () => void
  onQR: () => void
}) {
  const features: { label: string; icon: string }[] = []
  if (link.has_password)  features.push({ label: 'Password', icon: '🔒' })
  if (link.cloak)         features.push({ label: 'Cloaked',  icon: '🪞' })
  if (link.hide_referrer) features.push({ label: 'No ref',   icon: '🕶️' })
  if (link.deep_link_ios || link.deep_link_android)
                          features.push({ label: 'Deep link', icon: '📱' })

  const expMs = link.expires_at ? new Date(link.expires_at).getTime() - Date.now() : null
  const limitReached = link.click_limit != null && link.click_count >= link.click_limit
  const isExpired = expMs != null && expMs < 0

  return (
    <div
      className="bs-lnk-card"
      style={{
        background: T.card,
        border: `1px solid ${link.active && !isExpired && !limitReached ? '#1C1C1F' : T.border}`,
        borderRadius: 16,
        padding: '16px 18px',
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        flexWrap: 'wrap',
        opacity: link.active && !isExpired && !limitReached ? 1 : 0.6,
      }}
    >
      {/* Identity */}
      <div style={{ minWidth: 0, flex: '1 1 320px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: T.accent,
            fontFamily: "'SF Mono', Menlo, monospace",
          }}>
            /{link.slug}
          </span>
          <span style={{
            fontSize: 11, color: T.textMuted,
            fontFamily: "'SF Mono', Menlo, monospace",
          }}>
            go.buysub.ng
          </span>
          {features.map(f => (
            <span key={f.label} title={f.label} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              height: 20, padding: '0 8px', borderRadius: 999,
              background: 'rgba(var(--bs-accent-rgb), .1)',
              border: '1px solid rgba(var(--bs-accent-rgb), .25)',
              color: T.accent, fontSize: 10, fontWeight: 600,
            }}>
              <span style={{ fontSize: 10 }}>{f.icon}</span>
              {f.label}
            </span>
          ))}
        </div>
        <div style={{
          fontSize: 12, color: T.textMuted, marginTop: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          → {link.destination_url}
        </div>
        <div style={{ fontSize: 11, color: T.textFaint, marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span>{link.click_count || 0} click{link.click_count === 1 ? '' : 's'}
            {link.click_limit ? ` / ${link.click_limit}` : ''}
          </span>
          {link.expires_at && (
            <span style={{ color: isExpired ? T.warning : T.textFaint }}>
              {isExpired ? 'Expired' : `Expires ${new Date(link.expires_at).toLocaleDateString()}`}
            </span>
          )}
          {link.tags && <span>· {link.tags}</span>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <IconBtn T={T} onClick={onCopy} title="Copy short URL">📋</IconBtn>
        <IconBtn T={T} onClick={onQR} title="Show QR code">▦</IconBtn>
        <GhostBtn T={T} onClick={onEdit} variant="accent">Edit</GhostBtn>
        <GhostBtn T={T} onClick={onToggle}>
          {link.active ? 'Pause' : 'Resume'}
        </GhostBtn>
        <GhostBtn T={T} onClick={onDelete} variant="danger">Delete</GhostBtn>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// EDITOR DRAWER — Tabbed sections
// ════════════════════════════════════════════════════════════════════
type EditorTab = 'basics' | 'targeting' | 'security' | 'deeplinks' | 'utm' | 'qr'

function LinkEditorDrawer({
  T, form, setForm, onSave, onCancel, saving, isEdit,
}: {
  T: Theme
  form: LinkFormState
  setForm: React.Dispatch<React.SetStateAction<LinkFormState>>
  onSave: () => void
  onCancel: () => void
  saving: boolean
  isEdit: boolean
}) {
  const [tab, setTab] = useState<EditorTab>('basics')
  const IS = inputStyle(T)

  const tabs: { id: EditorTab; label: string; hint: string }[] = [
    { id: 'basics',    label: 'Basics',     hint: 'URL, slug, expiry' },
    { id: 'targeting', label: 'Targeting',  hint: 'Geo & OS rules' },
    { id: 'security',  label: 'Security',   hint: 'Password, cloak, referrer' },
    { id: 'deeplinks', label: 'Deep links', hint: 'iOS & Android' },
    { id: 'utm',       label: 'UTM',        hint: 'Campaign tracking' },
    { id: 'qr',        label: 'QR code',    hint: 'Preview & download' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          zIndex: 150, animation: 'bsFadeIn .2s ease',
        }}
      />
      <style>{`@keyframes bsFadeIn { from{opacity:0} to{opacity:1} } @keyframes bsSlideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }`}</style>

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(560px, 100vw)',
        background: T.card,
        borderLeft: `1px solid ${T.border}`,
        zIndex: 200,
        display: 'flex', flexDirection: 'column',
        animation: 'bsSlideIn .25s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 14px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>
              {isEdit ? 'Edit link' : 'New short link'}
            </div>
            {form.slug && (
              <div style={{
                fontSize: 11, color: T.textMuted, marginTop: 2,
                fontFamily: "'SF Mono', Menlo, monospace",
              }}>
                {SHORT_BASE}/{form.slug}
              </div>
            )}
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'transparent', border: `1px solid ${T.border}`,
              color: T.textSecondary, cursor: 'pointer', fontSize: 16,
            }}
          >×</button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4,
          padding: '12px 24px 0',
          borderBottom: `1px solid ${T.border}`,
          overflowX: 'auto',
        }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${tab === t.id ? T.accent : 'transparent'}`,
                color: tab === t.id ? T.text : T.textMuted,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                marginBottom: -1, whiteSpace: 'nowrap',
                transition: 'color .15s, border-color .15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {tab === 'basics'    && <BasicsSection T={T} form={form} setForm={setForm} IS={IS} />}
          {tab === 'targeting' && <TargetingSection T={T} form={form} setForm={setForm} IS={IS} />}
          {tab === 'security'  && <SecuritySection T={T} form={form} setForm={setForm} IS={IS} isEdit={isEdit} />}
          {tab === 'deeplinks' && <DeepLinksSection T={T} form={form} setForm={setForm} IS={IS} />}
          {tab === 'utm'       && <UtmSection T={T} form={form} setForm={setForm} IS={IS} />}
          {tab === 'qr'        && <QrSection T={T} form={form} setForm={setForm} IS={IS} />}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${T.border}`,
          display: 'flex', gap: 10,
        }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: '0 22px', height: 44, borderRadius: 10,
              background: 'transparent',
              border: `1px solid ${T.border}`,
              color: T.textSecondary,
              fontSize: 14, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="bs-lnk-new-btn"
            style={{
              flex: 1, height: 44, borderRadius: 10,
              background: T.accent, border: 'none', color: '#fff',
              fontSize: 14, fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Create link')}
          </button>
        </div>
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════
// EDITOR SECTIONS (module-level to preserve focus)
// ════════════════════════════════════════════════════════════════════

function SectionLabel({ T, children }: { T: Theme; children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, color: T.textMuted, textTransform: 'uppercase',
      letterSpacing: '0.08em', fontWeight: 600, marginBottom: 10,
    }}>{children}</div>
  )
}

function FieldStack({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>
}

function Label({ T, children, hint }: { T: Theme; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{children}</div>
      {hint && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{hint}</div>}
    </div>
  )
}

function ToggleRow({
  T, label, hint, value, onChange,
}: {
  T: Theme; label: string; hint?: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        background: T.elevated,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        cursor: 'pointer',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{
        width: 38, height: 22, borderRadius: 999,
        background: value ? T.accent : T.border,
        position: 'relative', transition: 'background .15s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 2, left: value ? 18 : 2,
          width: 18, height: 18, borderRadius: 999,
          background: '#fff', transition: 'left .15s',
        }} />
      </div>
    </div>
  )
}

// ── BASICS ──────────────────────────────────────────────────────────
function BasicsSection({ T, form, setForm, IS }: any) {
  return (
    <FieldStack>
      <SectionLabel T={T}>Destination</SectionLabel>
      <div>
        <Label T={T} hint="The full URL visitors will land on.">Destination URL *</Label>
        <input
          className="bs-lnk-input"
          value={form.destination_url || ''}
          onChange={(e: any) => setForm((f: any) => ({ ...f, destination_url: e.target.value }))}
          placeholder="https://example.com/landing"
          style={IS}
        />
      </div>

      <div>
        <Label T={T} hint="Leave blank to auto-generate. Lowercase letters, numbers, and dashes only.">
          Custom slug
        </Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <div style={{
            height: 42, padding: '0 12px', display: 'flex', alignItems: 'center',
            background: T.elevated, border: `1px solid ${T.border}`,
            borderRight: 'none', borderRadius: '10px 0 0 10px',
            fontSize: 13, color: T.textMuted,
            fontFamily: "'SF Mono', Menlo, monospace",
          }}>
            go.buysub.ng/
          </div>
          <input
            className="bs-lnk-input"
            value={form.slug || ''}
            onChange={(e: any) => setForm((f: any) => ({
              ...f,
              slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
            }))}
            placeholder="my-link"
            style={{ ...IS, borderRadius: '0 10px 10px 0', flex: 1 }}
          />
        </div>
      </div>

      <div>
        <Label T={T}>Tags</Label>
        <input
          className="bs-lnk-input"
          value={form.tags || ''}
          onChange={(e: any) => setForm((f: any) => ({ ...f, tags: e.target.value }))}
          placeholder="campaign, winter-2026"
          style={IS}
        />
      </div>

      <div style={{ height: 1, background: T.border, margin: '8px 0' }} />
      <SectionLabel T={T}>Expiration</SectionLabel>

      <FieldRow>
        <div>
          <Label T={T} hint="Link stops working after this date.">Expires at</Label>
          <input
            className="bs-lnk-input"
            type="datetime-local"
            value={toDtLocal(form.expires_at)}
            onChange={(e: any) => setForm((f: any) => ({ ...f, expires_at: fromDtLocal(e.target.value) }))}
            style={{ ...IS, colorScheme: 'dark' }}
          />
        </div>
        <div>
          <Label T={T} hint="Stop after N clicks. Blank = no limit.">Click limit</Label>
          <input
            className="bs-lnk-input"
            type="number"
            min={0}
            value={form.click_limit ?? ''}
            onChange={(e: any) => setForm((f: any) => ({
              ...f,
              click_limit: e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10)),
            }))}
            placeholder="e.g. 100"
            style={IS}
          />
        </div>
      </FieldRow>
    </FieldStack>
  )
}

// ── TARGETING ───────────────────────────────────────────────────────
function TargetingSection({ T, form, setForm, IS }: any) {
  const addRule = () => {
    setForm((f: any) => ({
      ...f,
      rules: [
        ...f.rules,
        {
          priority: (f.rules[f.rules.length - 1]?.priority ?? 50) + 10,
          match_type: 'country',
          match_value: '',
          destination_url: '',
        },
      ],
    }))
  }
  const updateRule = (idx: number, patch: Partial<LinkRule>) => {
    setForm((f: any) => ({
      ...f,
      rules: f.rules.map((r: LinkRule, i: number) => i === idx ? { ...r, ...patch } : r),
    }))
  }
  const removeRule = (idx: number) => {
    setForm((f: any) => ({ ...f, rules: f.rules.filter((_: any, i: number) => i !== idx) }))
  }

  return (
    <FieldStack>
      <SectionLabel T={T}>Targeting rules</SectionLabel>
      <div style={{
        padding: 12, borderRadius: 10,
        background: `rgba(var(--bs-accent-rgb), 0.06)`,
        border: `1px solid rgba(var(--bs-accent-rgb), 0.2)`,
        fontSize: 12, color: T.textSecondary, lineHeight: 1.5,
      }}>
        Rules are evaluated in <strong>priority order (lowest first)</strong>.
        The first rule that matches the visitor's country, region, city, or OS wins.
        If no rule matches, the visitor falls through to the main <strong>Destination URL</strong>.
      </div>

      {form.rules.length === 0 ? (
        <div style={{
          padding: 20, textAlign: 'center', fontSize: 13,
          color: T.textMuted,
          background: T.elevated, border: `1px dashed ${T.border}`, borderRadius: 12,
        }}>
          No rules yet. All visitors go to the default destination.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {form.rules.map((rule: LinkRule, idx: number) => (
            <div key={rule.id || idx} style={{
              padding: 14, borderRadius: 12,
              background: T.elevated, border: `1px solid ${T.border}`,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 999,
                  background: 'rgba(var(--bs-accent-rgb), .15)',
                  color: T.accent, fontSize: 11, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>{idx + 1}</span>
                <span style={{ fontSize: 12, color: T.textSecondary, fontWeight: 500 }}>
                  Rule {idx + 1}
                </span>
                <div style={{ flex: 1 }} />
                <input
                  className="bs-lnk-input"
                  type="number"
                  value={rule.priority}
                  onChange={(e: any) => updateRule(idx, { priority: parseInt(e.target.value, 10) || 0 })}
                  title="Priority (lower = evaluated first)"
                  style={{ ...IS, width: 70, height: 30, fontSize: 12, padding: '0 8px' }}
                />
                <button
                  onClick={() => removeRule(idx)}
                  className="bs-lnk-ghost-danger"
                  style={{
                    height: 30, padding: '0 10px', borderRadius: 999,
                    background: 'transparent', border: `1px solid ${T.border}`,
                    color: T.textMuted, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >Remove</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 8 }}>
                <select
                  className="bs-lnk-input"
                  value={rule.match_type}
                  onChange={(e: any) => updateRule(idx, { match_type: e.target.value as any })}
                  style={IS}
                >
                  <option value="country">If country is…</option>
                  <option value="region">If region is…</option>
                  <option value="city">If city is…</option>
                  <option value="os">If OS is…</option>
                </select>
                {rule.match_type === 'os' ? (
                  <select
                    className="bs-lnk-input"
                    value={rule.match_value}
                    onChange={(e: any) => updateRule(idx, { match_value: e.target.value })}
                    style={IS}
                  >
                    <option value="">Select OS…</option>
                    <option value="ios">iOS</option>
                    <option value="android">Android</option>
                    <option value="desktop">Desktop</option>
                  </select>
                ) : (
                  <input
                    className="bs-lnk-input"
                    value={rule.match_value}
                    onChange={(e: any) => updateRule(idx, { match_value: e.target.value })}
                    placeholder={
                      rule.match_type === 'country' ? 'e.g. NG (ISO-2)' :
                      rule.match_type === 'region'  ? 'e.g. Lagos'      :
                      'e.g. Ikeja'
                    }
                    style={IS}
                  />
                )}
              </div>

              <input
                className="bs-lnk-input"
                value={rule.destination_url}
                onChange={(e: any) => updateRule(idx, { destination_url: e.target.value })}
                placeholder="Destination URL for matching visitors"
                style={IS}
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={addRule}
        style={{
          width: '100%', height: 40,
          background: 'transparent', border: `1px dashed ${T.border}`,
          borderRadius: 10, color: T.textSecondary, fontSize: 13, fontWeight: 500,
          cursor: 'pointer',
        }}
      >+ Add rule</button>
    </FieldStack>
  )
}

// ── SECURITY ────────────────────────────────────────────────────────
function SecuritySection({ T, form, setForm, IS, isEdit }: any) {
  const alreadyHasPassword = isEdit && (form as any).has_password && !form.clearPassword
  return (
    <FieldStack>
      <SectionLabel T={T}>Access control</SectionLabel>

      <div>
        <Label T={T} hint="Visitors must enter this password before being redirected.">
          Password protection
        </Label>
        {alreadyHasPassword && !form.password ? (
          <div style={{
            padding: 12, borderRadius: 10,
            background: T.elevated, border: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <div style={{ fontSize: 13, color: T.text, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🔒</span> Password is set
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setForm((f: any) => ({ ...f, password: ' ' }))}
                style={{
                  height: 30, padding: '0 12px', borderRadius: 999,
                  background: 'transparent', border: `1px solid ${T.border}`,
                  color: T.text, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >Change</button>
              <button
                onClick={() => setForm((f: any) => ({ ...f, clearPassword: true, password: '' }))}
                style={{
                  height: 30, padding: '0 12px', borderRadius: 999,
                  background: 'transparent', border: `1px solid ${T.border}`,
                  color: T.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >Remove</button>
            </div>
          </div>
        ) : (
          <input
            className="bs-lnk-input"
            type="password"
            value={form.password === ' ' ? '' : (form.password || '')}
            onChange={(e: any) => setForm((f: any) => ({ ...f, password: e.target.value, clearPassword: false }))}
            placeholder={alreadyHasPassword ? 'Enter new password' : 'Enter password (leave blank for none)'}
            style={IS}
            autoComplete="new-password"
          />
        )}
      </div>

      <ToggleRow
        T={T}
        label="Link cloaking"
        hint="Keep the short URL in the address bar by loading the destination inside a frame."
        value={!!form.cloak}
        onChange={v => setForm((f: any) => ({ ...f, cloak: v }))}
      />

      <ToggleRow
        T={T}
        label="Hide referrer"
        hint="Strip the Referer header so the destination site doesn't see where visitors came from."
        value={!!form.hide_referrer}
        onChange={v => setForm((f: any) => ({ ...f, hide_referrer: v }))}
      />

      {form.cloak && (
        <div style={{
          padding: 12, borderRadius: 10,
          background: `rgba(var(--bs-warning-rgb), 0.08)`,
          border: `1px solid rgba(var(--bs-warning-rgb), 0.25)`,
          fontSize: 12, color: T.textSecondary, lineHeight: 1.5,
        }}>
          ⚠ Many sites set <code>X-Frame-Options: DENY</code> which prevents cloaking.
          Test the link after enabling — if the destination goes blank, disable cloaking.
        </div>
      )}
    </FieldStack>
  )
}

// ── DEEP LINKS ──────────────────────────────────────────────────────
function DeepLinksSection({ T, form, setForm, IS }: any) {
  return (
    <FieldStack>
      <SectionLabel T={T}>iOS</SectionLabel>
      <div>
        <Label T={T} hint="e.g. instagram://user?username=buysub">iOS URL scheme</Label>
        <input
          className="bs-lnk-input"
          value={form.deep_link_ios || ''}
          onChange={(e: any) => setForm((f: any) => ({ ...f, deep_link_ios: e.target.value }))}
          placeholder="myapp://path"
          style={IS}
        />
      </div>
      <div>
        <Label T={T} hint="Used as fallback if the app isn't installed.">App Store ID</Label>
        <input
          className="bs-lnk-input"
          value={form.ios_app_store_id || ''}
          onChange={(e: any) => setForm((f: any) => ({ ...f, ios_app_store_id: e.target.value }))}
          placeholder="id1234567890"
          style={IS}
        />
      </div>

      <div style={{ height: 1, background: T.border, margin: '8px 0' }} />
      <SectionLabel T={T}>Android</SectionLabel>
      <div>
        <Label T={T} hint="e.g. intent://... or a custom scheme.">Android deep link</Label>
        <input
          className="bs-lnk-input"
          value={form.deep_link_android || ''}
          onChange={(e: any) => setForm((f: any) => ({ ...f, deep_link_android: e.target.value }))}
          placeholder="myapp://path"
          style={IS}
        />
      </div>
      <div>
        <Label T={T} hint="Used as Play Store fallback.">Package name</Label>
        <input
          className="bs-lnk-input"
          value={form.android_package || ''}
          onChange={(e: any) => setForm((f: any) => ({ ...f, android_package: e.target.value }))}
          placeholder="com.example.app"
          style={IS}
        />
      </div>

      <div style={{
        padding: 12, borderRadius: 10,
        background: `rgba(var(--bs-accent-rgb), 0.06)`,
        border: `1px solid rgba(var(--bs-accent-rgb), 0.2)`,
        fontSize: 12, color: T.textSecondary, lineHeight: 1.5,
      }}>
        Desktop visitors always see the regular destination URL.
        Mobile visitors will be taken to the app — or to the App Store / Play Store
        if it isn't installed.
      </div>
    </FieldStack>
  )
}

// ── UTM ─────────────────────────────────────────────────────────────
function UtmSection({ T, form, setForm, IS }: any) {
  const fields = [
    { key: 'utm_source',   label: 'utm_source',   placeholder: 'e.g. newsletter' },
    { key: 'utm_medium',   label: 'utm_medium',   placeholder: 'e.g. email' },
    { key: 'utm_campaign', label: 'utm_campaign', placeholder: 'e.g. black-friday' },
    { key: 'utm_content',  label: 'utm_content',  placeholder: 'e.g. header-cta' },
    { key: 'utm_term',     label: 'utm_term',     placeholder: 'e.g. keyword' },
  ]
  return (
    <FieldStack>
      <SectionLabel T={T}>UTM parameters</SectionLabel>
      <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>
        Appended to the destination URL when visitors click.
      </div>
      {fields.map(f => (
        <div key={f.key}>
          <Label T={T}>{f.label}</Label>
          <input
            className="bs-lnk-input"
            value={form[f.key] || ''}
            onChange={(e: any) => setForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            style={IS}
          />
        </div>
      ))}
    </FieldStack>
  )
}

// ── QR (inside drawer) ──────────────────────────────────────────────
function QrSection({ T, form, setForm, IS }: any) {
  const cfg = form.qr_config || { fg: '#000000', bg: '#ffffff', ecc: 'M' }
  const shortUrl = form.slug ? `${SHORT_BASE}/${form.slug}` : ''

  const setCfg = (patch: any) =>
    setForm((f: any) => ({ ...f, qr_config: { ...cfg, ...patch } }))

  return (
    <FieldStack>
      <SectionLabel T={T}>QR code</SectionLabel>
      {!shortUrl ? (
        <div style={{
          padding: 20, textAlign: 'center',
          background: T.elevated, border: `1px solid ${T.border}`,
          borderRadius: 12, fontSize: 13, color: T.textMuted,
        }}>
          Set a slug first to generate a QR code.
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex', justifyContent: 'center',
            padding: 20, background: T.elevated,
            border: `1px solid ${T.border}`, borderRadius: 16,
          }}>
            <QrPreview url={shortUrl} cfg={cfg} size={220} />
          </div>

          <FieldRow>
            <div>
              <Label T={T}>Foreground</Label>
              <ColorInput T={T} value={cfg.fg || '#000000'} onChange={v => setCfg({ fg: v })} />
            </div>
            <div>
              <Label T={T}>Background</Label>
              <ColorInput T={T} value={cfg.bg || '#ffffff'} onChange={v => setCfg({ bg: v })} />
            </div>
          </FieldRow>

          <div>
            <Label T={T} hint="Higher = more tolerant of logos/damage, but denser pattern.">
              Error correction
            </Label>
            <div style={{
              display: 'flex', gap: 4,
              background: T.elevated, border: `1px solid ${T.border}`,
              borderRadius: 999, padding: 4,
            }}>
              {(['L', 'M', 'Q', 'H'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setCfg({ ecc: level })}
                  style={{
                    flex: 1, height: 32, borderRadius: 999, border: 'none',
                    background: cfg.ecc === level ? T.accent : 'transparent',
                    color: cfg.ecc === level ? '#fff' : T.text,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >{level}</button>
              ))}
            </div>
          </div>

          <button
            onClick={() => downloadQr(shortUrl, cfg)}
            style={{
              height: 40, padding: '0 16px', borderRadius: 10,
              background: 'transparent', border: `1px solid ${T.border}`,
              color: T.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >⬇ Download QR (PNG)</button>
        </>
      )}
    </FieldStack>
  )
}

// ════════════════════════════════════════════════════════════════════
// QR PRIMITIVES
// ════════════════════════════════════════════════════════════════════

function QrPreview({
  url, cfg, size = 200,
}: {
  url: string
  cfg: { fg?: string; bg?: string; ecc?: 'L'|'M'|'Q'|'H' }
  size?: number
}) {
  // Use goqr.me service — no external npm dep. Accepts hex colors without #.
  const fg = (cfg.fg || '#000000').replace('#', '')
  const bg = (cfg.bg || '#ffffff').replace('#', '')
  const src = `https://api.qrserver.com/v1/create-qr-code/?` + new URLSearchParams({
    data: url,
    size: `${size}x${size}`,
    color: fg,
    bgcolor: bg,
    ecc: cfg.ecc || 'M',
    margin: '2',
    format: 'png',
  }).toString()
  return (
    <img
      src={src}
      alt="QR code"
      width={size}
      height={size}
      style={{ borderRadius: 12, display: 'block', background: cfg.bg || '#fff' }}
    />
  )
}

async function downloadQr(
  url: string,
  cfg: { fg?: string; bg?: string; ecc?: 'L'|'M'|'Q'|'H' }
) {
  const fg = (cfg.fg || '#000000').replace('#', '')
  const bg = (cfg.bg || '#ffffff').replace('#', '')
  const src = `https://api.qrserver.com/v1/create-qr-code/?` + new URLSearchParams({
    data: url,
    size: '1024x1024',
    color: fg,
    bgcolor: bg,
    ecc: cfg.ecc || 'M',
    margin: '2',
    format: 'png',
  }).toString()
  try {
    const res = await fetch(src)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const slug = url.split('/').pop() || 'qr'
    a.download = `buysub-qr-${slug}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  } catch {
    window.open(src, '_blank')
  }
}

function ColorInput({
  T, value, onChange,
}: { T: Theme; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      height: 42, padding: '0 10px',
      background: T.elevated, border: `1px solid ${T.border}`,
      borderRadius: 10,
    }}>
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: 28, height: 28, padding: 0,
          border: 'none', borderRadius: 6,
          background: 'transparent', cursor: 'pointer',
        }}
      />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1, height: 32, padding: '0 6px',
          background: 'transparent', border: 'none', outline: 'none',
          color: T.text, fontSize: 13,
          fontFamily: "'SF Mono', Menlo, monospace",
        }}
      />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// QR DIALOG (invoked from list row)
// ════════════════════════════════════════════════════════════════════
function QrDialog({
  T, link, onClose, onSaveConfig,
}: {
  T: Theme
  link: LinkRow
  onClose: () => void
  onSaveConfig: (cfg: any) => Promise<void>
}) {
  const [cfg, setCfg] = useState(link.qr_config || { fg: '#000000', bg: '#ffffff', ecc: 'M' as const })
  const url = `${SHORT_BASE}/${link.slug}`

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 250, padding: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 20, width: '100%', maxWidth: 420,
            padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>QR code</div>
            <div style={{
              fontSize: 12, color: T.textMuted,
              fontFamily: "'SF Mono', Menlo, monospace",
            }}>/{link.slug}</div>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'center',
            padding: 20, background: T.elevated,
            border: `1px solid ${T.border}`, borderRadius: 16,
          }}>
            <QrPreview url={url} cfg={cfg} size={220} />
          </div>

          <FieldRow>
            <div>
              <Label T={T}>Foreground</Label>
              <ColorInput T={T} value={cfg.fg || '#000'} onChange={v => setCfg(c => ({ ...c, fg: v }))} />
            </div>
            <div>
              <Label T={T}>Background</Label>
              <ColorInput T={T} value={cfg.bg || '#fff'} onChange={v => setCfg(c => ({ ...c, bg: v }))} />
            </div>
          </FieldRow>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, height: 42, borderRadius: 10,
                background: 'transparent', border: `1px solid ${T.border}`,
                color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >Close</button>
            <button
              onClick={() => downloadQr(url, cfg)}
              style={{
                flex: 1, height: 42, borderRadius: 10,
                background: 'transparent', border: `1px solid ${T.border}`,
                color: T.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >Download</button>
            <button
              onClick={async () => { await onSaveConfig(cfg); onClose() }}
              style={{
                flex: 1, height: 42, borderRadius: 10,
                background: T.accent, border: 'none', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >Save</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════
// SMALL SHARED BUTTONS
// ════════════════════════════════════════════════════════════════════
function IconBtn({
  T, onClick, title, children,
}: { T: Theme; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="bs-lnk-ghost"
      style={{
        width: 34, height: 34, borderRadius: 10,
        background: 'transparent', border: `1px solid ${T.border}`,
        color: T.textSecondary, fontSize: 14, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </button>
  )
}

function GhostBtn({
  T, onClick, children, variant,
}: {
  T: Theme
  onClick: () => void
  children: React.ReactNode
  variant?: 'accent' | 'danger'
}) {
  const cls =
    variant === 'danger' ? 'bs-lnk-ghost-danger' :
    variant === 'accent' ? 'bs-lnk-ghost-accent' :
    'bs-lnk-ghost'
  return (
    <button
      onClick={onClick}
      className={cls}
      style={{
        height: 34, padding: '0 12px', borderRadius: 10,
        background: 'transparent', border: `1px solid ${T.border}`,
        color: T.text, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      }}
    >
      {children}
    </button>
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
  const createAd=async()=>{if(!newAd.title||!newAd.image_url||!newAd.link)return;setCreating(true);const r=await apiFetch('/v2/admin/ads',{method:'POST',body:JSON.stringify(newAd)});if(r.ok){setNewAd({title:'',image_url:'',link:'',placement:'shop_banner'});setShowCreate(false);await load(1)}else toast.error(r.error||'Failed');setCreating(false)}
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
    if (!newDiscount.code) { toast.error('Code is required'); return }
    setCreating(true)
    const r = await apiFetch('/v2/admin/discounts', { method: 'POST', body: JSON.stringify({ ...newDiscount, code: newDiscount.code.toUpperCase() }) })
    if (r.ok) { setNewDiscount(EMPTY_DISCOUNT()); setShowCreate(false); toast.success("Discount created"); await load() }
    else toast.error(r.error || r.data?.error || 'Failed to create discount')
    setCreating(false)
  }

  const startEdit = (d: Discount) => {
    setEditingId(d.id); setExpanded(null)
    setEditForm({ code: d.code, type: d.type, value: d.value, active: d.active, min_order_ngn: d.min_order_ngn || 0, max_uses: d.max_uses, expires_at: d.expires_at ? d.expires_at.slice(0, 10) : '', active_from: d.active_from ? d.active_from.slice(0, 10) : '', max_discount_ngn: d.max_discount_ngn, included_products: d.included_products || '', excluded_products: d.excluded_products || '', included_categories: d.included_categories || '', excluded_categories: d.excluded_categories || '', auto_apply: !!d.auto_apply, scope: d.scope || 'site_wide', exclusive: !!d.exclusive })
  }

  const saveEdit = async () => {
    if (!editingId) return
    const r = await apiFetch(`/v2/admin/discounts/${editingId}`, { method: 'PATCH', body: JSON.stringify(editForm) })
    if (r.ok) { setEditingId(null); toast.success("Changes saved"); await load() } else toast.error(r.error || r.data?.error || 'Failed to update')
  }

  const deleteDiscount = async (id: string) => {
    if (!confirm('Delete this discount code?')) return
    const r = await apiFetch(`/v2/admin/discounts/${id}`, { method: 'DELETE' })
    if (r.ok) {
      await load();
      toast.success('Discount code deleted successfully')
    }
    else toast.error(r.error || 'Failed to delete discount')
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
                  <Badge status={d.active ? 'active' : 'hidden'} T={T} />
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

function NotificationsTab({ T }: { T: Theme }) {
  const initialForm = {
    title: '',
    message: '',
    type: 'modal',
    scheduled_for: '',
    image_url: '',
    image_position: 'top',
    expires_at: '',
    audience: 'all',
    steps: [] as any[]
  }

  const [form, setForm] = useState(initialForm)
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [list, setList] = useState<any[]>([])

  const load = async () => {
    const r = await apiFetch('/v2/admin/notifications')
    if (r.ok) setList(r.data || [])
  }

  const addStep = () => {
    setForm(f => ({
      ...f,
      steps: [...(f.steps || []), { title: '', message: '', image_url: '' }]
    }))
  }

  const updateStep = (index: number, key: string, value: string) => {
    setForm(f => {
      const steps = [...f.steps]
      steps[index][key] = value
      return { ...f, steps }
    })
  }

  const removeStep = (index: number) => {
    setForm(f => ({
      ...f,
      steps: f.steps.filter((_: any, i: number) => i !== index)
    }))
  }

  useEffect(() => { load() }, [])

  const toggle = async (id: string, active: boolean) => {
    const r = await apiFetch(`/v2/admin/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ active })
    })

    if (r.ok) {
      setList(l =>
        l.map(n => n.id === id ? { ...n, active } : n)
      )
    }
  }

  const startEdit = (n: any) => {
    setEditingId(n.id)
    setForm({
      title: n.title || '',
      message: n.message || '',
      type: n.type || 'modal',
      scheduled_for: n.scheduled_for
        ? new Date(n.scheduled_for).toISOString().slice(0, 16)
        : '',
      image_url: n.image_url || '',
      image_position: n.image_position || 'top',
      expires_at: n.expires_at
        ? new Date(n.expires_at).toISOString().slice(0, 16)
        : '',
      audience: n.audience || 'all',
      steps: Array.isArray(n.steps) ? n.steps : [],
    })

    // Scroll composer into view on small screens
    if (typeof window !== 'undefined' && window.scrollTo) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(initialForm)
  }

  const send = async () => {
    // Validate: need either a non-empty message OR a fully-populated steps array
    const hasValidSteps =
      Array.isArray(form.steps) &&
      form.steps.length > 0 &&
      form.steps.every((s: any) => s?.title?.trim() && s?.message?.trim())

    const hasMessage = !!form.message?.trim()

    if (!hasValidSteps && !hasMessage) {
      toast.error(
        form.steps?.length
          ? 'Each step needs a title and message'
          : 'Message or steps required'
      )
      return
    }

    setSending(true)

    const payload = {
      ...form,
      scheduled_for: form.scheduled_for || null,
      expires_at: form.expires_at || null,
      steps: hasValidSteps ? form.steps : null,
      message: hasValidSteps ? null : form.message,
    }

    const url = editingId
      ? `/v2/admin/notifications/${editingId}`
      : `/v2/admin/notifications`
    const method = editingId ? 'PATCH' : 'POST'

    const r = await apiFetch(url, {
      method,
      body: JSON.stringify(payload),
    })

    if (r.ok) {
      toast.success(editingId ? 'Notification updated' : 'Notification sent')
      setEditingId(null)
      setForm(initialForm)
      await load()
    } else {
      toast.error(r.error || 'Failed')
    }

    setSending(false)
  }

  const IS = inputStyle(T)

  // Panel section label style (uppercase small caps)
  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 600,
    marginBottom: 12,
  }

  // Sub-panel (step cards) style
  const stepPanelStyle: React.CSSProperties = {
    background: T.elevated,
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  }

  // History row styles
  const typeBadgeStyle = (type: string): React.CSSProperties => {
    const color =
      type === 'modal' ? T.accent :
      type === 'banner' ? T.warning :
      T.success
    return {
      display: 'inline-flex',
      alignItems: 'center',
      height: 22,
      padding: '0 10px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color,
      background: `rgba(var(--bs-${type === 'modal' ? 'accent' : type === 'banner' ? 'warning' : 'success'}-rgb), 0.15)`,
      border: `1px solid rgba(var(--bs-${type === 'modal' ? 'accent' : type === 'banner' ? 'warning' : 'success'}-rgb), 0.25)`,
    }
  }

  const statusPillStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 22,
    padding: '0 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    color: active ? T.success : T.textMuted,
    background: active
      ? 'rgba(var(--bs-success-rgb), 0.12)'
      : 'rgba(var(--bs-muted-rgb, 100,100,110), 0.15)',
    border: active
      ? '1px solid rgba(var(--bs-success-rgb), 0.22)'
      : `1px solid ${T.border}`,
  })

  const settingsInputStyle = {
    height: 44,
    padding: '0 14px',
    background: 'var(--bs-bg-input)',
    border: '1px solid var(--bs-border-default)',
    borderRadius: 8,
    color: 'var(--bs-text-primary)',
    fontSize: 13,
    width: '100%',
  }
  
  const primaryBtn = {
    height: 48,
    background: '#7C5CFF',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer'
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
      <style>{`
        .bs-notif-input:focus,
        .bs-notif-input:focus-visible {
          outline: none !important;
          border-color: #7C5CFF !important;
        }
        .bs-notif-step-remove:hover {
          color: var(--bs-error) !important;
          border-color: rgba(var(--bs-error-rgb), 0.4) !important;
          background: rgba(var(--bs-error-rgb), 0.06) !important;
        }
        .bs-notif-add-step:hover {
          border-color: #7C5CFF !important;
          color: #fff !important;
          background: rgba(var(--bs-accent-rgb), 0.08) !important;
        }
        .bs-notif-marquee {
          display: inline-block;
          white-space: nowrap;
          animation: bsNotifMarquee 12s linear infinite;
          padding-left: 100%;
        }
        @keyframes bsNotifMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
      `}</style>

      {/* ============================================================ */}
      {/* LEFT COLUMN — COMPOSER                                       */}
      {/* ============================================================ */}
      <div>
        <Card T={T} title={editingId ? 'Edit Notification' : 'Send Notification'}>

          {editingId && (
            <div style={{
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(var(--bs-accent-rgb), 0.08)',
              border: '1px solid rgba(var(--bs-accent-rgb), 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}>
              <div style={{ fontSize: 12, color: T.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: T.accent,
                }} />
                Editing existing notification
              </div>
              <button
                onClick={cancelEdit}
                style={{
                  background: 'transparent',
                  border: `1px solid ${T.border}`,
                  color: T.textSecondary,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 999,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* ——— BASICS ——— */}
          <div style={sectionLabel}>Basics</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <FieldLabel label="Type" T={T}>
              <select
                className="bs-notif-input"
                style={IS}
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="toast">Toast (small popup)</option>
                <option value="modal">Modal (blocking)</option>
                <option value="banner">Banner (top scrolling)</option>
              </select>
            </FieldLabel>

            <FieldLabel label="Audience" T={T}>
              <select
                className="bs-notif-input"
                style={IS}
                value={form.audience || "all"}
                onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
              >
                <option value="all">All users</option>
                <option value="users">Users only</option>
                <option value="admins">Admins only</option>
              </select>
            </FieldLabel>
          </div>

          <div style={{ marginBottom: 14 }}>
            <FieldLabel label="Title (optional)" T={T}>
              <input
                className="bs-notif-input"
                style={IS}
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. New partner added"
              />
            </FieldLabel>
          </div>

          <div style={{ marginBottom: 8 }}>
            <FieldLabel label="Message" T={T}>
              <textarea
                className="bs-notif-input"
                style={{
                  ...IS,
                  height: 96,
                  padding: '10px 12px',
                  resize: 'vertical',
                  lineHeight: 1.6,
                  fontFamily: 'Inter, sans-serif',
                }}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder={form.steps?.length ? 'Ignored — steps will be shown instead' : 'What users will see'}
                disabled={form.steps?.length > 0}
              />
            </FieldLabel>
            {form.steps?.length > 0 && (
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6 }}>
                Steps take precedence over message.
              </div>
            )}
          </div>

          {/* ——— STEPS ——— */}
          <div style={{ height: 1, background: T.border, margin: '20px 0 16px' }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <div style={{ ...sectionLabel, marginBottom: 0 }}>
              Steps {form.steps?.length ? `· ${form.steps.length}` : '(optional)'}
            </div>
          </div>

          {form.steps?.map((step: any, i: number) => (
            <div key={i} style={stepPanelStyle}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  color: T.textSecondary,
                }}>
                  <span style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: 'rgba(var(--bs-accent-rgb), 0.15)',
                    color: T.accent,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                  }}>{i + 1}</span>
                  Step {i + 1}
                </div>

                <button
                  className="bs-notif-step-remove"
                  onClick={() => removeStep(i)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${T.border}`,
                    color: T.textMuted,
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '4px 10px',
                    borderRadius: 999,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  Remove
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  className="bs-notif-input"
                  placeholder="Title"
                  value={step.title}
                  onChange={e => updateStep(i, 'title', e.target.value)}
                  style={IS}
                />
                <input
                  className="bs-notif-input"
                  placeholder="Message"
                  value={step.message}
                  onChange={e => updateStep(i, 'message', e.target.value)}
                  style={IS}
                />
                <input
                  className="bs-notif-input"
                  placeholder="Image URL (optional)"
                  value={step.image_url}
                  onChange={e => updateStep(i, 'image_url', e.target.value)}
                  style={IS}
                />
              </div>
            </div>
          ))}

          <button
            className="bs-notif-add-step"
            onClick={addStep}
            style={{
              width: '100%',
              height: 40,
              background: 'transparent',
              border: `1px dashed ${T.border}`,
              borderRadius: 10,
              color: T.textSecondary,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginTop: form.steps?.length ? 4 : 0,
            }}
          >
            + Add Step
          </button>

          {/* ——— MEDIA ——— */}
          <div style={{ height: 1, background: T.border, margin: '24px 0 16px' }} />

          <div style={sectionLabel}>Media</div>

          <div style={{ marginBottom: 12 }}>
            <FieldLabel label="Image URL (optional)" T={T}>
              <input
                className="bs-notif-input"
                style={IS}
                value={form.image_url}
                onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                placeholder="https://..."
              />
            </FieldLabel>
          </div>

          <div style={{ marginBottom: 4 }}>
            <FieldLabel label="Image Position" T={T}>
              <div style={{
                display: 'flex',
                gap: 4,
                background: T.elevated,
                border: `1px solid ${T.border}`,
                borderRadius: 999,
                padding: 4,
              }}>
                {['top', 'left', 'right'].map(pos => {
                  const active = form.image_position === pos
                  return (
                    <button
                      key={pos}
                      onClick={() => setForm(f => ({ ...f, image_position: pos }))}
                      style={{
                        flex: 1,
                        height: 32,
                        borderRadius: 999,
                        border: 'none',
                        background: active ? T.accent : 'transparent',
                        color: active ? '#fff' : T.text,
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {pos}
                    </button>
                  )
                })}
              </div>
            </FieldLabel>
          </div>

          {/* ——— SCHEDULING ——— */}
          <div style={{ height: 1, background: T.border, margin: '24px 0 16px' }} />

          <div style={sectionLabel}>Scheduling</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
            <FieldLabel label="Schedule (optional)" T={T}>
              <input
                className="bs-notif-input"
                type="datetime-local"
                style={{ ...IS, colorScheme: 'dark' }}
                value={form.scheduled_for}
                onChange={e => setForm(f => ({ ...f, scheduled_for: e.target.value }))}
              />
            </FieldLabel>

            <FieldLabel label="Expiry (optional)" T={T}>
              <input
                className="bs-notif-input"
                type="datetime-local"
                style={{ ...IS, colorScheme: 'dark' }}
                value={form.expires_at || ""}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              />
            </FieldLabel>
          </div>

          {/* ——— SEND ——— */}
          <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
            {editingId && (
              <button
                onClick={cancelEdit}
                disabled={sending}
                style={{
                  flex: '0 0 auto',
                  height: 44,
                  padding: '0 22px',
                  background: 'transparent',
                  color: T.textSecondary,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  opacity: sending ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
            )}
            <button
              onClick={send}
              disabled={sending}
              style={{
                flex: 1,
                height: 44,
                background: T.accent,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: sending ? 'not-allowed' : 'pointer',
                opacity: sending ? 0.6 : 1,
                transition: 'opacity 0.15s',
                letterSpacing: '0.01em',
              }}
            >
              {sending
                ? (editingId ? 'Saving…' : 'Sending…')
                : (editingId ? 'Save Changes' : 'Send Notification')}
            </button>
          </div>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* RIGHT COLUMN — PREVIEW + HISTORY                             */}
      {/* ============================================================ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Live preview */}
        <Card T={T} title="Live Preview">
          <div style={sectionLabel}>How it will appear</div>

          <div style={{
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: 20,
            minHeight: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {form.type === 'toast' && (
              <div style={{
                width: '100%',
                maxWidth: 320,
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: '12px 14px',
                boxShadow: '0 8px 28px rgba(0,0,0,0.32)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: T.accent,
                  marginTop: 6,
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {form.title && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>
                      {form.title}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
                    {form.message || 'Toast preview…'}
                  </div>
                </div>
              </div>
            )}

            {form.type === 'modal' && (
              <div style={{
                width: '100%',
                maxWidth: 340,
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>
                  {form.title || 'Modal Title'}
                </div>
                <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 16 }}>
                  {form.message || 'Modal message…'}
                </div>
                <div style={{
                  height: 32,
                  background: T.accent,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#fff',
                }}>
                  Got it
                </div>
              </div>
            )}

            {form.type === 'banner' && (
              <div style={{
                width: '100%',
                height: 36,
                background: `rgba(var(--bs-accent-rgb), 0.12)`,
                border: `1px solid rgba(var(--bs-accent-rgb), 0.25)`,
                borderRadius: 8,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                fontSize: 12,
                color: T.text,
                fontWeight: 500,
              }}>
                <div className="bs-notif-marquee">
                  {form.message || 'Scrolling banner message will appear here · ' }
                </div>
              </div>
            )}
          </div>

          {(form.audience && form.audience !== 'all') || form.scheduled_for || form.expires_at ? (
            <div style={{
              marginTop: 12,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
            }}>
              {form.audience && form.audience !== 'all' && (
                <span style={{
                  fontSize: 10,
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: T.elevated,
                  border: `1px solid ${T.border}`,
                  color: T.textSecondary,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {form.audience}
                </span>
              )}
              {form.scheduled_for && (
                <span style={{
                  fontSize: 10,
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: `rgba(var(--bs-accent-rgb), 0.1)`,
                  border: `1px solid rgba(var(--bs-accent-rgb), 0.22)`,
                  color: T.accent,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Scheduled
                </span>
              )}
              {form.expires_at && (
                <span style={{
                  fontSize: 10,
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: `rgba(var(--bs-warning-rgb), 0.1)`,
                  border: `1px solid rgba(var(--bs-warning-rgb), 0.22)`,
                  color: T.warning,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Expires
                </span>
              )}
            </div>
          ) : null}
        </Card>

        {/* History */}
        <Card T={T} title="History">
          {list.length === 0 ? (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
              fontSize: 13,
              color: T.textMuted,
            }}>
              No notifications yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {list.map((n, idx) => (
                <div
                  key={n.id}
                  style={{
                    padding: '14px 0',
                    borderBottom: idx === list.length - 1 ? 'none' : `1px solid ${T.border}`,
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 6,
                      flexWrap: 'wrap',
                    }}>
                      <span style={typeBadgeStyle(n.type)}>
                        {n.type}
                      </span>
                      <span style={statusPillStyle(!!n.active)}>
                        <span style={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          background: n.active ? T.success : T.textMuted,
                        }} />
                        {n.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {n.title && (
                      <div style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: T.text,
                        marginBottom: 2,
                        lineHeight: 1.4,
                      }}>
                        {n.title}
                      </div>
                    )}

                    <div style={{
                      fontSize: 13,
                      color: T.textSecondary,
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {n.message || (n.steps?.length ? `${n.steps.length} step${n.steps.length > 1 ? 's' : ''}` : '—')}
                    </div>

                    <div style={{
                      fontSize: 11,
                      color: T.textMuted,
                      marginTop: 6,
                    }}>
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    alignItems: 'stretch',
                  }}>
                    <button
                      onClick={() => startEdit(n)}
                      disabled={editingId === n.id}
                      style={{
                        height: 30,
                        padding: '0 12px',
                        background: editingId === n.id
                          ? 'rgba(var(--bs-accent-rgb), 0.15)'
                          : 'transparent',
                        border: editingId === n.id
                          ? '1px solid rgba(var(--bs-accent-rgb), 0.35)'
                          : `1px solid ${T.border}`,
                        borderRadius: 999,
                        color: editingId === n.id ? T.accent : T.text,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: editingId === n.id ? 'default' : 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {editingId === n.id ? 'Editing…' : 'Edit'}
                    </button>
                    <button
                      onClick={() => toggle(n.id, !n.active)}
                      style={{
                        height: 30,
                        padding: '0 12px',
                        background: 'transparent',
                        border: `1px solid ${T.border}`,
                        borderRadius: 999,
                        color: n.active ? T.warning : T.success,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {n.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}


function SettingsTab({ T }: { T: Theme }) {
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/v2/admin/settings')
      .then(r => {
        if (r?.ok && r.data) {
          setSettings(r.data)
        } else {
          setSettings({}) // fallback prevents null lock
        }
      })
      .catch(() => {
        setSettings({}) // network/error fallback
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const saveSettings = async () => {
    const r = await apiFetch('/v2/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    })

    if (r?.ok) toast.success('Settings saved')
    else toast.error(r?.error || 'Failed to save')
  }

  if (loading) return <Loading T={T} />

  return (
    <Card T={T} title="General Settings">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FieldLabel label="Phone" T={T}>
          <input
            style={inputStyle(T)}
            value={settings.phone || ''}
            onChange={e =>
              setSettings((s: any) => ({ ...s, phone: e.target.value }))
            }
          />
        </FieldLabel>

        <FieldLabel label="Instagram" T={T}>
          <input
            style={inputStyle(T)}
            value={settings.instagram || ''}
            onChange={e =>
              setSettings((s: any) => ({ ...s, instagram: e.target.value }))
            }
          />
        </FieldLabel>

        <FieldLabel label="Facebook" T={T}>
          <input
            style={inputStyle(T)}
            value={settings.facebook || ''}
            onChange={e =>
              setSettings((s: any) => ({ ...s, facebook: e.target.value }))
            }
          />
        </FieldLabel>

        <FieldLabel label="X (Twitter)" T={T}>
          <input
            style={inputStyle(T)}
            value={settings.x || ''}
            onChange={e =>
              setSettings((s: any) => ({ ...s, x: e.target.value }))
            }
          />
        </FieldLabel>

        <FieldLabel label="TikTok" T={T}>
          <input
            style={inputStyle(T)}
            value={settings.tiktok || ''}
            onChange={e =>
              setSettings((s: any) => ({ ...s, tiktok: e.target.value }))
            }
          />
        </FieldLabel>

        <FieldLabel label="Receipt Caption (optional)" T={T}>
          <textarea
            style={{ ...inputStyle(T), height: 80, padding: '10px 14px' } as any}
            value={settings.receipt_caption || ''}
            onChange={e =>
              setSettings((s: any) => ({
                ...s,
                receipt_caption: e.target.value,
              }))
            }
          />
        </FieldLabel>

        <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
          <SmallBtn T={T} color={T.accent} onClick={saveSettings}>
            Save Settings
          </SmallBtn>
        </div>
      </div>
    </Card>
  )
}
console.log("API URL:", API)