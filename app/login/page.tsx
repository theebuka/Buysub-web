// ============================================================
// LOGIN PAGE — Supabase Email/Password Auth
// File: ~/Downloads/buysub-web/app/login/page.tsx
//
// After successful login, redirects to /admin (or wherever
// the user came from). The Supabase session token is stored
// in localStorage, which the admin dashboard reads.
// ============================================================

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [success, setSuccess] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.href = '/admin'
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
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'login') {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }
      // Redirect to admin
      window.location.href = '/admin'
    } else {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }
      setSuccess('Account created. Check your email to confirm, then log in.')
      setMode('login')
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', color: '#6b6b7e', fontSize: 13 }}>Checking session…</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: '#7C5CFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', fontSize: 22, fontWeight: 700, color: '#fff',
          }}>
            b
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#e8e8ec' }}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </div>
          <div style={{ fontSize: 13, color: '#6b6b7e', marginTop: 4 }}>
            BuySub Internal
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16,
            background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)',
            fontSize: 13, color: '#dc2626',
          }}>
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
            fontSize: 13, color: '#16a34a',
          }}>
            {success}
          </div>
        )}

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="you@example.com"
              style={styles.input}
              autoFocus
            />
          </div>
          <div>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••"
              style={styles.input}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </div>

        {/* Toggle mode */}
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b6b7e' }}>
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button onClick={() => { setMode('signup'); setError('') }} style={styles.linkBtn}>
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError('') }} style={styles.linkBtn}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#0a0a0c',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  card: {
    background: '#111114',
    border: '1px solid #1c1c22',
    borderRadius: 20,
    padding: '36px 32px',
    width: '100%',
    maxWidth: 380,
  },
  label: {
    display: 'block',
    fontSize: 11,
    color: '#a0a0b0',
    marginBottom: 5,
  },
  input: {
    width: '100%',
    height: 44,
    padding: '0 14px',
    borderRadius: 10,
    fontSize: 14,
    background: '#0a0a0c',
    border: '1px solid #27272e',
    color: '#e8e8ec',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  button: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    background: '#7C5CFF',
    border: 'none',
    color: '#fff',
    fontSize: 15,
    fontWeight: 500,
    marginTop: 4,
  },
  linkBtn: {
    background: 'transparent',
    border: 'none',
    color: '#7C5CFF',
    cursor: 'pointer',
    fontSize: 13,
    padding: 0,
  },
}