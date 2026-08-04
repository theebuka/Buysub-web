'use client'

// ================================================================
// BUYSUB — LOGIN PAGE
// File: app/login/page.tsx
//
// Three roles: Customer · Partner · Admin
// Mobile-first (360px). Renders without the app shell — see isNoShell
// in components/AppShell.tsx. Tokens come from CSS_VARS via `T`.
// ================================================================

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { T } from '@/lib/constants'
import { useTheme } from '@/lib/theme'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || ''
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const API           = process.env.NEXT_PUBLIC_API_BASE || 'https://buysub-api-v2.ebuka-nwaju.workers.dev'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

type LoginType = 'customer' | 'partner' | 'admin'
type AuthMode  = 'login' | 'signup' | 'forgot'

// ================================================================
// ICONS (module-level, matching the inline-SVG house style in
// components/Marketplace.tsx — 24×24, currentColor, strokeWidth 2)
// ================================================================
type IconProps = { size?: number }

const svgBase = (size: number) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
})

const IconBag = ({ size = 20 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
)
const IconUsers = ({ size = 20 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const IconShield = ({ size = 20 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
  </svg>
)
const IconEye = ({ size = 18 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
const IconEyeOff = ({ size = 18 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.55 3.54M6.1 6.1A17.9 17.9 0 0 0 2 11s3.5 7 10 7a9 9 0 0 0 4.24-1.02" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><path d="m2 2 20 20" />
  </svg>
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
const IconArrowLeft = ({ size = 16 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
  </svg>
)
const IconMail = ({ size = 24 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" />
  </svg>
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

const LOGIN_TABS: { id: LoginType; label: string; Icon: (p: IconProps) => JSX.Element; sub: string }[] = [
  { id: 'customer', label: 'Customer', Icon: IconBag,    sub: 'Shop and manage orders' },
  { id: 'partner',  label: 'Partner',  Icon: IconUsers,  sub: 'Monitor your earnings' },
  { id: 'admin',    label: 'Admin',    Icon: IconShield, sub: 'Internal dashboard access' },
]

// ================================================================
// SHARED STYLE OBJECTS (module-level — stable references)
// ================================================================
const ACCENT_TINT   = 'rgba(var(--bs-accent-rgb), 0.15)'
const ACCENT_BORDER = 'rgba(var(--bs-accent-rgb), 0.45)'

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 'var(--bs-control-lg)',
  padding: `0 ${T.space[3]}`,
  borderRadius: T.radius.md,
  fontSize: T.text.base,
  background: T.color.bgInput,
  border: `1px solid ${T.color.borderDefault}`,
  color: T.color.textPrimary,
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
  transition: `border-color var(--bs-dur-1) var(--bs-ease-inout), box-shadow var(--bs-dur-1) var(--bs-ease-inout)`,
}

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  height: 'var(--bs-control-xl)',
  borderRadius: T.radius.md,
  background: T.color.accentFill,
  border: 'none',
  color: '#fff',
  fontSize: T.text.base,
  fontWeight: T.weight.semibold as any,
  fontFamily: 'inherit',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: T.space[2],
  transition: `background var(--bs-dur-1) var(--bs-ease-inout)`,
}

const secondaryBtnStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 'var(--bs-control-lg)',
  borderRadius: T.radius.md,
  background: 'transparent',
  border: `1px solid ${T.color.borderDefault}`,
  color: T.color.textPrimary,
  fontSize: T.text.base,
  fontWeight: T.weight.medium as any,
  fontFamily: 'inherit',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: T.space[2],
  padding: `0 ${T.space[4]}`,
  transition: `border-color var(--bs-dur-1) var(--bs-ease-inout)`,
}

// 44px tap area for a glyph-sized control.
const iconBtnStyle: React.CSSProperties = {
  width: 'var(--bs-control-lg)',
  height: 'var(--bs-control-lg)',
  borderRadius: T.radius.md,
  background: T.color.bgCard,
  border: `1px solid ${T.color.borderDefault}`,
  color: T.color.textSecondary,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  transition: `border-color var(--bs-dur-1) var(--bs-ease-inout)`,
}

const panelStyle = (isMobile: boolean): React.CSSProperties => ({
  background: T.color.bgCard,
  border: `1px solid ${T.color.borderDefault}`,
  borderRadius: isMobile ? T.radius.xl : T.radius['2xl'],
})

// ================================================================
// SUB-COMPONENTS (module-level — defining these inside the page
// would remount them every render and drop input focus)
// ================================================================
function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: T.radius.lg,
      background: T.color.accent, display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{
        fontSize: T.text.xl, fontWeight: T.weight.bold as any,
        color: '#fff', letterSpacing: '-0.02em', lineHeight: 1,
      }}>B</span>
    </div>
  )
}

function AuthAlert({ kind, children }: { kind: 'error' | 'success'; children: React.ReactNode }) {
  const rgb = kind === 'error' ? '--bs-error-rgb' : '--bs-success-rgb'
  const fg  = kind === 'error' ? T.color.error : T.color.success
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: T.space[2],
        padding: `${T.space[3]} ${T.space[3]}`,
        borderRadius: T.radius.md,
        background: `rgba(var(${rgb}), 0.10)`,
        border: `1px solid rgba(var(${rgb}), 0.28)`,
        fontSize: T.text.base,
        lineHeight: T.leading.snug,
        color: fg,
      }}
    >
      <span style={{ flexShrink: 0, display: 'flex', paddingTop: 2 }}>
        {kind === 'error' ? <IconAlert /> : <IconCheck />}
      </span>
      <span>{children}</span>
    </div>
  )
}

function Field({ id, label, optional, children }: {
  id: string; label: string; optional?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} style={{
        display: 'block', fontSize: T.text.xs, color: T.color.textSecondary,
        marginBottom: T.space[1], fontWeight: T.weight.medium as any,
      }}>
        {label}
        {optional && (
          <span style={{ color: T.color.textMuted }}> (optional)</span>
        )}
      </label>
      {children}
    </div>
  )
}

function RoleTab({ tab, active, isMobile, onClick }: {
  tab: typeof LOGIN_TABS[number]
  active: boolean
  isMobile: boolean
  onClick: () => void
}) {
  const { Icon } = tab
  return (
    <button
      type="button"
      className="bs-tab-btn"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: isMobile ? 'center' : 'flex-start',
        gap: isMobile ? T.space[1] : T.space[3],
        minHeight: 'var(--bs-control-lg)',
        padding: isMobile ? `${T.space[2]} ${T.space[1]}` : `${T.space[3]}`,
        borderRadius: T.radius.md,
        cursor: 'pointer',
        background: active ? ACCENT_TINT : 'transparent',
        border: `1px solid ${active ? ACCENT_BORDER : 'transparent'}`,
        color: active ? T.color.accentOnSurface : T.color.textSecondary,
        textAlign: isMobile ? 'center' : 'left',
        flex: isMobile ? 1 : undefined,
        minWidth: 0,
        fontFamily: 'inherit',
        transition: `background var(--bs-dur-1) var(--bs-ease-inout), border-color var(--bs-dur-1) var(--bs-ease-inout)`,
      }}
    >
      <span style={{ display: 'flex', flexShrink: 0 }}>
        <Icon size={isMobile ? 18 : 20} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          display: 'block',
          fontSize: isMobile ? T.text.xs : T.text.base,
          fontWeight: T.weight.semibold as any,
          color: active ? T.color.accentOnSurface : T.color.textPrimary,
          lineHeight: T.leading.snug,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {tab.label}
        </span>
        {!isMobile && (
          <span style={{
            display: 'block', fontSize: T.text.xs, color: T.color.textMuted,
            marginTop: 2, lineHeight: T.leading.snug, fontWeight: T.weight.regular as any,
          }}>
            {tab.sub}
          </span>
        )}
      </span>
    </button>
  )
}

function LoadingGate({ message }: { message: string }) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: T.space[4],
      background: T.color.bgBase, padding: T.space[6],
    }}>
      <BrandMark size={40} />
      <div style={{ display: 'flex', alignItems: 'center', gap: T.space[2] }}>
        <span className="bs-spinner bs-spinner-muted" />
        <span style={{ fontSize: T.text.base, color: T.color.textMuted }}>{message}</span>
      </div>
    </div>
  )
}

// ── post-login routing ────────────────────────────────────────────
async function redirectByRole(token: string, loginType: LoginType) {
  if (loginType === 'admin') { window.location.href = '/admin'; return }
  if (loginType === 'partner') {
    try {
      const res = await fetch(`${API}/v2/partners/me`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { window.location.href = '/partners/dashboard'; return }
    } catch {}
    window.location.href = '/partners/dashboard'; return
  }
  window.location.href = '/dashboard'
}

// ================================================================
export default function LoginPage() {
  const { isDark, toggle: toggleTheme, mounted } = useTheme()
  const [loginType, setLoginType] = useState<LoginType>('customer')
  const [mode,      setMode]      = useState<AuthMode>('login')
  const [isMobile,  setIsMobile]  = useState(false)

  // form fields
  const [firstName,   setFirstName]   = useState('')
  const [lastName,    setLastName]    = useState('')
  const [email,       setEmail]       = useState('')
  const [phone,       setPhone]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [gender,      setGender]      = useState('')

  // ui state
  const [loading,         setLoading]         = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error,           setError]           = useState('')
  const [success,         setSuccess]         = useState('')
  const [forgotSent,      setForgotSent]      = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        redirectByRole(session.access_token, loginType)
      } else {
        setCheckingSession(false)
      }
    })
  }, [])

  useEffect(() => {
    setError(''); setSuccess('')
    setFirstName(''); setLastName(''); setPhone(''); setGender('')
    setForgotSent(false)
  }, [loginType, mode])

  // ── forgot password ───────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!email.trim()) { setError('Enter your email address first'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setForgotSent(true)
    setSuccess(`Reset link sent to ${email}. Check your inbox.`)
  }

  // ── login ─────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email || !password) { setError('Email and password are required'); return }
    setLoading(true); setError('')
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) { setError(authErr.message); setLoading(false); return }
    if (data.session?.access_token) await redirectByRole(data.session.access_token, loginType)
  }

  // ── signup (customer only) ────────────────────────────────────
  const handleSignup = async () => {
    if (!firstName.trim()) { setError('First name is required'); return }
    if (!lastName.trim())  { setError('Last name is required');  return }
    if (!email.trim())     { setError('Email is required');       return }
    if (!phone.trim())     { setError('Phone number is required'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')

    const { data, error: authErr } = await supabase.auth.signUp({ email, password })
    if (authErr) { setError(authErr.message); setLoading(false); return }

    const userId    = data.user?.id
    const userToken = data.session?.access_token

    if (userId) {
      try {
        await fetch(`${API}/v2/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}) },
          body: JSON.stringify({
            user_id:   userId,
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            email:     email.trim(),
            phone:     phone.trim(),
            gender:    gender || null,
          }),
        })
      } catch {}
    }

    setLoading(false)
    if (data.session) {
      window.location.href = '/dashboard'
    } else {
      setMode('login')
      setSuccess('Account created! Check your email to confirm, then sign in.')
    }
  }

  const handleSubmit = () => {
    if (mode === 'forgot') { handleForgotPassword(); return }
    if (mode === 'signup') { handleSignup(); return }
    handleLogin()
  }

  if (!mounted || checkingSession) {
    return (
      <>
        <PageStyles />
        <LoadingGate message={checkingSession ? 'Checking your session' : 'Loading'} />
      </>
    )
  }

  const activeTab = LOGIN_TABS.find(t => t.id === loginType)!
  const gutter = isMobile ? T.space[4] : T.space[6]

  return (
    <>
      <PageStyles />

      <div style={{
        background: T.color.bgBase,
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        padding: gutter,
        boxSizing: 'border-box',
      }}>
        {/* ── Top bar: back to shop + theme toggle ─────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: T.space[3], flexShrink: 0,
        }}>
          <a href="/shop" className="bs-quiet-link" style={{
            display: 'inline-flex', alignItems: 'center', gap: T.space[2],
            minHeight: 'var(--bs-control-lg)', padding: `0 ${T.space[2]} 0 0`,
            fontSize: T.text.base, color: T.color.textSecondary,
            textDecoration: 'none', borderRadius: T.radius.md,
          }}>
            <IconArrowLeft />
            Back to shop
          </a>
          <button
            type="button"
            className="bs-icon-btn"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            style={iconBtnStyle}
          >
            {isDark ? <IconSun /> : <IconMoon />}
          </button>
        </div>

        {/* ── Centred content ──────────────────────────────────── */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: `${isMobile ? T.space[4] : T.space[6]} 0`,
        }}>
          <div className="bs-animate" style={{
            width: '100%',
            maxWidth: mode === 'login' ? 760 : 460,
          }}>
            {/* Brand */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: T.space[3], marginBottom: T.space[6],
            }}>
              <BrandMark />
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: T.text.lg, fontWeight: T.weight.bold as any,
                  color: T.color.textPrimary, letterSpacing: '-0.02em',
                }}>BuySub</div>
                <div style={{ fontSize: T.text.xs, color: T.color.textMuted, marginTop: 2 }}>
                  {mode === 'signup' ? 'Create your account'
                    : mode === 'forgot' ? 'Reset your password'
                    : 'Welcome back'}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: isMobile || mode !== 'login' ? 'column' : 'row',
              gap: T.space[3],
              alignItems: 'stretch',
            }}>

              {/* ── Role selector (login mode only) ────────────── */}
              {mode === 'login' && (
                <div style={{
                  ...panelStyle(isMobile),
                  width: isMobile ? '100%' : 240,
                  flexShrink: 0,
                  padding: T.space[2],
                  display: 'flex',
                  flexDirection: 'column',
                  gap: T.space[1],
                }}>
                  <div style={{
                    fontSize: T.text['2xs'], color: T.color.textMuted,
                    fontWeight: T.weight.medium as any,
                    padding: `${T.space[1]} ${T.space[2]}`,
                  }}>
                    Sign in as
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'row' : 'column',
                    gap: T.space[1],
                  }}>
                    {LOGIN_TABS.map(tab => (
                      <RoleTab
                        key={tab.id}
                        tab={tab}
                        active={loginType === tab.id}
                        isMobile={isMobile}
                        onClick={() => setLoginType(tab.id)}
                      />
                    ))}
                  </div>

                  {!isMobile && loginType === 'partner' && (
                    <div style={{
                      marginTop: 'auto', paddingTop: T.space[3],
                      borderTop: `1px solid ${T.color.borderSubtle}`,
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: T.text.xs, color: T.color.textMuted, marginBottom: T.space[1] }}>
                        Not a partner yet?
                      </div>
                      <a href="/partners" className="bs-accent-link" style={{
                        display: 'inline-flex', alignItems: 'center',
                        minHeight: 'var(--bs-control-lg)', padding: `0 ${T.space[2]}`,
                        color: T.color.accentOnSurface, fontSize: T.text.base,
                        fontWeight: T.weight.medium as any, textDecoration: 'none',
                        borderRadius: T.radius.md,
                      }}>
                        Apply here
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* ── Form panel ─────────────────────────────────── */}
              <div style={{
                ...panelStyle(isMobile),
                flex: 1,
                padding: isMobile ? T.space[5] : T.space[6],
                minWidth: 0,
              }}>
                {/* Forgot-password confirmation replaces the form entirely */}
                {mode === 'forgot' && forgotSent ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: T.radius.lg,
                      background: 'rgba(var(--bs-success-rgb), 0.12)',
                      color: T.color.success,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: `0 auto ${T.space[4]}`,
                    }}>
                      <IconMail />
                    </div>
                    <div style={{
                      fontSize: T.text.lg, fontWeight: T.weight.semibold as any,
                      color: T.color.textPrimary, marginBottom: T.space[2],
                    }}>
                      Check your inbox
                    </div>
                    <div style={{
                      fontSize: T.text.base, color: T.color.textSecondary,
                      lineHeight: T.leading.relaxed, marginBottom: T.space[5],
                    }}>
                      We sent a password reset link to{' '}
                      <span style={{ color: T.color.textPrimary, fontWeight: T.weight.medium as any }}>
                        {email}
                      </span>. The link expires in one hour.
                    </div>
                    <button
                      type="button"
                      className="bs-secondary-btn"
                      onClick={() => setMode('login')}
                      style={secondaryBtnStyle}
                    >
                      <IconArrowLeft />
                      Back to sign in
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    {mode === 'login' && (
                      <div style={{ marginBottom: T.space[5] }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: T.space[3] }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: T.radius.md,
                            background: ACCENT_TINT, color: T.color.accentOnSurface,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <activeTab.Icon size={20} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontSize: T.text.lg, fontWeight: T.weight.semibold as any,
                              color: T.color.textPrimary, lineHeight: T.leading.tight,
                            }}>
                              {activeTab.label} sign in
                            </div>
                            <div style={{
                              fontSize: T.text.xs, color: T.color.textMuted, marginTop: 2,
                            }}>
                              {activeTab.sub}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {mode === 'signup' && (
                      <div style={{
                        marginBottom: T.space[5], display: 'flex',
                        alignItems: 'center', gap: T.space[2],
                      }}>
                        <div style={{
                          flex: 1, display: 'flex', alignItems: 'center', gap: T.space[3],
                          padding: `${T.space[3]}`, borderRadius: T.radius.md,
                          background: ACCENT_TINT,
                          border: `1px solid ${ACCENT_BORDER}`,
                          color: T.color.accentOnSurface, minWidth: 0,
                        }}>
                          <IconBag size={20} />
                          <span style={{
                            fontSize: T.text.base, color: T.color.textPrimary,
                            fontWeight: T.weight.medium as any,
                          }}>
                            Creating a customer account
                          </span>
                        </div>
                        <button
                          type="button"
                          className="bs-icon-btn"
                          onClick={() => setMode('login')}
                          aria-label="Cancel sign up"
                          style={{ ...iconBtnStyle, background: 'transparent' }}
                        >
                          <svg {...svgBase(18)} aria-hidden="true">
                            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {mode === 'forgot' && (
                      <div style={{ marginBottom: T.space[5] }}>
                        <button
                          type="button"
                          className="bs-quiet-link"
                          onClick={() => setMode('login')}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: T.space[2],
                            minHeight: 'var(--bs-control-lg)', padding: `0 ${T.space[2]} 0 0`,
                            background: 'transparent', border: 'none',
                            color: T.color.accentOnSurface, cursor: 'pointer',
                            fontSize: T.text.base, fontFamily: 'inherit',
                            fontWeight: T.weight.medium as any,
                            borderRadius: T.radius.md,
                          }}
                        >
                          <IconArrowLeft />
                          Back to sign in
                        </button>
                        <div style={{
                          fontSize: T.text.base, color: T.color.textSecondary,
                          lineHeight: T.leading.relaxed, marginTop: T.space[2],
                        }}>
                          Enter the email address on your account and we&apos;ll send you a reset link.
                        </div>
                      </div>
                    )}

                    {/* Alerts */}
                    {(error || success) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: T.space[2], marginBottom: T.space[4] }}>
                        {error && <AuthAlert kind="error">{error}</AuthAlert>}
                        {success && <AuthAlert kind="success">{success}</AuthAlert>}
                      </div>
                    )}

                    {/* Form */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: T.space[4] }}>
                      {mode === 'signup' && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                          gap: T.space[3],
                        }}>
                          <Field id="firstName" label="First name">
                            <input id="firstName" className="bs-input" value={firstName}
                              onChange={e => setFirstName(e.target.value)}
                              placeholder="Ada" style={inputStyle}
                              autoFocus={!isMobile} autoComplete="given-name" />
                          </Field>
                          <Field id="lastName" label="Last name">
                            <input id="lastName" className="bs-input" value={lastName}
                              onChange={e => setLastName(e.target.value)}
                              placeholder="Obi" style={inputStyle} autoComplete="family-name" />
                          </Field>
                        </div>
                      )}

                      <Field id="email" label="Email">
                        <input
                          id="email" className="bs-input" type="email" value={email}
                          onChange={e => setEmail(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()}
                          placeholder="you@example.com" style={inputStyle}
                          autoComplete="email"
                          autoFocus={!isMobile && mode !== 'signup'}
                        />
                      </Field>

                      {mode === 'signup' && (
                        <>
                          <Field id="phone" label="Phone number">
                            <input id="phone" className="bs-input" type="tel" value={phone}
                              onChange={e => setPhone(e.target.value)}
                              placeholder="080xxxxxxxx" style={inputStyle} autoComplete="tel" />
                          </Field>
                          <Field id="gender" label="Gender" optional>
                            <select id="gender" className="bs-input bs-input-select" value={gender}
                              onChange={e => setGender(e.target.value)} style={inputStyle}>
                              <option value="">Select…</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </Field>
                        </>
                      )}

                      {mode !== 'forgot' && (
                        <div>
                          <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', gap: T.space[2], marginBottom: T.space[1],
                          }}>
                            <label htmlFor="password" style={{
                              fontSize: T.text.xs, color: T.color.textSecondary,
                              fontWeight: T.weight.medium as any,
                            }}>
                              Password
                            </label>
                            {mode === 'login' && (
                              <button
                                type="button"
                                className="bs-quiet-link"
                                onClick={() => setMode('forgot')}
                                style={{
                                  display: 'inline-flex', alignItems: 'center',
                                  minHeight: 'var(--bs-control-lg)', padding: `0 ${T.space[1]}`,
                                  marginRight: `-${T.space[1]}`,
                                  background: 'transparent', border: 'none',
                                  color: T.color.textMuted, cursor: 'pointer',
                                  fontSize: T.text.xs, fontFamily: 'inherit',
                                  borderRadius: T.radius.md,
                                }}
                              >
                                Forgot password?
                              </button>
                            )}
                          </div>
                          <div style={{ position: 'relative' }}>
                            <input
                              id="password" className="bs-input"
                              type={showPass ? 'text' : 'password'} value={password}
                              onChange={e => setPassword(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()}
                              placeholder={mode === 'signup' ? 'Min 8 characters' : '••••••••'}
                              style={{ ...inputStyle, paddingRight: 'var(--bs-control-lg)' }}
                              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                            />
                            <button
                              type="button"
                              className="bs-ghost-btn"
                              onClick={() => setShowPass(v => !v)}
                              aria-label={showPass ? 'Hide password' : 'Show password'}
                              style={{
                                position: 'absolute', right: 0, top: 0,
                                width: 'var(--bs-control-lg)', height: 'var(--bs-control-lg)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'transparent', border: 'none',
                                color: T.color.textMuted, cursor: 'pointer',
                                borderRadius: T.radius.md,
                              }}
                            >
                              {showPass ? <IconEyeOff /> : <IconEye />}
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        className="bs-submit-btn"
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        style={primaryBtnStyle}
                      >
                        {loading
                          ? <><span className="bs-spinner" />Please wait…</>
                          : mode === 'forgot'  ? 'Send reset link'
                          : mode === 'signup'  ? 'Create account'
                          : 'Sign in'}
                      </button>
                    </div>

                    {/* Footer switch */}
                    {(mode === 'signup'
                      || (mode === 'login' && loginType === 'customer')
                      || (mode === 'login' && loginType === 'partner' && isMobile)) && (
                      <div style={{
                        marginTop: T.space[5], paddingTop: T.space[4],
                        borderTop: `1px solid ${T.color.borderSubtle}`,
                      }}>
                        <div style={{
                          fontSize: T.text.xs, color: T.color.textMuted,
                          textAlign: 'center', marginBottom: T.space[2],
                        }}>
                          {mode === 'signup' ? 'Already have an account?'
                            : loginType === 'partner' ? 'Not a partner yet?'
                            : 'New to BuySub?'}
                        </div>
                        {mode === 'signup' ? (
                          <button type="button" className="bs-secondary-btn"
                            onClick={() => setMode('login')} style={secondaryBtnStyle}>
                            Sign in instead
                          </button>
                        ) : loginType === 'partner' ? (
                          <a href="/partners" className="bs-secondary-btn"
                            style={{ ...secondaryBtnStyle, textDecoration: 'none' }}>
                            Apply to become a partner
                          </a>
                        ) : (
                          <button type="button" className="bs-secondary-btn"
                            onClick={() => setMode('signup')} style={secondaryBtnStyle}>
                            Create an account
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Legal */}
            <div style={{
              textAlign: 'center', marginTop: T.space[5],
              fontSize: T.text.xs, color: T.color.textMuted,
              lineHeight: T.leading.relaxed,
            }}>
              By continuing, you agree to BuySub&apos;s{' '}
              <a href="/terms" className="bs-quiet-link" style={{ color: T.color.textSecondary, textDecoration: 'underline' }}>Terms</a>
              {' & '}
              <a href="/privacy" className="bs-quiet-link" style={{ color: T.color.textSecondary, textDecoration: 'underline' }}>Privacy Policy</a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ================================================================
// Pseudo-classes and keyframes (inline styles cannot express these)
// ================================================================
function PageStyles() {
  return (
    <style>{`
      .bs-input:focus-visible,
      .bs-input:focus {
        border-color: var(--bs-accent) !important;
        box-shadow: var(--bs-ring);
      }
      .bs-input::placeholder { color: var(--bs-text-faint); }
      .bs-input-select { appearance: none; }

      .bs-tab-btn:hover {
        background: rgba(var(--bs-accent-rgb), 0.08);
      }
      .bs-tab-btn:active { transform: scale(0.99); }

      .bs-submit-btn:hover:not(:disabled) { background: var(--bs-accent-hover); }
      .bs-submit-btn:active:not(:disabled) { transform: scale(0.99); }
      .bs-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }

      .bs-secondary-btn:hover { border-color: var(--bs-border-strong); }
      .bs-icon-btn:hover { border-color: var(--bs-border-strong); color: var(--bs-text-primary); }
      .bs-ghost-btn:hover { color: var(--bs-text-primary); }
      .bs-quiet-link:hover { color: var(--bs-text-primary); }
      .bs-accent-link:hover { text-decoration: underline; }

      .bs-tab-btn:focus-visible,
      .bs-submit-btn:focus-visible,
      .bs-secondary-btn:focus-visible,
      .bs-icon-btn:focus-visible,
      .bs-ghost-btn:focus-visible,
      .bs-quiet-link:focus-visible,
      .bs-accent-link:focus-visible {
        outline: none;
        box-shadow: var(--bs-ring);
      }

      @keyframes bsFadeUp {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .bs-animate {
        animation: bsFadeUp var(--bs-dur-2) var(--bs-ease-out) both;
      }

      @keyframes bsSpin { to { transform: rotate(360deg); } }
      .bs-spinner {
        width: 16px; height: 16px; flex-shrink: 0;
        border: 2px solid rgba(255,255,255,0.28);
        border-top-color: #fff;
        border-radius: var(--bs-radius-full);
        animation: bsSpin 0.7s linear infinite;
        display: inline-block;
      }
      .bs-spinner-muted {
        border-color: var(--bs-border-strong);
        border-top-color: var(--bs-accent);
      }
    `}</style>
  )
}
