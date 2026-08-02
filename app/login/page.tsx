'use client'

// ================================================================
// BUYSUB — LOGIN PAGE (Redesigned)
// File: app/login/page.tsx
//
// Three tabs: Customer · Partner · Admin
// Layout: Tab selector + form card side-by-side (desktop), stacked (mobile)
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
  bg: '#050507', card: '#0B0B0F', border: '#1c1c22',
  input: '#0a0a0c', inputBorder: '#27272e',
  text: '#e8e8ec', muted: '#a0a0b0', faint: '#6b6b7e',
  elevated: '#111115', panelBorder: 'rgba(255,255,255,0.05)',
}
const T_LIGHT = {
  bg: '#f0f0f5', card: '#ffffff', border: '#e5e5ea',
  input: '#f5f5f7', inputBorder: '#d1d1d6',
  text: '#1a1a22', muted: '#6e6e78', faint: '#9e9ea8',
  elevated: '#f7f7fa', panelBorder: 'rgba(0,0,0,0.06)',
}

type LoginType = 'customer' | 'partner' | 'admin'
type AuthMode  = 'login' | 'signup' | 'forgot'

const LOGIN_TABS: { id: LoginType; label: string; icon: string; sub: string; grad: string }[] = [
  { id: 'customer', label: 'Customer',  icon: '🛍️', sub: 'Shop and manage orders',   grad: 'rgba(124,92,255,0.12)' },
  { id: 'partner',  label: 'Partner',   icon: '🤝', sub: 'Monitor your earnings',         grad: 'rgba(99,180,255,0.10)' },
  { id: 'admin',    label: 'Admin',     icon: '⚙️', sub: 'Internal dashboard access', grad: 'rgba(255,167,38,0.10)' },
]

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
  const [isDark,    setIsDark]    = useState(true)
  const [loginType, setLoginType] = useState<LoginType>('customer')
  const [mode,      setMode]      = useState<AuthMode>('login')
  const [mounted,   setMounted]   = useState(false)
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

  const T = useMemo(() => isDark ? T_DARK : T_LIGHT, [isDark])

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem('bs_admin_theme')
      if (saved === 'light') setIsDark(false)
    } catch {}

    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggleTheme = () => {
    const next = !isDark; setIsDark(next)
    try { localStorage.setItem('bs_admin_theme', next ? 'dark' : 'light') } catch {}
  }

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
      <div style={{ background: '#050507', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6b6b7e', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
          {checkingSession ? 'Checking session…' : ''}
        </div>
      </div>
    )
  }

  const activeTab = LOGIN_TABS.find(t => t.id === loginType)!

  // ── styles ───────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 44, padding: '0 14px', borderRadius: 8, fontSize: 13,
    background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text,
    boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, -apple-system, sans-serif',
    transition: 'border-color .15s',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, color: T.muted, marginBottom: 5,
    fontFamily: 'Inter, sans-serif', fontWeight: 500,
    textTransform: 'uppercase', letterSpacing: '0.07em',
  }
  const btnStyle: React.CSSProperties = {
    width: '100%', height: 48, borderRadius: 10, background: ACCENT,
    border: 'none', color: '#fff', fontSize: 14, fontWeight: 600,
    fontFamily: 'Inter, sans-serif', cursor: 'pointer', letterSpacing: '0.01em',
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { margin: 0; }
        .bs-input:focus { border-color: ${ACCENT} !important; }
        .bs-input-select { appearance: none; }
        .bs-tab-btn:hover { border-color: ${ACCENT}55 !important; background: ${ACCENT}0a !important; }
        .bs-tab-btn.active { background: ${ACCENT}15 !important; border-color: ${ACCENT}55 !important; }
        .bs-submit-btn:hover:not(:disabled) { background: #6B4EE6 !important; }
        .bs-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .bs-link { background: transparent; border: none; color: ${ACCENT}; cursor: pointer; font-size: 13px; padding: 0; font-family: Inter, sans-serif; font-weight: 500; }
        .bs-link:hover { text-decoration: underline; }
        .bs-theme-btn:hover { border-color: ${ACCENT}55 !important; }
        .bs-tab-radio {
          width: 18px; height: 18px; border-radius: 999px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all .15s;
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .bs-animate { animation: fadeSlideUp 0.35s cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .bs-spinner {
          width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.25);
          border-top-color: #fff; border-radius: 50%;
          animation: spin 0.7s linear infinite; display: inline-block;
        }
        /* Ambient glow behind accent elements */
        .bs-glow {
          position: absolute; width: 320px; height: 320px; border-radius: 999px;
          background: radial-gradient(circle, ${ACCENT}22 0%, transparent 70%);
          pointer-events: none;
        }
      `}</style>

      {/* Page */}
      <div style={{
        background: T.bg, minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? '24px 16px' : '40px 24px',
        fontFamily: 'Inter, -apple-system, sans-serif',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Ambient glows */}
        <div className="bs-glow" style={{ top: '-80px', left: '-80px', opacity: isDark ? 1 : 0.4 }} />
        <div className="bs-glow" style={{ bottom: '-80px', right: '-80px', opacity: isDark ? 0.6 : 0.2, background: `radial-gradient(circle, rgba(99,180,255,0.15) 0%, transparent 70%)` }} />

        {/* Theme toggle */}
        <button
          className="bs-theme-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{
            position: 'fixed', top: 20, right: 20,
            width: 38, height: 38, borderRadius: 10,
            background: T.card, border: `1px solid ${T.border}`,
            color: T.muted, cursor: 'pointer', fontSize: 15,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10, transition: 'border-color .15s',
          }}
        >
          {isDark ? '☀' : '☾'}
        </button>

        {/* Outer wrapper */}
        <div
          className="bs-animate"
          style={{
            width: '100%',
            maxWidth: mode === 'signup' ? 860 : 780,
            position: 'relative', zIndex: 1,
          }}
        >
          {/* Logo + wordmark */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14, background: ACCENT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 10px',
              boxShadow: `0 8px 32px ${ACCENT}55`,
            }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>B</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: '-0.02em' }}>BuySub</div>
            <div style={{ fontSize: 12, color: T.faint, marginTop: 3 }}>
              {mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'}
            </div>
          </div>

          {/* ── MAIN LAYOUT: side-by-side on desktop, stacked on mobile ── */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 12,
            alignItems: isMobile ? 'stretch' : 'flex-start',
          }}>

            {/* ── LEFT: Login type selector (only on login mode) ──────── */}
            {mode === 'login' && (
              <div style={{
                width: isMobile ? '100%' : 220,
                flexShrink: 0,
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 20,
                padding: 12,
                display: 'flex',
                flexDirection: isMobile ? 'row' : 'column',
                gap: 6,
              }}>
                {isMobile && (
                  <div style={{ fontSize: 10, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 0, padding: '0 4px 4px', width: '100%', fontWeight: 500 }}>
                    Sign in as
                  </div>
                )}
                {!isMobile && (
                  <div style={{ fontSize: 10, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4, padding: '0 4px 6px', borderBottom: `1px solid ${T.border}`, fontWeight: 500 }}>
                    Sign in as
                  </div>
                )}
                {LOGIN_TABS.map(tab => {
                  const active = loginType === tab.id
                  return (
                    <button
                      key={tab.id}
                      className={`bs-tab-btn${active ? ' active' : ''}`}
                      onClick={() => setLoginType(tab.id)}
                      style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'center' : 'center',
                        gap: isMobile ? 4 : 10,
                        padding: isMobile ? '10px 8px' : '11px 12px',
                        borderRadius: 12, cursor: 'pointer',
                        background: active ? `${ACCENT}15` : 'transparent',
                        border: `1px solid ${active ? ACCENT + '55' : 'transparent'}`,
                        textAlign: isMobile ? 'center' : 'left',
                        transition: 'all .15s',
                        flex: isMobile ? 1 : 'unset',
                      }}
                    >
                      <span style={{ fontSize: isMobile ? 18 : 17, lineHeight: 1 }}>{tab.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: active ? ACCENT : T.text, lineHeight: 1.2 }}>{tab.label}</div>
                        {!isMobile && (
                          <div style={{ fontSize: 11, color: T.faint, marginTop: 2, lineHeight: 1.4 }}>{tab.sub}</div>
                        )}
                      </div>
                      {!isMobile && (
                        <div
                          className="bs-tab-radio"
                          style={{
                            border: `2px solid ${active ? ACCENT : T.faint}`,
                            background: active ? ACCENT : 'transparent',
                          }}
                        >
                          {active && <div style={{ width: 5, height: 5, borderRadius: 999, background: '#fff' }} />}
                        </div>
                      )}
                    </button>
                  )
                })}

                {/* Partner apply link */}
                {!isMobile && loginType === 'partner' && (
                  <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: `1px solid ${T.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: T.faint, marginBottom: 6 }}>Not a partner yet?</div>
                    <a href="/partners" style={{ color: ACCENT, fontSize: 12, fontWeight: 500, textDecoration: 'none' }}>Apply here →</a>
                  </div>
                )}
              </div>
            )}

            {/* ── RIGHT: Form card ─────────────────────────────────── */}
            <div style={{
              flex: 1,
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 20,
              padding: isMobile ? '24px 20px' : '28px 28px',
            }}>
              {/* Form header (context label) */}
              {mode === 'login' && (
                <div style={{ marginBottom: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: activeTab.grad,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 17, flexShrink: 0,
                    }}>
                      {activeTab.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
                        {activeTab.label} Sign In
                      </div>
                      <div style={{ fontSize: 12, color: T.faint, marginTop: 1 }}>{activeTab.sub}</div>
                    </div>
                  </div>
                  <div style={{ height: 1, background: T.border, marginTop: 20 }} />
                </div>
              )}

              {/* Signup header */}
              {mode === 'signup' && (
                <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 10,
                    background: `${ACCENT}10`, border: `1px solid ${ACCENT}30`,
                  }}>
                    <span style={{ fontSize: 17 }}>🛍️</span>
                    <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>Creating a Customer account</div>
                  </div>
                  <button onClick={() => setMode('login')} style={{ background: 'transparent', border: 'none', color: T.faint, cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
                </div>
              )}

              {/* Forgot password header */}
              {mode === 'forgot' && (
                <div style={{ marginBottom: 20 }}>
                  <button onClick={() => setMode('login')} style={{ background: 'transparent', border: 'none', color: ACCENT, cursor: 'pointer', fontSize: 13, padding: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                    ← Back to sign in
                  </button>
                  <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
                    Enter the email address on your account and we'll send you a reset link.
                  </div>
                </div>
              )}

              {/* Alerts */}
              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.22)', fontSize: 13, color: '#ef4444', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.22)', fontSize: 13, color: '#22c55e', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span>{success}</span>
                </div>
              )}

              {/* Form */}
              {!forgotSent && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* Signup: name row */}
                  {mode === 'signup' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={labelStyle}>First Name *</label>
                        <input className="bs-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ada" style={inputStyle} autoFocus />
                      </div>
                      <div>
                        <label style={labelStyle}>Last Name *</label>
                        <input className="bs-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Obi" style={inputStyle} />
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <label style={labelStyle}>Email *</label>
                    <input
                      className="bs-input"
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()}
                      placeholder="you@example.com" style={inputStyle}
                      autoFocus={mode !== 'signup'}
                    />
                  </div>

                  {/* Signup: phone + gender */}
                  {mode === 'signup' && (
                    <>
                      <div>
                        <label style={labelStyle}>Phone Number *</label>
                        <input className="bs-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="080xxxxxxxx" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Gender <span style={{ color: T.faint, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                        <select className="bs-input bs-input-select" value={gender} onChange={e => setGender(e.target.value)} style={{ ...inputStyle }}>
                          <option value="">Select…</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Password */}
                  {mode !== 'forgot' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>Password *</label>
                        {mode === 'login' && (
                          <button onClick={() => setMode('forgot')} style={{ background: 'transparent', border: 'none', color: T.faint, cursor: 'pointer', fontSize: 11, padding: 0, fontFamily: 'Inter, sans-serif' }}>
                            Forgot?
                          </button>
                        )}
                      </div>
                      <div style={{ position: 'relative' }}>
                        <input
                          className="bs-input"
                          type={showPass ? 'text' : 'password'} value={password}
                          onChange={e => setPassword(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()}
                          placeholder={mode === 'signup' ? 'Min 8 characters' : '••••••••'}
                          style={{ ...inputStyle, paddingRight: 44 }}
                        />
                        <button onClick={() => setShowPass(v => !v)} style={{
                          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          background: 'transparent', border: 'none', color: T.faint,
                          cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1,
                        }}>
                          {showPass ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    className="bs-submit-btn"
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{ ...btnStyle, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.6 : 1 }}
                  >
                    {loading
                      ? <><span className="bs-spinner" />Please wait…</>
                      : mode === 'forgot'  ? 'Send Reset Link'
                      : mode === 'signup'  ? 'Create Account'
                      : `Sign In`}
                  </button>
                </div>
              )}

              {/* Footer links */}
              <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: T.faint }}>
                {mode === 'login' && loginType === 'customer' && (
                  <>No account? <button className="bs-link" onClick={() => setMode('signup')}>Create one</button></>
                )}
                {mode === 'signup' && (
                  <>Already have an account? <button className="bs-link" onClick={() => setMode('login')}>Sign in</button></>
                )}
                {mode === 'login' && loginType === 'partner' && isMobile && (
                  <>Not a partner? <a href="/partners" style={{ color: ACCENT, fontWeight: 500, textDecoration: 'none' }}>Apply here</a></>
                )}
              </div>
            </div>
          </div>

          {/* Bottom note */}
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: T.faint }}>
            By continuing, you agree to BuySub's{' '}
            <a href="/terms" style={{ color: T.faint, textDecoration: 'underline' }}>Terms</a>
            {' & '}
            <a href="/privacy" style={{ color: T.faint, textDecoration: 'underline' }}>Privacy Policy</a>
          </div>
        </div>
      </div>
    </>
  )
}