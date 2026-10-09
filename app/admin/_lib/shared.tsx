'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"
import { useTheme as useThemeController } from '@/lib/theme'
import { getAccessToken } from '@/lib/session'
import { API_BASE } from '@/lib/config'
import { authFetch } from '@/lib/apiAuth'

export const API = API_BASE
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
export interface PartnerApp { id: string; legal_name: string | null; store_name: string; business_email: string | null; registration_year?: number | null; aml_accepted?: boolean | null; owner_name: string; owner_phone: string; status: string; payout_method: string; payout_frequency: string; state: string; lga: string; created_at: string; reviewer_notes: string|null; business_phone: string | null; address: string | null; cac_number: string|null; social_media: string|null; owner_email: string; gender: string|null; contact_method: string|null; bank_name: string|null; account_name: string|null; account_number: string|null; crypto_token: string|null; crypto_chain: string|null; wallet_address: string|null }
export interface Discount { id: string; code: string; type: string; value: number; active: boolean; min_order_ngn: number; max_uses: number|null; times_used: number; expires_at: string|null; active_from: string|null; max_discount_ngn: number|null; included_products: string|null; excluded_products: string|null; included_categories: string|null; excluded_categories: string|null; auto_apply: boolean; scope: string; exclusive: boolean; created_at: string }
export interface Pagination { page: number; limit: number; total: number; pages: number }

// ── Helpers ──
export const fmt = (n: number) => `₦${Number(n||0).toLocaleString('en-NG',{minimumFractionDigits:0})}`
export const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString('en-NG',{month:'short',day:'numeric',year:'numeric'}) } catch { return '—' } }
export const sentenceCase = (s: string) => s ? s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : ''
// Legacy token map for the parts of the console not yet on CSS modules (the
// link editor, QR dialog and new-order drawer). Values are var() references,
// so they follow the theme. New code uses components/admin/admin.module.css.
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

// One fetch path for the console: lib/apiAuth's authFetch (token refresh,
// /login?next= on 401/403). The return keeps the old envelope shape the
// sections read: { ok, data, error, meta }.
export async function apiFetch(path: string, opts: RequestInit = {}): Promise<any> {
  const r = await authFetch(path, opts as any)
  return { ok: r.ok, data: r.data, error: r.error, meta: r.meta }
}

// Inline input style for the legacy editors above.
export const inputStyle = (): React.CSSProperties => ({
  height: 'var(--bs-control-md)', padding: '0 var(--bs-space-3)',
  borderRadius: 'var(--bs-radius-md)', fontSize: 'var(--bs-text-sm)',
  width: '100%', flex: 1, background: T.input, border: `1px solid ${T.border}`,
  color: T.text, boxSizing: 'border-box', outline: 'none',
})
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
export const XIcon = () => <GlyphIcon d="M18 6 6 18M6 6l12 12" />
export const LockIcon = () => <GlyphIcon d="M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4" />
export const DownloadIcon = () => <GlyphIcon d="M12 3v12M7 11l5 5 5-5M4 20h16" />
export const WarningIcon = () => <GlyphIcon d="M12 3 2 20h20zM12 10v4M12 17h.01" />
// Icon + label inside a legacy button.
export const BtnLabel = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--bs-space-1)' }}>
    {icon}{children}
  </span>
)
