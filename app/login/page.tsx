'use client'

// ================================================================
// BUYSUB — LOGIN PAGE
// File: app/login/page.tsx
//
// Three tabs: Customer · Partner · Admin
// Features: Forgot password, theme persistence
// ================================================================

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || ''
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const API           = process.env.NEXT_PUBLIC_API_BASE || 'https://buysub-api-v2.ebuka-nwaju.workers.dev'
const ACCENT        = '#7C5CFF'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ── theme tokens ─────────────────────────────────────────────────
const T_DARK = {
  bg: '#0a0a0c', card: '#111114', border: '#1c1c22',
  input: '#0a0a0c', inputBorder: '#27272e',
  text: '#e8e8ec', muted: '#a0a0b0', faint: '#6b6b7e',
  elevated: '#18181c',
}
const T_LIGHT = {
  bg: '#f5f5f7', card: '#ffffff', border: '#e5e5ea',
  input: '#f5f5f7', inputBorder: '#d1d1d6',
  text: '#1a1a22', muted: '#6e6e78', faint: '#8e8e96',
  elevated: '#ebebf0',
}

type LoginType = 'customer' | 'partner' | 'admin'
type AuthMode  = 'login' | 'signup' | 'forgot'

const LOGIN_TABS: { id: LoginType; label: string; icon: string; sub: string }[] = [
  { id: 'customer', label: 'Customer',  icon: '🛍️', sub: 'Shop and manage orders'   },
  { id: 'partner',  label: 'Partner',   icon: '🤝', sub: 'Manage your store'         },
  { id: 'admin',    label: 'Admin',     icon: '⚙️', sub: 'Internal dashboard access' },
]

// ── post-login routing ────────────────────────────────────────────
async function redirectByRole(token: string, loginType: LoginType) {
  if (loginType === 'admin') {
    window.location.href = '/admin'; return
  }
  if (loginType === 'partner') {
    try {
      const res = await fetch(`${API}/v2/partners/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        window.location.href = '/partners/dashboard'; return
      }
    } catch {}
    window.location.href = '/partners/dashboard'; return
  }
  // customer
  window.location.href = '/dashboard'
}

// ================================================================
export default function LoginPage() {
  const [isDark,    setIsDark]    = useState(true)
  const [loginType, setLoginType] = useState<LoginType>('customer')
  const [mode,      setMode]      = useState<AuthMode>('login')

  // form fields
  const [firstName,   setFirstName]   = useState('')
  const [lastName,    setLastName]    = useState('')
  const [email,       setEmail]       = useState('')
  const [phone,       setPhone]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [gender,      setGender]      = useState('')

  // ui state
  const [loading,           setLoading]           = useState(false)
  const [checkingSession,   setCheckingSession]   = useState(true)
  const [error,             setError]             = useState('')
  const [success,           setSuccess]           = useState('')
  const [forgotSent,        setForgotSent]        = useState(false)

  const T = useMemo(() => isDark ? T_DARK : T_LIGHT, [isDark])

  // ── theme persistence ─────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bs_admin_theme')
      if (saved === 'light') setIsDark(false)
    } catch {}
  }, [])

  const toggleTheme = () => {
    const next = !isDark; setIsDark(next)
    try { localStorage.setItem('bs_admin_theme', next ? 'dark' : 'light') } catch {}
  }

  // ── check existing session ────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        // Already logged in — figure out where to send them
        redirectByRole(session.access_token, loginType)
      } else {
        setCheckingSession(false)
      }
    })
  }, [])

  // reset form when switching tabs or mode
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

    // 1. Create Supabase auth user
    const { data, error: authErr } = await supabase.auth.signUp({ email, password })
    if (authErr) { setError(authErr.message); setLoading(false); return }

    const userId    = data.user?.id
    const userToken = data.session?.access_token

    // 2. Create profile + customer row via API
    if (userId) {
      try {
        await fetch(`${API}/v2/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}) },
          body: JSON.stringify({
            user_id:    userId,
            full_name:  `${firstName.trim()} ${lastName.trim()}`,
            email:      email.trim(),
            phone:      phone.trim(),
            gender:     gender || null,
          }),
        })
      } catch {}
    }

    setLoading(false)
    if (data.session) {
      // Email confirmation not required — go straight to dashboard
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

  const styles = makeStyles(T)

  if (checkingSession) {
    return (
      <div style={styles.page}>
        <div style={{ color: T.faint, fontSize: 13 }}>Checking session…</div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      {/* Theme toggle */}
      <button onClick={toggleTheme} aria-label="Toggle theme" style={styles.themeBtn}>
        {isDark ? '☀' : '☾'}
      </button>

      <div style={styles.card}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: ACCENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', fontSize: 22, fontWeight: 700, color: '#fff',
          }}>B</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>BuySub</div>
          <div style={{ fontSize: 13, color: T.faint, marginTop: 2 }}>
            {mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'}
          </div>
        </div>

        {/* ── LOGIN TYPE TABS ──────────────────────────────────── */}
        {mode === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {LOGIN_TABS.map(tab => {
              const active = loginType === tab.id
              return (
                <button key={tab.id} onClick={() => setLoginType(tab.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                  background: active ? `${ACCENT}15` : T.elevated,
                  border: `1px solid ${active ? ACCENT + '55' : T.border}`,
                  textAlign: 'left', transition: 'all .15s',
                }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: active ? ACCENT : T.text }}>{tab.label}</div>
                    <div style={{ fontSize: 11, color: T.faint, marginTop: 1 }}>{tab.sub}</div>
                  </div>
                  <div style={{
                    width: 18, height: 18, borderRadius: 999, flexShrink: 0,
                    border: `2px solid ${active ? ACCENT : T.faint}`,
                    background: active ? ACCENT : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {active && <div style={{ width: 6, height: 6, borderRadius: 999, background: '#fff' }} />}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* ── SIGNUP TYPE HEADER (customer only) ──────────────── */}
        {mode === 'signup' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
            padding: '10px 14px', borderRadius: 10,
            background: `${ACCENT}10`, border: `1px solid ${ACCENT}30`,
          }}>
            <span style={{ fontSize: 18 }}>🛍️</span>
            <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>Creating a Customer account</div>
            <button onClick={() => setMode('login')} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: T.faint, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* ── FORGOT PASSWORD HEADER ───────────────────────────── */}
        {mode === 'forgot' && (
          <div style={{ marginBottom: 20 }}>
            <button onClick={() => setMode('login')} style={{ background: 'transparent', border: 'none', color: ACCENT, cursor: 'pointer', fontSize: 13, padding: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              ← Back to sign in
            </button>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
              Enter the email address on your account and we'll send you a reset link.
            </div>
          </div>
        )}

        {/* ── ALERTS ──────────────────────────────────────────── */}
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.25)', fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, background: 'rgba(22,163,74,0.10)', border: '1px solid rgba(22,163,74,0.25)', fontSize: 13, color: '#16a34a' }}>
            {success}
          </div>
        )}

        {/* ── FORM ────────────────────────────────────────────── */}
        {!forgotSent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Signup-only: first + last name */}
            {mode === 'signup' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={styles.label}>First Name *</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ada" style={styles.input} autoFocus />
                </div>
                <div>
                  <label style={styles.label}>Last Name *</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Obi" style={styles.input} />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label style={styles.label}>Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()}
                placeholder="you@example.com" style={styles.input} autoFocus={mode !== 'signup'} />
            </div>

            {/* Signup-only: phone + gender */}
            {mode === 'signup' && (
              <>
                <div>
                  <label style={styles.label}>Phone Number *</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="080..." style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>Gender <span style={{ color: T.faint }}>(optional)</span></label>
                  <select value={gender} onChange={e => setGender(e.target.value)} style={{ ...styles.input, appearance: 'none' as const }}>
                    <option value="">Select…</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </>
            )}

            {/* Password (not on forgot screen) */}
            {mode !== 'forgot' && (
              <div>
                <label style={styles.label}>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()}
                    placeholder={mode === 'signup' ? 'Min 8 characters' : '••••••••'}
                    style={{ ...styles.input, paddingRight: 44 }} />
                  <button onClick={() => setShowPass(v => !v)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', color: T.faint,
                    cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1,
                  }}>
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {/* Forgot password link */}
                {mode === 'login' && (
                  <div style={{ textAlign: 'right', marginTop: 6 }}>
                    <button onClick={() => setMode('forgot')} style={{ background: 'transparent', border: 'none', color: T.faint, cursor: 'pointer', fontSize: 12, padding: 0 }}>
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <button onClick={handleSubmit} disabled={loading} style={{
              ...styles.btn, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
            }}>
              {loading
                ? 'Please wait…'
                : mode === 'forgot'  ? 'Send Reset Link'
                : mode === 'signup'  ? 'Create Account'
                : `Sign In as ${LOGIN_TABS.find(t => t.id === loginType)?.label}`}
            </button>
          </div>
        )}

        {/* ── FOOTER LINKS ─────────────────────────────────────── */}
        {mode === 'login' && loginType === 'customer' && (
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: T.faint }}>
            No account?{' '}
            <button onClick={() => setMode('signup')} style={styles.linkBtn}>Create one</button>
          </div>
        )}
        {mode === 'signup' && (
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: T.faint }}>
            Already have an account?{' '}
            <button onClick={() => setMode('login')} style={styles.linkBtn}>Sign in</button>
          </div>
        )}
        {mode === 'login' && loginType === 'partner' && (
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: T.faint }}>
            Want to become a partner?{' '}
            <a href="/partners" style={{ color: ACCENT, textDecoration: 'none', fontWeight: 500 }}>Apply here</a>
          </div>
        )}
      </div>
    </div>
  )
}

// ── styles factory ────────────────────────────────────────────────
function makeStyles(T: typeof T_DARK) {
  return {
    page: {
      background: T.bg, minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: "'Inter', -apple-system, sans-serif",
    } as React.CSSProperties,
    themeBtn: {
      position: 'fixed' as const, top: 20, right: 20,
      width: 40, height: 40, borderRadius: 10,
      background: T.card, border: `1px solid ${T.border}`,
      color: T.muted, cursor: 'pointer', fontSize: 16,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    } as React.CSSProperties,
    card: {
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 24, padding: '32px 28px',
      width: '100%', maxWidth: 420,
    } as React.CSSProperties,
    label: {
      display: 'block', fontSize: 11, color: T.muted, marginBottom: 5,
    } as React.CSSProperties,
    input: {
      width: '100%', height: 44, padding: '0 14px', borderRadius: 10, fontSize: 14,
      background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text,
      boxSizing: 'border-box' as const, outline: 'none', fontFamily: 'inherit',
    } as React.CSSProperties,
    btn: {
      width: '100%', height: 48, borderRadius: 12, background: ACCENT,
      border: 'none', color: '#fff', fontSize: 15, fontWeight: 600,
      fontFamily: 'inherit',
    } as React.CSSProperties,
    linkBtn: {
      background: 'transparent', border: 'none', color: ACCENT,
      cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'inherit',
    } as React.CSSProperties,
  }
}