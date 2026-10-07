'use client'

// ============================================================
// BUYSUB — Sign in, create account, forgot password
// ============================================================
// One sign-in for everyone. The account's role decides where it lands
// (staff → /admin, partner → /partner, everyone else → /account), so the
// page never asks "who are you?" and never shows a visitor the doors to
// areas they can't use. A same-origin ?next= wins over all of that.
//
// /login            sign in (?mode=signup and ?mode=forgot still work)
// /signup           create a customer account
// Partners apply at /partners; staff accounts are made by an admin.

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { Button, Field, Input, Select, Spinner } from '@/components/ui'
import { API_BASE } from '@/lib/config'
import { getSupabase } from '@/lib/session'
import { ROUTES, isStaff } from '@/lib/routes'
import { AuthAlert, AuthLayout, PasswordInput, authStyles as s } from './AuthLayout'

export type AuthMode = 'login' | 'signup' | 'forgot'

/** A same-origin path to return to after sign-in, or null. */
function nextPath(): string | null {
  try {
    const n = new URLSearchParams(window.location.search).get('next') || ''
    return n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/login') && !n.startsWith('/signup') ? n : null
  } catch { return null }
}

// Idempotent profile completion (POST /v2/auth/signup, token-identified).
// Runs after sign-up and at each non-staff sign-in, so accounts that had to
// confirm their email first still get their name and phone filled in.
async function completeProfile(token: string, fields: Record<string, string | null> = {}) {
  try {
    await fetch(`${API_BASE}/v2/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(fields),
    })
  } catch { /* non-blocking */ }
}

/** Where a signed-in account belongs, by its real role. */
async function landingFor(token: string, complete: boolean): Promise<string> {
  const next = nextPath()
  const auth = { headers: { Authorization: `Bearer ${token}` } }
  let staff = false
  try {
    const me = await fetch(`${API_BASE}/v2/me`, auth).then(r => r.json())
    staff = isStaff(me?.data?.role)
  } catch { /* fall through to the customer area */ }
  if (!staff && complete) await completeProfile(token)
  if (next) return next
  if (staff) return ROUTES.admin.home
  try {
    const partner = await fetch(`${API_BASE}/v2/partners/me`, auth)
    if (partner.ok) {
      const body = await partner.json().catch(() => null)
      if (body?.data) return ROUTES.partner.home
    }
  } catch { /* not a partner */ }
  return ROUTES.account.home
}

function Checking() {
  return (
    <AuthLayout legal={false}>
      <div className={s.checking}><Spinner size={18} /> Checking your session</div>
    </AuthLayout>
  )
}

export default function AuthPage({ initialMode = 'login' }: { initialMode?: AuthMode }) {
  const supabase = getSupabase()
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [unconfirmed, setUnconfirmed] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('')

  // ?mode= deep links (old header links, emails). Read after mount.
  useEffect(() => {
    try {
      const m = new URLSearchParams(window.location.search).get('mode')
      if (m === 'signup' || m === 'forgot') setMode(m)
    } catch { /* no location */ }
  }, [])

  // Already signed in: go where the account belongs.
  useEffect(() => {
    let live = true
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!live) return
      if (session?.access_token) window.location.href = await landingFor(session.access_token, false)
      else setChecking(false)
    }).catch(() => setChecking(false))
    return () => { live = false }
  }, [supabase])

  const switchTo = (m: AuthMode) => {
    setMode(m); setError(''); setNotice(''); setUnconfirmed('')
    const path = m === 'signup' ? ROUTES.signup : m === 'forgot' ? ROUTES.forgot : ROUTES.login
    const keepNext = nextPath()
    window.history.replaceState(null, '', keepNext && m !== 'forgot' ? `${path}${path.includes('?') ? '&' : '?'}next=${encodeURIComponent(keepNext)}` : path)
  }

  const signIn = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Enter your email and password.'); return }
    setBusy(true); setError(''); setNotice(''); setUnconfirmed('')
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (authErr) {
      setBusy(false)
      if (/not confirmed/i.test(authErr.message)) {
        setError('Confirm your email before signing in. Use the link we sent you, or send a new one.')
        setUnconfirmed(email.trim())
      } else if (/invalid login credentials/i.test(authErr.message)) {
        setError('That email and password don’t match an account.')
      } else setError(authErr.message)
      return
    }
    if (data.session?.access_token) window.location.href = await landingFor(data.session.access_token, true)
  }

  const resend = async () => {
    if (!unconfirmed) return
    setBusy(true); setError('')
    // /dashboard is the URL on the Supabase Auth redirect allow-list; it
    // forwards to /account keeping the #access_token.
    const { error: err } = await supabase.auth.resend({ type: 'signup', email: unconfirmed, options: { emailRedirectTo: `${window.location.origin}/dashboard` } })
    setBusy(false)
    if (err) { setError(err.message); return }
    setNotice(`We sent a new confirmation link to ${unconfirmed}.`)
    setUnconfirmed('')
  }

  const signUp = async (e: FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) { setError('Enter your first and last name.'); return }
    if (!email.trim()) { setError('Enter your email address.'); return }
    if (!phone.trim()) { setError('Enter your phone number.'); return }
    if (password.length < 8) { setError('Use at least 8 characters for your password.'); return }
    setBusy(true); setError('')
    const fields = { full_name: `${firstName.trim()} ${lastName.trim()}`, phone: phone.trim(), gender: gender || null }
    const { data, error: authErr } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: fields },
    })
    if (authErr) { setBusy(false); setError(authErr.message); return }
    if (data.session?.access_token) {
      await completeProfile(data.session.access_token, fields)
      window.location.href = nextPath() || ROUTES.account.home
      return
    }
    setBusy(false)
    setPassword('')
    setMode('login')
    setNotice(`Check ${email.trim()} for a confirmation link, then sign in.`)
  }

  const forgot = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('Enter the email you signed up with.'); return }
    setBusy(true); setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
    setBusy(false)
    if (err) { setError(err.message); return }
    setNotice(`If ${email.trim()} has an account, a reset link is on its way.`)
  }

  if (checking) return <Checking />

  const alerts = (
    <>
      {error && <AuthAlert kind="error">{error}{unconfirmed && <><br /><button type="button" className={s.alertBtn} onClick={resend} disabled={busy}>Send a new confirmation link</button></>}</AuthAlert>}
      {notice && <AuthAlert kind="ok">{notice}</AuthAlert>}
    </>
  )

  if (mode === 'forgot') {
    return (
      <AuthLayout>
        <h1 className={s.title}>Reset your password</h1>
        <p className={s.sub}>We’ll email you a link to choose a new one.</p>
        <form className={s.form} onSubmit={forgot} noValidate>
          {alerts}
          <Field label="Email">{p => <Input {...p} type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus />}</Field>
          <Button type="submit" full loading={busy}>Send reset link</Button>
        </form>
        <p className={s.switch}><button type="button" className={s.inlineLink} onClick={() => switchTo('login')}>Back to sign in</button></p>
      </AuthLayout>
    )
  }

  if (mode === 'signup') {
    return (
      <AuthLayout wide>
        <h1 className={s.title}>Create your account</h1>
        <p className={s.sub}>Track orders, renew plans and keep a wallet balance.</p>
        <form className={s.form} onSubmit={signUp} noValidate>
          {alerts}
          <div className={s.row2}>
            <Field label="First name">{p => <Input {...p} autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} autoFocus />}</Field>
            <Field label="Last name">{p => <Input {...p} autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} />}</Field>
          </div>
          <Field label="Email">{p => <Input {...p} type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} />}</Field>
          <Field label="Phone" hint="For order updates on WhatsApp.">{p => <Input {...p} type="tel" autoComplete="tel" inputMode="tel" placeholder="0801 234 5678" value={phone} onChange={e => setPhone(e.target.value)} />}</Field>
          <Field label={<>Gender <span style={{ color: 'var(--bs-text-muted)', fontWeight: 400 }}>(optional)</span></>}>
            {p => (
              <Select {...p} value={gender} onChange={e => setGender(e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </Select>
            )}
          </Field>
          <div style={{ display: 'grid', gap: 6 }}>
            <label htmlFor="su-pass" className={s.label}>Password</label>
            <PasswordInput id="su-pass" value={password} onChange={setPassword} autoComplete="new-password" describedBy="su-pass-hint" />
            <span id="su-pass-hint" className={s.hint}>At least 8 characters.</span>
          </div>
          <Button type="submit" full loading={busy}>Create account</Button>
        </form>
        <p className={s.switch}>Already have an account? <button type="button" className={s.inlineLink} style={{ fontSize: 'inherit' }} onClick={() => switchTo('login')}>Sign in</button></p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className={s.title}>Sign in to BuySub</h1>
      <p className={s.sub}>Welcome back. Use the email you signed up with.</p>
      <form className={s.form} onSubmit={signIn} noValidate>
        {alerts}
        <Field label="Email">{p => <Input {...p} type="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus />}</Field>
        <div style={{ display: 'grid', gap: 6 }}>
          <div className={s.labelRow}>
            <label htmlFor="si-pass" className={s.label}>Password</label>
            <button type="button" className={s.inlineLink} onClick={() => switchTo('forgot')}>Forgot password?</button>
          </div>
          <PasswordInput id="si-pass" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        <Button type="submit" full loading={busy}>Sign in</Button>
      </form>
      <p className={s.switch}>New to BuySub? <Link href={ROUTES.signup} onClick={e => { e.preventDefault(); switchTo('signup') }}>Create an account</Link></p>
    </AuthLayout>
  )
}
