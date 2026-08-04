'use client'

// ================================================================
// BUYSUB — CUSTOMER DASHBOARD
// File: app/dashboard/page.tsx
//
// Tabs: Orders · Messages · Wallet · Profile
// Auth: Supabase session from localStorage (same domain)
// Renders without the app shell — see isNoShell in components/AppShell.tsx.
// Tokens come from CSS_VARS via `T`. Customer density, mobile-first at 360px.
// ================================================================

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { T, LOGO_DEV_TOKEN } from '@/lib/constants'
import { useTheme } from '@/lib/theme'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || ''
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const API           = process.env.NEXT_PUBLIC_API_BASE || 'https://buysub-api-v2.ebuka-nwaju.workers.dev'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ── helpers ──────────────────────────────────────────────────────
const fmt     = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG')}`
const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}
const fmtFull = (iso: string) => {
  try { return new Date(iso).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}
const initials = (name: string) =>
  (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const statusColor = (s: string) => {
  if (s === 'paid' || s === 'approved') return { bg: 'rgba(var(--bs-success-rgb), 0.12)', color: T.color.success }
  if (s === 'pending_manual' || s === 'pending') return { bg: 'rgba(var(--bs-warning-rgb), 0.12)', color: T.color.warning }
  if (s === 'cancelled' || s === 'rejected') return { bg: 'rgba(var(--bs-error-rgb), 0.12)', color: T.color.error }
  return { bg: 'rgba(var(--bs-text-muted-rgb), 0.12)', color: T.color.textMuted }
}

// ── read Supabase token from localStorage ────────────────────────
function readSession(): { token: string; userId: string; email: string } | null {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const s = JSON.parse(localStorage.getItem(key) || '{}')
        if (s?.access_token && s?.user) {
          if (s.expires_at && s.expires_at * 1000 < Date.now()) {
            localStorage.removeItem(key)
            return null
          }
          return { token: s.access_token, userId: s.user.id, email: s.user.email || '' }
        }
      }
    }
  } catch {}
  return null
}

async function apiFetch(path: string, token: string, opts: RequestInit = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(opts.headers || {}),
      },
    })
    const data = await res.json()
    if (res.status === 401) { window.location.href = '/login'; return { ok: false } }
    return data
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

// ── types ─────────────────────────────────────────────────────────
type Tab = 'orders' | 'messages' | 'wallet' | 'profile'

interface Order {
  id: string; order_ref: string; status: string; total_ngn: number
  subtotal_ngn: number; discount_ngn: number; payment_method: string
  currency: string; created_at: string; order_items?: any[]
}
interface Message {
  id: string; subject: string; product_name: string | null
  product_domain: string | null; body: string; is_read: boolean
  created_at: string; expires_at: string | null
}
interface WalletTx {
  id: string
  type: string
  amount_ngn: number | string  // ← FIX
  source: string
  reference: string | null
  note: string | null
  created_at: string
}
interface Profile {
  full_name: string; phone: string; email: string; avatar_url: string | null
}

// ================================================================
// ICONS (module-level, house style: 24×24, currentColor, stroke 2)
// ================================================================
type IconProps = { size?: number }
const svgBase = (size: number) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
})

const IconPackage = ({ size = 24 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
  </svg>
)
const IconInbox = ({ size = 24 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
  </svg>
)
const IconMail = ({ size = 24 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" />
  </svg>
)
const IconClock = ({ size = 16 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
  </svg>
)
const IconCard = ({ size = 24 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
  </svg>
)
const IconChevron = ({ size = 18 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
)
const IconX = ({ size = 18 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
)
const IconAlert = ({ size = 16 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <path d="M12 9v4" /><path d="M12 17h.01" />
  </svg>
)
const IconCheck = ({ size = 16 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
)
const IconSun = ({ size = 16 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)
const IconMoon = ({ size = 16 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
)

// ================================================================
// SHARED STYLES (module-level)
// ================================================================
const inputStyle: React.CSSProperties = {
  height: 'var(--bs-control-lg)', padding: `0 ${T.space[3]}`,
  borderRadius: T.radius.md, fontSize: T.text.base,
  width: '100%', background: T.color.bgInput,
  border: `1px solid ${T.color.borderDefault}`,
  color: T.color.textPrimary, boxSizing: 'border-box', outline: 'none',
  fontFamily: 'inherit',
  transition: `border-color var(--bs-dur-1) var(--bs-ease-inout), box-shadow var(--bs-dur-1) var(--bs-ease-inout)`,
}
const primaryBtn: React.CSSProperties = {
  height: 'var(--bs-control-lg)', padding: `0 ${T.space[6]}`,
  borderRadius: T.radius.md, background: T.color.accentFill,
  border: 'none', color: '#fff', fontSize: T.text.base,
  fontWeight: T.weight.semibold as any, cursor: 'pointer',
  fontFamily: 'inherit',
  transition: `background var(--bs-dur-1) var(--bs-ease-inout)`,
}
const cardStyle = (isMobile: boolean): React.CSSProperties => ({
  background: T.color.bgCard,
  border: `1px solid ${T.color.borderSubtle}`,
  borderRadius: isMobile ? T.radius.xl : T.radius['2xl'],
})

// ================================================================
// SUB-COMPONENTS (module-level — never define these inside the page)
// ================================================================
function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: T.radius.lg,
      background: T.color.accentFill, display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: T.text.lg, fontWeight: T.weight.bold as any, color: '#fff', lineHeight: 1 }}>B</span>
    </div>
  )
}

function BootGate({ message }: { message: string }) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: T.space[4],
      background: T.color.bgBase, padding: T.space[6],
    }}>
      <BrandMark />
      <div style={{ display: 'flex', alignItems: 'center', gap: T.space[2] }}>
        <span className="bs-spinner" />
        <span style={{ fontSize: T.text.base, color: T.color.textMuted }}>{message}</span>
      </div>
    </div>
  )
}

function Alert({ kind, children }: { kind: 'error' | 'success'; children: React.ReactNode }) {
  const rgb = kind === 'error' ? '--bs-error-rgb' : '--bs-success-rgb'
  const fg  = kind === 'error' ? T.color.error : T.color.success
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: T.space[2],
        padding: T.space[3], borderRadius: T.radius.md,
        background: `rgba(var(${rgb}), 0.10)`,
        border: `1px solid rgba(var(${rgb}), 0.28)`,
        fontSize: T.text.base, lineHeight: T.leading.snug, color: fg,
      }}
    >
      <span style={{ flexShrink: 0, display: 'flex', paddingTop: 2 }}>
        {kind === 'error' ? <IconAlert /> : <IconCheck />}
      </span>
      <span>{children}</span>
    </div>
  )
}

function RowSkeleton({ height }: { height: number }) {
  return (
    <div className="bs-pulse" style={{
      height, borderRadius: T.radius.lg,
      background: T.color.bgCard,
      border: `1px solid ${T.color.borderSubtle}`,
    }} />
  )
}

function LoadingRows({ height = 76, count = 3 }: { height?: number; count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: T.space[2] }}>
      {Array.from({ length: count }).map((_, i) => <RowSkeleton key={i} height={height} />)}
    </div>
  )
}

function EmptyState({ Icon, title, sub, cta, ctaHref }: {
  Icon: (p: IconProps) => JSX.Element
  title: string; sub: string; cta?: string; ctaHref?: string
}) {
  return (
    <div style={{ padding: `${T.space[12]} ${T.space[5]}`, textAlign: 'center' }}>
      <div style={{
        width: 56, height: 56, borderRadius: T.radius.lg,
        background: 'rgba(var(--bs-accent-rgb), 0.10)',
        color: T.color.accentOnSurface,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: `0 auto ${T.space[4]}`,
      }}>
        <Icon size={26} />
      </div>
      <div style={{
        fontSize: T.text.lg, fontWeight: T.weight.semibold as any,
        color: T.color.textPrimary, marginBottom: T.space[1],
      }}>{title}</div>
      <div style={{
        fontSize: T.text.base, color: T.color.textMuted,
        marginBottom: cta ? T.space[5] : 0, lineHeight: T.leading.relaxed,
      }}>{sub}</div>
      {cta && ctaHref && (
        <a href={ctaHref} className="bs-primary-btn" style={{
          ...primaryBtn, display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', textDecoration: 'none',
        }}>{cta}</a>
      )}
    </div>
  )
}

function SectionCard({ title, isMobile, children }: {
  title: string; isMobile: boolean; children: React.ReactNode
}) {
  return (
    <div style={{ ...cardStyle(isMobile), padding: isMobile ? T.space[5] : T.space[6] }}>
      <div style={{
        fontSize: T.text.base, fontWeight: T.weight.semibold as any,
        color: T.color.textPrimary, marginBottom: T.space[4],
      }}>{title}</div>
      {children}
    </div>
  )
}

function FieldGroup({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} style={{
        display: 'block', fontSize: T.text.xs, color: T.color.textSecondary,
        marginBottom: T.space[1], fontWeight: T.weight.medium as any,
      }}>{label}</label>
      {children}
    </div>
  )
}

// ================================================================
// MAIN COMPONENT
// ================================================================
export default function CustomerDashboard() {
  const { isDark, toggle: toggleTheme } = useTheme()
  const [session, setSession]   = useState<ReturnType<typeof readSession>>(null)
  const [mounted, setMounted]   = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [tab, setTab]           = useState<Tab>('orders')

  // data
  const [orders,   setOrders]   = useState<Order[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [wallet,   setWallet]   = useState<{ balance_ngn: number } | null>(null)
  const [txns,     setTxns]     = useState<WalletTx[]>([])
  const [profile,  setProfile]  = useState<Profile | null>(null)

  // ui state
  const [loading,       setLoading]       = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [openMessage,   setOpenMessage]   = useState<Message | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileForm,   setProfileForm]   = useState<Profile>({ full_name: '', phone: '', email: '', avatar_url: null })
  const [pwForm,        setPwForm]        = useState({ current: '', next: '', confirm: '' })
  const [pwError,       setPwError]       = useState('')
  const [pwSuccess,     setPwSuccess]     = useState('')
  const [pwLoading,     setPwLoading]     = useState(false)

  const modalRef       = useRef<HTMLDivElement>(null)
  const lastTriggerRef = useRef<HTMLElement | null>(null)

  // ── mount: read session ────────────────────────────────────────
  useEffect(() => {
    setMounted(true)
    const s = readSession()
    if (!s) { window.location.href = '/login'; return }
    setSession(s)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // ── load data for current tab ──────────────────────────────────
  const loadTab = useCallback(async (t: Tab, token: string) => {
    setLoading(true)
    if (t === 'orders') {
      const r = await apiFetch('/v2/me/orders', token)
      if (r.ok) setOrders(r.data || [])
    }
    if (t === 'messages') {
      const r = await apiFetch('/v2/me/messages', token)
      if (r.ok) setMessages(r.data || [])
    }
    if (t === 'wallet') {
      const [wr, tr] = await Promise.all([
        apiFetch('/v2/me/wallet', token),
        apiFetch('/v2/me/wallet/transactions', token),
      ])
      if (wr.ok) setWallet(wr.data)
      if (tr.ok) setTxns(tr.data || [])
    }
    if (t === 'profile') {
      const r = await apiFetch('/v2/me', token)
      if (r.ok) {
        setProfile(r.data)
        setProfileForm({ full_name: r.data.full_name || '', phone: r.data.phone || '', email: r.data.email || '', avatar_url: r.data.avatar_url })
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!session) return
    loadTab(tab, session.token)
  }, [session, tab])

  // ── message modal: Escape to close, focus in and back out ──────
  useEffect(() => {
    if (!openMessage) return
    const trigger = lastTriggerRef.current
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenMessage(null) }
    document.addEventListener('keydown', onKey)
    modalRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      trigger?.focus()
    }
  }, [openMessage])

  // ── mark message read ──────────────────────────────────────────
  const markRead = async (msg: Message) => {
    setOpenMessage(msg)
    if (!msg.is_read && session) {
      await apiFetch(`/v2/me/messages/${msg.id}/read`, session.token, { method: 'PATCH' })
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m))
    }
  }

  // ── save profile ───────────────────────────────────────────────
  const saveProfile = async () => {
    if (!session) return
    setProfileSaving(true)
    const r = await apiFetch('/v2/me', session.token, {
      method: 'PATCH',
      body: JSON.stringify({ full_name: profileForm.full_name, phone: profileForm.phone }),
    })
    setProfileSaving(false)
    if (r.ok) setProfile(prev => ({ ...prev!, ...profileForm }))
  }

  // ── change password ────────────────────────────────────────────
  const changePassword = async () => {
    setPwError('')
    setPwSuccess('')
    if (!pwForm.current) { setPwError('Current password is required'); return }
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters'); return }
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match'); return }
    setPwLoading(true)
    // Verify current password
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: session?.email || '',
      password: pwForm.current,
    })
    if (authErr) { setPwError('Current password is incorrect'); setPwLoading(false); return }
    const { error: updateErr } = await supabase.auth.updateUser({ password: pwForm.next })
    setPwLoading(false)
    if (updateErr) { setPwError(updateErr.message); return }
    setPwSuccess('Password changed successfully.')
    setPwForm({ current: '', next: '', confirm: '' })
  }

  // ── sign out ───────────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (!mounted) return (<><DashStyles /><BootGate message="Loading your dashboard" /></>)

  const firstName = (profile?.full_name || session?.email || '').split(' ')[0] || 'You'
  const unreadCount = messages.filter(m => !m.is_read).length
  const gutter = isMobile ? T.space[4] : T.space[6]

  const TABS: { id: Tab; label: string }[] = [
    { id: 'orders',   label: 'Orders' },
    { id: 'messages', label: 'Messages' },
    { id: 'wallet',   label: 'Wallet' },
    { id: 'profile',  label: 'Profile' },
  ]

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <>
      <DashStyles />
      <div style={{
        background: T.color.bgBase,
        minHeight: '100dvh',
        color: T.color.textPrimary,
      }}>
        {/* ── NAV ─────────────────────────────────────────────── */}
        <nav style={{
          height: 64, borderBottom: `1px solid ${T.color.borderDefault}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `0 ${gutter}`, background: T.color.bgCard,
          position: 'sticky', top: 0, zIndex: 50, gap: T.space[3],
        }}>
          <a href="/shop" className="bs-quiet-link" style={{
            fontWeight: T.weight.bold as any, fontSize: T.text.lg,
            color: T.color.textPrimary, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center',
            minHeight: 'var(--bs-control-lg)', borderRadius: T.radius.md,
          }}>
            BuySub
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: T.space[2] }}>
            <button
              type="button"
              className="bs-icon-btn"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              style={iconBtnStyle}
            >
              {isDark ? <IconSun /> : <IconMoon />}
            </button>
            <button
              type="button"
              className="bs-chip-btn"
              onClick={signOut}
              aria-label={`Sign out of ${firstName}'s account`}
              style={{
                display: 'flex', alignItems: 'center', gap: T.space[2],
                background: T.color.bgElevated,
                border: `1px solid ${T.color.borderDefault}`,
                borderRadius: T.radius.full,
                minHeight: 'var(--bs-control-lg)',
                padding: `0 ${T.space[3]} 0 ${T.space[1]}`,
                cursor: 'pointer', fontFamily: 'inherit', minWidth: 0,
                color: T.color.textPrimary,
                transition: `border-color var(--bs-dur-1) var(--bs-ease-inout)`,
              }}
            >
              <span style={{
                width: 32, height: 32, borderRadius: T.radius.full,
                background: T.color.accentFill,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: T.text.xs, fontWeight: T.weight.bold as any,
                color: '#fff', flexShrink: 0,
              }} aria-hidden="true">
                {initials(profile?.full_name || session?.email || '')}
              </span>
              {/* firstName falls back to the full email when the profile has
                  no name, and an email has no spaces to split on — so this must
                  truncate or it pushes the page wider than the viewport. */}
              <span style={{
                fontSize: T.text.base, color: T.color.textPrimary,
                fontWeight: T.weight.medium as any, whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: isMobile ? 92 : 160, minWidth: 0,
              }}>{firstName}</span>
            </button>
          </div>
        </nav>

        {/* ── LAYOUT ──────────────────────────────────────────── */}
        <div style={{
          maxWidth: 860, margin: '0 auto',
          padding: `${T.space[6]} ${gutter} ${T.space[12]}`,
        }}>
          {/* Header */}
          <div style={{ marginBottom: T.space[6] }}>
            <h1 style={{
              fontSize: T.text['2xl'], fontWeight: T.weight.bold as any,
              color: T.color.textPrimary, lineHeight: T.leading.tight,
            }}>My dashboard</h1>
            <div style={{ fontSize: T.text.xs, color: T.color.textMuted, marginTop: T.space[1] }}>
              {session?.email}
            </div>
          </div>

          {/* Tab bar */}
          <div
            role="tablist"
            aria-label="Dashboard sections"
            className="bs-scroll-x"
            style={{
              display: 'flex', gap: 0,
              borderBottom: `1px solid ${T.color.borderDefault}`,
              marginBottom: T.space[6], overflowX: 'auto',
            }}
          >
            {TABS.map(t => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={active}
                  aria-controls={`panel-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className="bs-tab"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: T.space[2],
                    minHeight: 'var(--bs-control-lg)',
                    padding: `0 ${T.space[4]}`,
                    fontSize: T.text.base, border: 'none', cursor: 'pointer',
                    background: 'transparent', whiteSpace: 'nowrap',
                    color: active ? T.color.accentOnSurface : T.color.textMuted,
                    borderBottom: `2px solid ${active ? T.color.accent : 'transparent'}`,
                    fontWeight: active ? T.weight.semibold as any : T.weight.regular as any,
                    fontFamily: 'inherit',
                    transition: `color var(--bs-dur-1) var(--bs-ease-inout)`,
                  }}
                >
                  {t.label}
                  {t.id === 'messages' && unreadCount > 0 && (
                    <span
                      style={{
                        minWidth: 20, height: 20, borderRadius: T.radius.full,
                        background: T.color.accentFill, color: '#fff',
                        fontSize: T.text['2xs'], fontWeight: T.weight.bold as any,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        padding: `0 ${T.space[1]}`,
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* ── ORDERS ────────────────────────────────────────── */}
          {tab === 'orders' && (
            <div role="tabpanel" id="panel-orders" aria-labelledby="tab-orders" className="bs-animate">
              {loading ? <LoadingRows /> : orders.length === 0 ? (
                <EmptyState Icon={IconPackage} title="No orders yet"
                  sub="Your purchase history will appear here."
                  cta="Browse shop" ctaHref="/shop" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: T.space[2] }}>
                  {orders.map(o => {
                    const sc = statusColor(o.status)
                    const isExp = expandedOrder === o.id
                    return (
                      <div key={o.id} className="bs-card" style={{ ...cardStyle(isMobile), overflow: 'hidden' }}>
                        <button
                          type="button"
                          className="bs-row-btn"
                          onClick={() => setExpandedOrder(isExp ? null : o.id)}
                          aria-expanded={isExp}
                          aria-controls={`order-${o.id}`}
                          style={{
                            width: '100%', minHeight: 'var(--bs-control-lg)',
                            padding: `${T.space[4]} ${T.space[5]}`, cursor: 'pointer',
                            display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', gap: T.space[3],
                            background: 'transparent', border: 'none',
                            textAlign: 'left', fontFamily: 'inherit',
                            // <button> does not inherit color — the UA sets
                            // `color: buttontext`. Without this, any child
                            // without its own color renders UA black.
                            color: T.color.textPrimary,
                          }}
                        >
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: T.space[2], flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: T.text.base, fontWeight: T.weight.semibold as any,
                                fontFamily: 'ui-monospace, Menlo, monospace',
                                color: T.color.textPrimary,
                              }}>{o.order_ref}</span>
                              <span style={{
                                fontSize: T.text['2xs'], padding: `2px ${T.space[2]}`,
                                borderRadius: T.radius.full, background: sc.bg, color: sc.color,
                                fontWeight: T.weight.medium as any, textTransform: 'capitalize',
                              }}>
                                {o.status.replace(/_/g, ' ')}
                              </span>
                            </span>
                            <span style={{
                              display: 'block', fontSize: T.text.xs,
                              color: T.color.textMuted, marginTop: T.space[1],
                            }}>{fmtDate(o.created_at)}</span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: T.space[2], flexShrink: 0 }}>
                            <span className="bs-amount" style={{
                              fontSize: T.text.lg, fontWeight: T.weight.bold as any,
                              color: T.color.textPrimary,
                            }}>{fmt(o.total_ngn)}</span>
                            <span style={{
                              display: 'flex', color: T.color.textMuted,
                              transform: isExp ? 'rotate(180deg)' : 'none',
                              transition: `transform var(--bs-dur-2) var(--bs-ease-inout)`,
                            }}>
                              <IconChevron />
                            </span>
                          </span>
                        </button>

                        {isExp && (
                          <div id={`order-${o.id}`} style={{
                            borderTop: `1px solid ${T.color.borderSubtle}`,
                            padding: `${T.space[4]} ${T.space[5]}`,
                          }}>
                            {o.order_items && o.order_items.length > 0 && (
                              <div style={{ marginBottom: T.space[4] }}>
                                {o.order_items.map((it: any, i: number) => (
                                  <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: `${T.space[2]} 0`,
                                    borderBottom: i < o.order_items!.length - 1 ? `1px solid ${T.color.borderSubtle}` : 'none',
                                    gap: T.space[3],
                                  }}>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontSize: T.text.base, fontWeight: T.weight.medium as any, color: T.color.textPrimary }}>{it.product_name}</div>
                                      <div style={{ fontSize: T.text.xs, color: T.color.textMuted }}>
                                        {it.billing_period} · ×{it.quantity}
                                      </div>
                                    </div>
                                    <span className="bs-amount" style={{
                                      fontSize: T.text.base, fontWeight: T.weight.semibold as any,
                                      flexShrink: 0, color: T.color.textPrimary,
                                    }}>
                                      {fmt(it.total_price_ngn || it.unit_price_ngn * it.quantity)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div style={{
                              display: 'flex', flexDirection: 'column', gap: T.space[1],
                              borderTop: `1px solid ${T.color.borderSubtle}`, paddingTop: T.space[3],
                            }}>
                              {o.discount_ngn > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: T.text.xs, color: T.color.success }}>
                                  <span>Discount</span><span className="bs-amount">−{fmt(o.discount_ngn)}</span>
                                </div>
                              )}
                              <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                fontSize: T.text.base, fontWeight: T.weight.semibold as any,
                                color: T.color.textPrimary,
                              }}>
                                <span>Total paid</span>
                                <span className="bs-amount">{fmt(o.total_ngn)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: T.text.xs, color: T.color.textMuted }}>
                                <span>Payment</span><span style={{ textTransform: 'capitalize' }}>{(o.payment_method || '').replace(/_/g, ' ')}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── MESSAGES ──────────────────────────────────────── */}
          {tab === 'messages' && (
            <div role="tabpanel" id="panel-messages" aria-labelledby="tab-messages" className="bs-animate">
              {loading ? <LoadingRows /> : messages.length === 0 ? (
                <EmptyState Icon={IconInbox} title="No messages"
                  sub="Product details and delivery info from BuySub will appear here." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: T.space[2] }}>
                  {messages.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      className="bs-card bs-row-btn"
                      onClick={e => { lastTriggerRef.current = e.currentTarget; markRead(m) }}
                      aria-label={`${m.is_read ? 'Read' : 'Unread'} message: ${m.subject}`}
                      style={{
                        ...cardStyle(isMobile),
                        borderColor: m.is_read ? T.color.borderSubtle : 'rgba(var(--bs-accent-rgb), 0.4)',
                        padding: `${T.space[4]} ${T.space[5]}`, cursor: 'pointer',
                        display: 'flex', gap: T.space[3], alignItems: 'flex-start',
                        textAlign: 'left', fontFamily: 'inherit', width: '100%',
                        minHeight: 'var(--bs-control-lg)',
                        color: T.color.textPrimary,
                      }}
                    >
                      <span style={{
                        width: 40, height: 40, borderRadius: T.radius.md, flexShrink: 0,
                        background: m.product_domain ? T.color.bgElevated : 'rgba(var(--bs-accent-rgb), 0.10)',
                        color: T.color.accentOnSurface,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', border: `1px solid ${T.color.borderSubtle}`,
                      }}>
                        {m.product_domain ? (
                          <img src={`https://img.logo.dev/${m.product_domain}?token=${LOGO_DEV_TOKEN}&size=64&theme=dark`} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : (
                          <IconMail size={20} />
                        )}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: T.space[2], marginBottom: 2 }}>
                          {!m.is_read && (
                            <span style={{
                              width: 7, height: 7, borderRadius: T.radius.full,
                              background: T.color.accent, flexShrink: 0,
                            }} aria-hidden="true" />
                          )}
                          <span style={{
                            fontSize: T.text.base,
                            fontWeight: (m.is_read ? T.weight.medium : T.weight.bold) as any,
                            color: T.color.textPrimary, overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{m.subject}</span>
                        </span>
                        {m.product_name && (
                          <span style={{ display: 'block', fontSize: T.text.xs, color: T.color.accentOnSurface, marginBottom: 2 }}>{m.product_name}</span>
                        )}
                        <span style={{ display: 'block', fontSize: T.text.xs, color: T.color.textMuted }}>{fmtDate(m.created_at)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Message detail modal */}
              {openMessage && (
                <>
                  <div onClick={() => setOpenMessage(null)} style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.6)', zIndex: 200,
                  }} />
                  <div
                    ref={modalRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="msg-title"
                    tabIndex={-1}
                    style={{
                      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                      width: `min(560px, calc(100vw - ${T.space[8]}))`, maxHeight: '80dvh',
                      background: T.color.bgCard, border: `1px solid ${T.color.borderDefault}`,
                      borderRadius: isMobile ? T.radius.xl : T.radius['2xl'],
                      zIndex: 201, display: 'flex', flexDirection: 'column',
                      boxShadow: T.elev[3], outline: 'none',
                    }}
                  >
                    <div style={{
                      padding: `${T.space[5]} ${T.space[5]} ${T.space[4]}`,
                      borderBottom: `1px solid ${T.color.borderSubtle}`,
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', flexShrink: 0, gap: T.space[3],
                    }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div id="msg-title" style={{
                          fontSize: T.text.lg, fontWeight: T.weight.bold as any,
                          color: T.color.textPrimary, marginBottom: 2,
                        }}>{openMessage.subject}</div>
                        {openMessage.product_name && (
                          <div style={{ fontSize: T.text.xs, color: T.color.accentOnSurface }}>{openMessage.product_name}</div>
                        )}
                        <div style={{ fontSize: T.text.xs, color: T.color.textMuted, marginTop: T.space[1] }}>
                          {fmtFull(openMessage.created_at)}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="bs-icon-btn"
                        onClick={() => setOpenMessage(null)}
                        aria-label="Close message"
                        style={{ ...iconBtnStyle, background: 'transparent' }}
                      >
                        <IconX />
                      </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: T.space[5] }}>
                      <pre style={{
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        fontSize: T.text.sm, lineHeight: T.leading.relaxed,
                        color: T.color.textPrimary,
                        fontFamily: 'ui-monospace, "Cascadia Code", Menlo, monospace',
                        background: T.color.bgElevated,
                        border: `1px solid ${T.color.borderSubtle}`,
                        borderRadius: T.radius.md, padding: T.space[4], margin: 0,
                      }}>
                        {openMessage.body}
                      </pre>
                      {openMessage.expires_at && (
                        <div style={{
                          marginTop: T.space[3], fontSize: T.text.xs, color: T.color.textMuted,
                          display: 'flex', alignItems: 'center', gap: T.space[2],
                        }}>
                          <IconClock />
                          Expires {fmtDate(openMessage.expires_at)}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── WALLET ────────────────────────────────────────── */}
          {tab === 'wallet' && (
            <div role="tabpanel" id="panel-wallet" aria-labelledby="tab-wallet" className="bs-animate">
              {loading ? <LoadingRows /> : (
                <>
                  {/* Balance card */}
                  <div style={{
                    background: `linear-gradient(135deg, ${T.color.accent} 0%, ${T.color.accentHover} 100%)`,
                    borderRadius: isMobile ? T.radius.xl : T.radius['2xl'],
                    padding: isMobile ? T.space[5] : T.space[6],
                    marginBottom: T.space[6], color: '#fff',
                  }}>
                    <div style={{ fontSize: T.text.xs, opacity: 0.85, marginBottom: T.space[2] }}>
                      BuySub wallet
                    </div>
                    <div style={{
                      fontSize: T.text['3xl'], fontWeight: T.weight.bold as any,
                      letterSpacing: '-0.02em', marginBottom: T.space[1],
                      lineHeight: T.leading.tight,
                    }}>
                      <span className="bs-amount">{fmt(wallet?.balance_ngn ?? 0)}</span>
                    </div>
                    <div style={{ fontSize: T.text.xs, opacity: 0.75 }}>
                      Available credit · can be used at checkout
                    </div>
                  </div>

                  {/* Transactions */}
                  <div style={{
                    fontSize: T.text.base, fontWeight: T.weight.semibold as any,
                    color: T.color.textPrimary, marginBottom: T.space[3],
                  }}>
                    Transaction history
                  </div>
                  {txns.length === 0 ? (
                    <EmptyState Icon={IconCard} title="No transactions yet"
                      sub="Wallet top-ups and credits will appear here." />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: T.space[2] }}>
                      {txns.map(tx => {
                        const amount = Number(tx.amount_ngn)
                        const isDebit = tx.type === 'debit'
                        return (
                          <div key={tx.id} style={{
                            ...cardStyle(isMobile),
                            borderRadius: T.radius.lg,
                            padding: `${T.space[3]} ${T.space[4]}`,
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', gap: T.space[3],
                          }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{
                                fontSize: T.text.base, fontWeight: T.weight.medium as any,
                                color: T.color.textPrimary, textTransform: 'capitalize',
                              }}>
                                {(() => {
                                  const labelMap: Record<string, string> = {
                                    admin_topup: 'Manual Top-up',
                                    refund: 'Order Refund',
                                    promotion: 'Promotion/Bonus',
                                    compensation: 'Compensation',
                                  }
                                  const raw = tx.reference || tx.note || tx.source || tx.type
                                  return (labelMap[raw] || raw).replace(/_/g, ' ')
                                })()}
                              </div>
                              {tx.note && <div style={{ fontSize: T.text.xs, color: T.color.textMuted, marginTop: 2 }}>{tx.note}</div>}
                              <div style={{ fontSize: T.text.xs, color: T.color.textMuted, marginTop: 2 }}>{fmtFull(tx.created_at)}</div>
                            </div>
                            <div style={{
                              fontSize: T.text.lg, fontWeight: T.weight.bold as any, flexShrink: 0,
                              color: isDebit ? T.color.error : T.color.success,
                            }}>
                              <span className="bs-amount">{isDebit ? '−' : '+'}{fmt(amount)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── PROFILE ───────────────────────────────────────── */}
          {tab === 'profile' && (
            <div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile" className="bs-animate">
              {loading ? <LoadingRows height={120} count={2} /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: T.space[5] }}>

                  {/* Avatar + name */}
                  <div style={{
                    ...cardStyle(isMobile),
                    padding: isMobile ? T.space[5] : T.space[6],
                    display: 'flex', alignItems: 'center', gap: T.space[5], flexWrap: 'wrap',
                  }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: T.radius.full,
                      background: T.color.accentFill,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: T.text.xl, fontWeight: T.weight.bold as any,
                      color: '#fff', flexShrink: 0,
                    }} aria-hidden="true">
                      {initials(profile?.full_name || session?.email || '')}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: T.text.lg, fontWeight: T.weight.bold as any,
                        color: T.color.textPrimary,
                      }}>
                        {profile?.full_name || session?.email}
                      </div>
                      <div style={{ fontSize: T.text.xs, color: T.color.textMuted, marginTop: 2 }}>{session?.email}</div>
                    </div>
                  </div>

                  {/* Edit form */}
                  <SectionCard title="Personal info" isMobile={isMobile}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: T.space[3] }}>
                      <FieldGroup id="full_name" label="Full name">
                        <input id="full_name" className="bs-input" style={inputStyle} value={profileForm.full_name}
                          onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Your name" autoComplete="name" />
                      </FieldGroup>
                      <FieldGroup id="phone" label="Phone">
                        <input id="phone" className="bs-input" style={inputStyle} value={profileForm.phone}
                          onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} placeholder="080..." autoComplete="tel" />
                      </FieldGroup>
                      <FieldGroup id="email" label="Email">
                        <input id="email" className="bs-input" style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
                          value={profileForm.email} disabled placeholder="Email" />
                      </FieldGroup>
                    </div>
                    <div style={{ marginTop: T.space[4] }}>
                      <button className="bs-primary-btn" onClick={saveProfile} disabled={profileSaving} style={primaryBtn}>
                        {profileSaving ? 'Saving…' : 'Save changes'}
                      </button>
                    </div>
                  </SectionCard>

                  {/* Change password */}
                  <SectionCard title="Change password" isMobile={isMobile}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: T.space[3] }}>
                      <FieldGroup id="pw-current" label="Current password">
                        <input id="pw-current" className="bs-input" style={inputStyle} type="password" autoComplete="current-password"
                          value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} placeholder="••••••••" />
                      </FieldGroup>
                      <FieldGroup id="pw-next" label="New password">
                        <input id="pw-next" className="bs-input" style={inputStyle} type="password" autoComplete="new-password"
                          value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} placeholder="Min 8 characters" />
                      </FieldGroup>
                      <FieldGroup id="pw-confirm" label="Confirm new password">
                        <input id="pw-confirm" className="bs-input" style={inputStyle} type="password" autoComplete="new-password"
                          value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" />
                      </FieldGroup>
                      {pwError   && <Alert kind="error">{pwError}</Alert>}
                      {pwSuccess && <Alert kind="success">{pwSuccess}</Alert>}
                      <div>
                        <button className="bs-primary-btn" onClick={changePassword} disabled={pwLoading} style={primaryBtn}>
                          {pwLoading ? 'Updating…' : 'Update password'}
                        </button>
                      </div>
                    </div>
                  </SectionCard>

                  {/* Sign out */}
                  <button className="bs-secondary-btn" onClick={signOut} style={{
                    width: '100%', minHeight: 'var(--bs-control-lg)',
                    borderRadius: T.radius.md, background: 'transparent',
                    border: `1px solid ${T.color.borderDefault}`,
                    color: T.color.textSecondary,
                    fontSize: T.text.base, cursor: 'pointer', fontFamily: 'inherit',
                    transition: `border-color var(--bs-dur-1) var(--bs-ease-inout)`,
                  }}>Sign out</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// 44px tap area for a glyph-sized control.
const iconBtnStyle: React.CSSProperties = {
  width: 'var(--bs-control-lg)',
  height: 'var(--bs-control-lg)',
  borderRadius: T.radius.md,
  background: T.color.bgElevated,
  border: `1px solid ${T.color.borderDefault}`,
  color: T.color.textSecondary,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  transition: `border-color var(--bs-dur-1) var(--bs-ease-inout)`,
}

// ================================================================
// Pseudo-classes and keyframes
// ================================================================
function DashStyles() {
  return (
    <style>{`
      /* Mobile browsers run data detectors over digit strings and wrap them in
         their own <a>, which then takes the UA link colour. That is why the
         amounts rendered blue on mobile and UA black on desktop: the <button>
         they sit in does not inherit colour either. Colours are now explicit,
         and any injected link inherits rather than overriding. */
      .bs-amount a,
      a[x-apple-data-detectors],
      a[href^="tel:"], a[href^="sms:"] {
        color: inherit !important;
        text-decoration: inherit !important;
        -webkit-text-fill-color: inherit !important;
      }

      .bs-input:focus-visible,
      .bs-input:focus {
        border-color: var(--bs-accent) !important;
        box-shadow: var(--bs-ring);
      }
      .bs-input::placeholder { color: var(--bs-text-faint); }

      .bs-card { transition: border-color var(--bs-dur-1) var(--bs-ease-inout); }
      .bs-card:hover { border-color: var(--bs-border-strong); }

      .bs-tab:hover { color: var(--bs-text-primary); }
      .bs-primary-btn:hover:not(:disabled) { background: var(--bs-accent-hover); }
      .bs-primary-btn:active:not(:disabled) { transform: scale(0.99); }
      .bs-primary-btn:disabled { opacity: 0.55; cursor: not-allowed; }
      .bs-secondary-btn:hover { border-color: var(--bs-border-strong); color: var(--bs-text-primary); }
      .bs-icon-btn:hover { border-color: var(--bs-border-strong); color: var(--bs-text-primary); }
      .bs-chip-btn:hover { border-color: var(--bs-border-strong); }
      .bs-quiet-link:hover { color: var(--bs-accent-on-surface); }

      .bs-input:focus-visible,
      .bs-tab:focus-visible,
      .bs-primary-btn:focus-visible,
      .bs-secondary-btn:focus-visible,
      .bs-icon-btn:focus-visible,
      .bs-chip-btn:focus-visible,
      .bs-row-btn:focus-visible,
      .bs-quiet-link:focus-visible {
        outline: none;
        box-shadow: var(--bs-ring);
      }

      .bs-scroll-x::-webkit-scrollbar { display: none; }
      .bs-scroll-x { -ms-overflow-style: none; scrollbar-width: none; }

      @keyframes bsFadeUp {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .bs-animate { animation: bsFadeUp var(--bs-dur-2) var(--bs-ease-out) both; }

      @keyframes bsPulse { 0%,100% { opacity: 1 } 50% { opacity: .45 } }
      .bs-pulse { animation: bsPulse 1.5s ease-in-out infinite; }

      @keyframes bsSpin { to { transform: rotate(360deg); } }
      .bs-spinner {
        width: 16px; height: 16px; flex-shrink: 0;
        border: 2px solid var(--bs-border-strong);
        border-top-color: var(--bs-accent);
        border-radius: var(--bs-radius-full);
        animation: bsSpin 0.7s linear infinite;
        display: inline-block;
      }
    `}</style>
  )
}
