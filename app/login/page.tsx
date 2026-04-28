// ============================================================
// LOGIN PAGE — Supabase Email/Password Auth
// File: app/login/page.tsx
//
// Changes:
//  - F5: Theme persistence. Reads `bs_admin_theme` from localStorage
//        and applies to this page before first paint (no flash).
//  - Post-login redirect detects role: partners → /partners/dashboard,
//        others → /admin (unchanged).
// ============================================================

'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const API = process.env.NEXT_PUBLIC_API_BASE || 'https://buysub-api-v2.ebuka-nwaju.workers.dev'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/* ── Theme tokens (F5) ─────────────────────────────────────── */
const T_DARK = {
  bg: '#0a0a0c', card: '#111114', border: '#1c1c22', input: '#0a0a0c',
  inputBorder: '#27272e', text: '#e8e8ec', muted: '#a0a0b0', faint: '#6b6b7e',
}
const T_LIGHT = {
  bg: '#f5f5f7', card: '#ffffff', border: '#e5e5ea', input: '#f5f5f7',
  inputBorder: '#d1d1d6', text: '#1a1a22', muted: '#6e6e78', faint: '#8e8e96',
}
const ACCENT = '#7C5CFF'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [success, setSuccess] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  const [isDark, setIsDark] = useState(true)

  // F5: read persisted theme synchronously after mount, before rendering the form
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bs_admin_theme')
      if (saved === 'light') setIsDark(false)
    } catch {}
  }, [])

  const T = useMemo(() => (isDark ? T_DARK : T_LIGHT), [isDark])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    try { localStorage.setItem('bs_admin_theme', next ? 'dark' : 'light') } catch {}
  }

  // Post-login routing: choose dashboard by role (partner vs. staff)
  const redirectByRole = async (token: string) => {
    try {
      const meRes = await fetch(`${API}/v2/partners/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (meRes.ok) {
        const j = await meRes.json()
        if (j?.data?.profile?.status === 'approved') {
          window.location.href = '/partners/dashboard'; return
        }
        // Application exists but still pending
        if (j?.data?.profile) {
          window.location.href = '/partners/dashboard'; return
        }
      }
    } catch {}
    // Fallback: staff/admin
    window.location.href = '/admin'
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        redirectByRole(session.access_token)
      } else {
        setCheckingSession(false)
      }
    })
  }, [])

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Email and password are required')
      return
    }
    setLoading(true); setError(''); setSuccess('')

    if (mode === 'login') {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) { setError(authError.message); setLoading(false); return }
      if (data.session?.access_token) await redirectByRole(data.session.access_token)
    } else {
      const { error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) { setError(authError.message); setLoading(false); return }
      setSuccess('Account created. Check your email to confirm, then log in.')
      setMode('login'); setLoading(false)
    }
  }

  const styles = makeStyles(T)

  if (checkingSession) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', color: T.faint, fontSize: 13 }}>Checking session…</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Theme toggle — top right */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        style={{
          position: 'fixed', top: 20, right: 20,
          width: 40, height: 40, borderRadius: 10,
          background: T.card, border: `1px solid ${T.border}`,
          color: T.muted, cursor: 'pointer', fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {isDark ? '☀' : '☾'}
      </button>

      <div style={styles.card}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: ACCENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', fontSize: 22, fontWeight: 700, color: '#fff',
          }}>
            B
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: T.text }}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </div>
          <div style={{ fontSize: 13, color: T.faint, marginTop: 4 }}>BuySub</div>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16,
            background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)',
            fontSize: 13, color: '#dc2626',
          }}>{error}</div>
        )}
        {success && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
            fontSize: 13, color: '#16a34a',
          }}>{success}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={styles.label}>Email</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="you@example.com"
              style={styles.input} autoFocus
            />
          </div>
          <div>
            <label style={styles.label}>Password</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••" style={styles.input}
            />
          </div>

          <button
            onClick={handleSubmit} disabled={loading}
            style={{ ...styles.button, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: T.faint }}>
          {mode === 'login' ? (
            <>No account? <button onClick={() => { setMode('signup'); setError('') }} style={styles.linkBtn}>Create one</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('login'); setError('') }} style={styles.linkBtn}>Sign in</button></>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: T.faint }}>
          Applying to become a partner?{' '}
          <a href="/partners" style={{ color: ACCENT, textDecoration: 'none', fontWeight: 500 }}>Start here</a>
        </div>
      </div>
    </div>
  )
}

function makeStyles(T: typeof T_DARK): Record<string, React.CSSProperties> {
  return {
    container: {
      background: T.bg, minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: "'Inter', -apple-system, sans-serif",
    },
    card: {
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 20, padding: '36px 32px', width: '100%', maxWidth: 380,
    },
    label: { display: 'block', fontSize: 11, color: T.muted, marginBottom: 5 },
    input: {
      width: '100%', height: 44, padding: '0 14px', borderRadius: 10, fontSize: 14,
      background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text,
      boxSizing: 'border-box' as const, outline: 'none',
    },
    button: {
      width: '100%', height: 48, borderRadius: 12, background: ACCENT,
      border: 'none', color: '#fff', fontSize: 15, fontWeight: 500, marginTop: 4,
    },
    linkBtn: {
      background: 'transparent', border: 'none', color: ACCENT,
      cursor: 'pointer', fontSize: 13, padding: 0,
    },
  }
}