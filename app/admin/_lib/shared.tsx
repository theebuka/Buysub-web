'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"
import { useTheme as useThemeController } from '@/lib/theme'
import { getAccessToken } from '@/lib/session'
import { API_BASE } from '@/lib/config'



export const API = API_BASE
export const LOGO_DEV_TOKEN = 'pk_S77F38yQR6WQWErhPEEp1w'
export const ALL_CATEGORIES = ['all','music streaming','video streaming','security','ai','productivity','sports','bundles','education','cloud','gaming','services','coins','social media','lifestyle']

// ── Types ──
export interface Stats { total_revenue: number; revenue_today: number; revenue_this_month: number; orders_total: number; orders_today: number; orders_pending_manual: number; orders_paid: number; orders_rejected_pending: number; products_active: number; products_total: number; customers_total: number; partners_pending: number; top_products: { name: string; slug: string; order_count: number; revenue: number }[]; recent_orders: any[]; revenue_by_day: { day: string; revenue: number; orders: number }[] }
export interface Order { id: string; order_ref: string; status: string; total_ngn: number; subtotal_ngn: number; discount_ngn: number; payment_method: string; currency: string; created_at: string; updated_at: string; customer_name: string|null; customer_email: string|null; customer_phone: string|null; notes: string|null; order_items?: any[] }
export interface Product { id: string; name: string; slug: string; category: string; tags: string; price_1m: number; price_3m: number; price_6m: number; price_1y: number; billing_type: string; stock_status: string; status: string; domain: string; short_description: string; description: string; featured: boolean; created_at: string; sort_order: number; image_url: string; category_tagline: string; billing_period: string; whatsapp_group_url?: string
  social_links?: {
    telegram?: string
    instagram?: string
    twitter?: string
    tiktok?: string
    discord?: string
    website?: string
  } | null }
export interface Customer { id: string; name: string; email: string; phone: string; category: string; source: string; is_active: boolean; created_at: string }
export interface PartnerApp { id: string; legal_name: string; store_name: string; business_email: string; owner_name: string; owner_phone: string; status: string; payout_method: string; payout_frequency: string; state: string; lga: string; created_at: string; reviewer_notes: string|null; business_phone: string; address: string; cac_number: string|null; social_media: string|null; owner_email: string; gender: string|null; contact_method: string|null; bank_name: string|null; account_name: string|null; account_number: string|null; crypto_token: string|null; crypto_chain: string|null; wallet_address: string|null }
export interface Discount { id: string; code: string; type: string; value: number; active: boolean; min_order_ngn: number; max_uses: number|null; times_used: number; expires_at: string|null; active_from: string|null; max_discount_ngn: number|null; included_products: string|null; excluded_products: string|null; included_categories: string|null; excluded_categories: string|null; auto_apply: boolean; scope: string; exclusive: boolean; created_at: string }
export interface Pagination { page: number; limit: number; total: number; pages: number }

// ── Helpers ──
export const fmt = (n: number) => `₦${Number(n||0).toLocaleString('en-NG',{minimumFractionDigits:0})}`
export const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString('en-NG',{month:'short',day:'numeric',year:'numeric'}) } catch { return '—' } }
export const fmtTime = (iso: string) => { try { return new Date(iso).toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit'}) } catch { return '' } }
export const fmtFull = (iso: string) => `${fmtDate(iso)} ${fmtTime(iso)}`
export const dayKey = (iso: string) => { try { return new Date(iso).toLocaleDateString('en-NG',{weekday:'long',month:'long',day:'numeric',year:'numeric'}) } catch { return '—' } }
export const sentenceCase = (s: string) => s ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : ''
// A general status painter, not order-only: it also covers in_stock, active,
// hidden, suspended, archived and pending_review, so any change here is wider
// than orders.
//
// Returns var() references rather than literals, which is what lets it stay
// theme-argument-free — [data-theme="light"] reselects the values underneath.
// The fills are OPAQUE by design. A badge renders on three backgrounds: a
// Card, a bare list row, and a SELECTED row carrying an accent tint at up to
// 0.15. A translucent badge tint composites with whatever is beneath it, and
// the selected-row case failed AA on every light family regardless of how the
// text was tuned. See the --bs-badge-* block in lib/constants.ts.
export const statusColor = (s: string) => {
  if (s==='paid'||s==='approved'||s==='in_stock'||s==='active') return {bg:'var(--bs-badge-success-bg)',color:'var(--bs-badge-success-fg)'}
  if (s==='pending_manual'||s==='pending_review'||s==='pending') return {bg:'var(--bs-badge-warning-bg)',color:'var(--bs-badge-warning-fg)'}
  // Deliberately ahead of the terminal branch below. The tests are exact
  // equality so the order is not load-bearing today, but rejected_pending is
  // the status most likely to be mis-swept into `rejected` by a later edit.
  // It is stage one of a two-stage rejection, reversible via
  // /v2/admin/orders/:id/undo-reject, so it paints as a warning rather than an
  // error, and dimmer than plain pending so the two stay distinct.
  if (s==='rejected_pending') return {bg:'var(--bs-badge-pending-bg)',color:'var(--bs-badge-pending-fg)'}
  if (s==='cancelled'||s==='rejected'||s==='out_of_stock'||s==='hidden'||s==='suspended'||s==='archived') return {bg:'var(--bs-badge-error-bg)',color:'var(--bs-badge-error-fg)'}
  return {bg:'var(--bs-badge-neutral-bg)',color:'var(--bs-badge-neutral-fg)'}
}
export const emptyPagination: Pagination = {page:1,limit:20,total:0,pages:0}
export const parsePagination = (r: any): Pagination => r?.meta?.pagination||r?.pagination||emptyPagination
export const logoUrl = (domain: string) => domain ? `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=64` : ''


// ── Hydration-safe client hook ──
export function useClientValue<T>(getter: () => T, fallback: T): T {
  const [value, setValue] = useState<T>(fallback)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true); try { setValue(getter()) } catch {} }, [])
  return mounted ? value : fallback
}

// ── Theme ──
//
// This used to be two hex maps swapped by a local isDark boolean. It is now a
// single object of var() references, so the theme is chosen by
// data-theme="light" on <html> rather than by which object we hand out. Every
// consumer of T.* — 500+ dereferences across 13 tabs — moves onto the token
// layer without a single call site or signature changing.
//
// The T prop used to be threaded through ~40 helpers as a prop and a JSX
// attribute. Once this became a module constant that threading was pure
// ceremony — every call site passed the same object — so it was removed after
// the tabs were done: 267 T={T} attributes, 39 type members and the `Theme`
// alias that annotated them. Nothing renders differently; that was the gate.
// Components now read this constant directly by lexical scope.
//
// Anything reading T.* is theme-correct for free. Anything still holding a
// colour literal is NOT, and those are listed in REFACTOR.md per tab.
//
// Keys are unchanged from the old maps so nothing downstream breaks. The
// values they map to are the Phase 0 tokens, so some colours shift slightly:
// elevated #141418 -> #111116, border #27272e -> #1E1E28, text #e8e8ec ->
// #F0F0F5, and light-mode textMuted #8896a6 -> #66717F (which was a 3.20:1
// contrast failure). accentHover in dark was #9B85FF, a lighter tint that
// exists in no palette; it is now --bs-accent-hover #6B4EE6 in both themes.
export const T = {
  bg: 'var(--bs-bg-base)',
  card: 'var(--bs-bg-card)',
  elevated: 'var(--bs-bg-elevated)',
  input: 'var(--bs-bg-input)',
  subtle: 'var(--bs-bg-subtle)',
  muted: 'var(--bs-bg-muted)',
  border: 'var(--bs-border-default)',
  borderSubtle: 'var(--bs-border-subtle)',
  text: 'var(--bs-text-primary)',
  textSecondary: 'var(--bs-text-secondary)',
  textMuted: 'var(--bs-text-muted)',
  textFaint: 'var(--bs-text-faint)',
  accent: 'var(--bs-accent)',
  accentHover: 'var(--bs-accent-hover)',
  // Only for an accent fill that carries text; #fff on plain --bs-accent is
  // 4.35:1 and fails AA. Fills without text keep `accent`. See lib/constants.
  accentFill: 'var(--bs-accent-fill)',
  success: 'var(--bs-success)',
  successBg: 'rgba(var(--bs-success-rgb), 0.12)',
  warning: 'var(--bs-warning)',
  warningBg: 'rgba(var(--bs-warning-rgb), 0.12)',
  error: 'var(--bs-error)',
  errorBg: 'rgba(var(--bs-error-rgb), 0.12)',
  shadow: 'var(--bs-elev-1)',
  shadowLg: 'var(--bs-elev-2)',
}
// `type Theme` lived here to annotate the T prop on ~40 signatures. With the
// threading gone nothing references it, so it went too. The comment block at
// the Links section still mentions it as something sub-components import from
// "the existing admin scope"; that note is now historical.

// Wraps the shared controller so the return shape stays { isDark, toggle,
// mounted } and Shell's props do not change. isDark now drives only the
// toggle icon; it no longer picks the palette. The local read/write of
// bs_admin_theme is gone — lib/theme.ts owns that key, and owning it in two
// places is how the storefront toggle ended up writing a value nothing reads.
export function useTheme() {
  const { isDark, toggle, mounted } = useThemeController()
  return { isDark, toggle, mounted }
}

// ── Auth (only called inside useEffect / event handlers) ──
export function readToken(): string {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const s = JSON.parse(localStorage.getItem(key) || '{}')
        // Presence check only. An expired access token is fine: apiFetch gets
        // a refreshed one from getAccessToken(). Deleting the key here threw
        // away the refresh token and signed staff out every hour.
        if (s?.access_token && s?.refresh_token) return s.access_token
      }
    }
  } catch {}
  return ''
}
export function readAdminEmail(): string {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        return JSON.parse(localStorage.getItem(key) || '{}')?.user?.email || ''
      }
    }
  } catch {}
  return ''
}
export function signOut() {
  try { Object.keys(localStorage).forEach(key => { if (key.startsWith('sb-') && key.endsWith('-auth-token')) localStorage.removeItem(key) }) } catch {}
  window.location.href = '/login'
}
export async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await getAccessToken()
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
// Admin density (REFACTOR.md): desktop-first at 1440px, body sm 13, secondary
// 2xs 11, controls sm 32 / md 40. The 44px floor is a mobile-first rule and
// does not apply here — admin is the one tier that may go below it.
//
// fontFamily is inherited from the layout; the local 'Inter,sans-serif'
// literals that used to sit in these style objects are gone.
export const inputStyle = (): React.CSSProperties => ({
  height: 'var(--bs-control-md)', padding: '0 var(--bs-space-3)',
  borderRadius: 'var(--bs-radius-md)', fontSize: 'var(--bs-text-sm)',
  width: '100%', flex: 1, background: T.input, border: `1px solid ${T.border}`,
  color: T.text, boxSizing: 'border-box', outline: 'none',
})
export const pageBtnStyle = (disabled: boolean): React.CSSProperties => ({
  height: 'var(--bs-control-sm)', padding: '0 var(--bs-space-4)',
  borderRadius: 'var(--bs-radius-md)', border: `1px solid ${T.border}`, background: T.card,
  color: disabled ? T.textFaint : T.text, cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 'var(--bs-text-xs)', opacity: disabled ? 0.4 : 1,
})

// Inline SVG, 24x24 viewBox, currentColor, strokeWidth 2, round caps. This is
// the house pattern (Marketplace's CartIcon, and Phases 1-5), a deliberate
// deviation from the skill's ban on hand-rolled icons on the
// no-new-dependencies constraint. See REFACTOR.md.
export function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}
export function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

// Inline action glyphs for the tab buttons, same house pattern. Sized at 14 to
// sit inside a 32px control without crowding the label. aria-hidden because
// every one of them is paired with a visible text label — announcing "check"
// before "Approve" is noise, not information.
export function GlyphIcon({ d, filled = false }: { d: string; filled?: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" style={{ flexShrink: 0 }}
    >
      <path d={d} />
    </svg>
  )
}
export const CheckIcon = () => <GlyphIcon d="M20 6 9 17l-5-5" />
export const XIcon = () => <GlyphIcon d="M18 6 6 18M6 6l12 12" />
export const UndoIcon = () => <GlyphIcon d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" />
export const DocumentIcon = () => <GlyphIcon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h4" />
export const StarIcon = () => <GlyphIcon filled d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.8l6.5-.9z" />
export const MailIcon = () => <GlyphIcon d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 7l9 6 9-6" />
export const CardIcon = () => <GlyphIcon d="M2 6h20v12H2zM2 10h20" />
export const KeyIcon = () => <GlyphIcon d="M15.5 8.5a3.5 3.5 0 1 1-3.4-3.5M14 10l-9 9v3h3l1-1v-2h2v-2h2l1-1z" />
export const LockIcon = () => <GlyphIcon d="M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4" />
export const CloakIcon = () => <GlyphIcon d="M3 4h18v16H3zM12 4v16" />
export const EyeOffIcon = () => <GlyphIcon d="M3 3l18 18M10.6 5.2A9.5 9.5 0 0 1 12 5c6 0 9 7 9 7a15 15 0 0 1-3.1 4M6.2 6.4A15 15 0 0 0 3 12s3 7 9 7a9.4 9.4 0 0 0 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2" />
export const PhoneIcon = () => <GlyphIcon d="M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2" />
export const ClipboardIcon = () => <GlyphIcon d="M9 4h6v3H9zM8 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2" />
export const DownloadIcon = () => <GlyphIcon d="M12 3v12M7 11l5 5 5-5M4 20h16" />
export const WarningIcon = () => <GlyphIcon d="M12 3 2 20h20zM12 10v4M12 17h.01" />
export const SearchIcon = () => <GlyphIcon d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4" />
export const QrIcon = () => <GlyphIcon d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM19 19h2v2h-2z" />
// Rotates instead of swapping paths, so expanded/collapsed is one component.
export const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    style={{ flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none' }}>
    <path d="m9 6 6 6-6 6" />
  </svg>
)

// Aligns an icon with its label inside a SmallBtn. The alignment lives here
// rather than in SmallBtn because SmallBtn is a shared primitive with 25 call
// sites across tabs 5-13, and giving it display:inline-flex would change all
// of them ahead of their phase.
export const BtnLabel = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--bs-space-1)' }}>
    {icon}{children}
  </span>
)

export function Shell({ isDark, toggle, adminEmail, children }: { isDark: boolean; toggle: () => void; adminEmail: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.bg, minHeight: '100dvh', color: T.text, padding: '0 var(--bs-space-6) var(--bs-space-12)', paddingTop: 'calc(2vh + var(--bs-space-4))', boxSizing: 'border-box', transition: 'background var(--bs-dur-2) var(--bs-ease-out), color var(--bs-dur-2) var(--bs-ease-out)' }}>
      {/* Focus rings. Admin had none: five style objects set outline:'none'
          with no replacement, so keyboard focus was invisible across the whole
          back office. --bs-ring was added in Phase 0 and had no consumer until
          now.

          !important is load-bearing here, not laziness. This file is 100%
          inline styles, and an inline `outline: none` outbeats any stylesheet
          rule on specificity. A ring drawn with box-shadow rather than outline
          also follows border-radius, which matters on the pill controls.

          Scoped to :focus-visible so it appears for keyboard users and not on
          every mouse click. */}
      <style>{`
        .bs-admin :where(button, a, input, select, textarea, [tabindex]):focus-visible {
          box-shadow: var(--bs-ring) !important;
          outline: none !important;
        }
      `}</style>
      <div className="bs-admin" style={{ margin: '0 auto', width: '100%' }}>
        {/* The control labels used to break onto two lines each ("Receipt" under
            "+", "Out" under "Sign"). Measured at 360: the row has 312px of
            content once Shell's space-6 gutters are taken, the control cluster
            is ~238px intrinsic (98 + 40 + 84 + two space-2 gaps) and the title
            block's min-content is its longest word, "Dashboard" at 20px/700,
            ~103px. 341 against 312 — about 29px short.

            So the labels genuinely did not fit; the stacking was the symptom.
            This row was nowrap with no flex-shrink floor on its children, so
            each control shrank to ITS OWN min-content and wrapped its words
            internally instead of the row wrapping.

            The row wraps now and the controls do not: below ~610px the title
            takes one line and the cluster the next, where 238 fits in 312 with
            room. No control changes size. Admin stays desktop-first at 1440px
            and stays on the sm 32 / md 40 control steps — the bar for admin
            mobile is that it lays out and is reachable, not the 44px floor.
            See the density note in REFACTOR.md. */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--bs-space-3)', flexWrap: 'wrap', marginBottom: 'var(--bs-space-6)' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 'var(--bs-text-xl)', fontWeight: 700, color: T.text }}>Admin Dashboard</div>
            {adminEmail && <div style={{ fontSize: 'var(--bs-text-xs)', color: T.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>BuySub Internal · {adminEmail}</div>}
          </div>
          <div style={{ display: 'flex', gap: 'var(--bs-space-2)', alignItems: 'center', flexShrink: 0 }}>
            <a href="/admin/receipt" style={{ display: 'inline-flex', alignItems: 'center', height: 'var(--bs-control-md)', padding: '0 var(--bs-space-5)', borderRadius: 'var(--bs-radius-md)', fontSize: 'var(--bs-text-sm)', fontWeight: 600, background: T.accentFill, color: '#fff', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>+ Receipt</a>
            <button onClick={toggle} aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'} style={{ width: 'var(--bs-control-md)', height: 'var(--bs-control-md)', borderRadius: 'var(--bs-radius-md)', border: `1px solid ${T.border}`, background: T.card, color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{isDark ? <SunIcon /> : <MoonIcon />}</button>
            <button onClick={signOut} style={{ height: 'var(--bs-control-md)', padding: '0 var(--bs-space-4)', borderRadius: 'var(--bs-radius-md)', fontSize: 'var(--bs-text-sm)', background: 'transparent', border: `1px solid ${T.border}`, color: T.textMuted, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>Sign Out</button>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

// Uppercase tracked micro-labels are KEPT in admin. Phases 1-5 replaced them
// with sentence case on the customer surfaces; admin is desktop-first and
// dense, where small-caps labels earn their space. That split is deliberate,
// not an inconsistency for a later phase to "fix". Sizes move up to the 2xs
// floor: these were 10px, and nothing renders below 11.
export function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  // Padding was space-5 / space-6 (20/24). KpiCard, the other card primitive on
  // this page, is space-4 / space-5 (16/20) — so the two admin cards sat on
  // different steps, and Card's was the customer tier rather than admin's.
  //
  // That is where the Notifications tab's "extra padding" came from, and it is
  // structural rather than a stray value. Measured at 1440, first rendered text
  // inset from .bs-admin: Products and Links 0 (flush), Ads and Discounts 20,
  // Rejected 17, Orders 21, Overview 21 — and Notifications and Settings 25.
  // Those two are the only tabs whose whole content is wrapped in Card; every
  // other tab puts its first control or row straight into the container.
  //
  // On space-4 / space-5 the two primitives agree and Notifications and Settings
  // land on Overview's 21/17. Side effect, accepted deliberately: Overview's
  // three Cards tighten by 4px, which moves them toward the admin density steps
  // rather than away. Card has four call sites, all in this file.
  return <div style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 'var(--bs-radius-lg)', padding: 'var(--bs-space-4) var(--bs-space-5)', boxShadow: T.shadow, ...style }}><div style={{ fontSize: 'var(--bs-text-2xs)', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--bs-space-3)', fontWeight: 600 }}>{title}</div>{children}</div>
}
export function KpiCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return <div style={{ background: T.card, border: `1px solid ${highlight ? 'rgba(var(--bs-warning-rgb), 0.4)' : T.borderSubtle}`, borderRadius: 'var(--bs-radius-lg)', padding: 'var(--bs-space-4) var(--bs-space-5)', boxShadow: T.shadow }}><div style={{ fontSize: 'var(--bs-text-2xs)', color: T.textMuted, marginBottom: 'var(--bs-space-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div><div style={{ fontSize: 'var(--bs-text-2xl)', fontWeight: 700, color: highlight ? T.warning : T.text }}>{value}</div></div>
}
export function Badge({ status }: { status: string }) {
  const c = statusColor(status)
  return <span style={{ display: 'inline-block', padding: '3px var(--bs-space-2)', borderRadius: 'var(--bs-radius-full)', fontSize: 'var(--bs-text-2xs)', fontWeight: 500, background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>{status.replace(/_/g, ' ')}</span>
}
// `color` arrives as a var() reference now, so the old `${color}30` hex-alpha
// concatenation would emit `var(--bs-error)30` and be dropped. color-mix keeps
// the prop shape, which is what lets all 24 call sites stay untouched in a
// primitives-only phase.
//
// The label is NOT painted in the raw `color`. Printing a mid-saturation
// colour on a 12% tint of itself measured 3.74:1 (accent, light) and 3.58:1
// (text-muted, dark) — five of six colours failed AA in light and two of six
// in dark. --bs-on-tint-mix pushes the text away from the fill by a
// theme-appropriate amount. See the token comment in lib/constants.ts.
export function SmallBtn({ children, color, onClick, disabled }: { children: React.ReactNode; color: string; onClick: () => void; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} style={{ height: 'var(--bs-control-sm)', padding: '0 var(--bs-space-3)', borderRadius: 'var(--bs-radius-md)', fontSize: 'var(--bs-text-xs)', fontWeight: 500, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, background: `color-mix(in srgb, ${color} 12%, transparent)`, color: `color-mix(in srgb, ${color}, var(--bs-on-tint-mix))`, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap' }}>{children}</button>
}
export function Loading() { return <div style={{ padding: 'var(--bs-space-12) 0', textAlign: 'center', color: T.textMuted, fontSize: 'var(--bs-text-sm)' }}>Loading…</div> }
export function ErrorMsg({ msg }: { msg: string }) { return <div style={{ padding: 'var(--bs-space-5)', background: T.errorBg, border: `1px solid rgba(var(--bs-error-rgb), 0.2)`, borderRadius: 'var(--bs-radius-lg)', color: T.error, fontSize: 'var(--bs-text-sm)' }}>{msg}</div> }
export function EmptyState({ text }: { text: string }) { return <div style={{ padding: 'var(--bs-space-12) 0', textAlign: 'center', color: T.textMuted, fontSize: 'var(--bs-text-sm)' }}>{text}</div> }
export function PaginationBar({ pagination, onPage }: { pagination: Pagination; onPage: (p: number) => void }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--bs-space-5)', fontSize: 'var(--bs-text-xs)', color: T.textMuted }}><span>Page {pagination.page} of {pagination.pages} ({pagination.total} total)</span><div style={{ display: 'flex', gap: 'var(--bs-space-2)' }}><button disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)} style={pageBtnStyle(pagination.page <= 1)}>← Prev</button><button disabled={pagination.page >= pagination.pages} onClick={() => onPage(pagination.page + 1)} style={pageBtnStyle(pagination.page >= pagination.pages)}>Next →</button></div></div>
}
export function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><div style={{ fontSize: 'var(--bs-text-2xs)', fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--bs-space-2)' }}>{title}</div>{children}</div>
}
export function DRow({ label, value }: { label: string; value: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--bs-space-2)', padding: 'var(--bs-space-1) 0', fontSize: 'var(--bs-text-xs)' }}><span style={{ color: T.textMuted }}>{label}</span><span style={{ color: T.textSecondary, textAlign: 'right' }}>{value}</span></div>
}

// ── Field label (module-level, stable) ──
export function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 4 }}>{label}</div>{children}</div>
}

/* ------------------------------------------------------------------ */
/*  LOCAL HELPERS (module-level so focus doesn't drop on re-render)   */
/* ------------------------------------------------------------------ */

// The decorative dot is gone. It sat before a count, where it signalled
// nothing — a number has no state. PillBadge keeps its dot, because there it
// marks real status. `color` stays in the signature so the 3 call sites are
// untouched; it is unused and goes with the T threading in Phase 9.
export function StatChip({
  label, value,
}: { label: string; value: number }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--bs-space-2)',
      height: 'var(--bs-control-sm)',
      padding: '0 var(--bs-space-3)',
      borderRadius: 'var(--bs-radius-full)',
      background: T.elevated,
      border: `1px solid ${T.border}`,
      fontSize: 'var(--bs-text-xs)',
      color: T.textSecondary,
    }}>
      <span>{label}</span>
      <span style={{ color: T.text, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

export function PillBadge({
  color, tone = 'soft', dot = false, children,
}: {
  color: string
  tone?: 'soft' | 'ghost'
  dot?: boolean
  children: React.ReactNode
}) {
  // `soft` used to fill with rgba(255,255,255,0.04), a white tint that is
  // invisible on a white card — the pill simply vanished in light mode. It now
  // tints with the pill's own colour via color-mix, which works in both themes
  // and keeps the `color` prop shape (so no call site changes).
  //
  // The border ternary was dead: both branches were T.border. `ghost` now
  // means what its name says — no fill, border only.
  const soft = tone === 'soft'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--bs-space-1)',
      height: 22,
      padding: '0 var(--bs-space-2)',
      borderRadius: 'var(--bs-radius-full)',
      fontSize: 'var(--bs-text-2xs)',
      fontWeight: 600,
      // Same correction as SmallBtn: the label cannot be the same colour as
      // the tint it sits on. Only the soft tone fills, so only it needs the
      // push; ghost prints on the page surface and keeps the raw colour.
      color: soft ? `color-mix(in srgb, ${color}, var(--bs-on-tint-mix))` : color,
      background: soft
        ? `color-mix(in srgb, ${color} 12%, transparent)`
        : 'transparent',
      border: `1px solid ${soft ? `color-mix(in srgb, ${color} 30%, transparent)` : T.border}`,
      whiteSpace: 'nowrap',
    }}>
      {/* Kept: on a status pill the dot marks real state, which is the one
          case the AI-tells list allows. Dropped from StatChip, where it sat
          in front of a plain count. */}
      {dot && (
        <span style={{
          width: 6,
          height: 6,
          borderRadius: 'var(--bs-radius-full)',
          background: color,
        }} />
      )}
      {children}
    </span>
  )
}

// These two are the gen-2 duplicates of SmallBtn and pageBtnStyle. Phase 6
// makes them visually identical to their gen-1 counterparts without merging
// them — merging means editing call sites inside the tabs, which is Phases
// 7-9. Doing it in this order makes that dedupe a no-op with no visual delta,
// safe to land one tab at a time.
export function actionBtnStyle(): React.CSSProperties {
  return {
    height: 'var(--bs-control-sm)',
    padding: '0 var(--bs-space-3)',
    borderRadius: 'var(--bs-radius-md)',
    background: 'transparent',
    border: `1px solid ${T.border}`,
    color: T.text,
    fontSize: 'var(--bs-text-xs)',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
  }
}

export function refinedPageBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    height: 'var(--bs-control-sm)',
    padding: '0 var(--bs-space-3)',
    borderRadius: 'var(--bs-radius-md)',
    background: 'transparent',
    border: `1px solid ${T.border}`,
    color: disabled ? T.textFaint : T.text,
    fontSize: 'var(--bs-text-xs)',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    // transform/opacity only; 'all' also animates colour, which fights the
    // theme swap and made getComputedStyle read pre-transition values.
    transition: 'opacity var(--bs-dur-1) var(--bs-ease-out)',
  }
}
