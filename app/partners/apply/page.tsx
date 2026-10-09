'use client'

// /partners/apply: the partner application. One short form: the store, the
// owner, where they sell, a password and the terms. Signed in, it applies on
// that account instead: no email or password fields, same login afterwards
// (POST /v2/partners with the bearer token). Business address, CAC
// details and payout setup are added in the partner portal after approval
// (PartnerProfile); payouts wait for payout details and the AML declaration
// (buysub-api-deploy/src/features/payouts.ts). The landing page is /partners.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button, ButtonLink, Checkbox, EmptyState, Field, Input, Modal, ModalBody, Select, Spinner } from '@/components/ui'
import { AuthAlert, AuthLayout, PasswordInput, authStyles as s } from '@/components/auth/AuthLayout'
import { useSiteStatus } from '@/lib/siteStatus'
import { loadPartner, signOut, useSession, type SessionUser } from '@/lib/useSession'
import { authFetch } from '@/lib/apiAuth'
import { API_BASE } from '@/lib/config'
import { EXTERNAL, ROUTES } from '@/lib/routes'

const STORAGE_KEY = 'partner_apply_draft_v5'
// The 4-step form's draft. Its matching fields carry over once, then it's removed.
const OLD_KEY = 'partner_signup_draft_v4'
const WHATSAPP_NUMBER = '2348107872916'

const CHANNELS = ['Physical shop', 'Instagram', 'WhatsApp', 'TikTok', 'X (Twitter)', 'Facebook', 'Website', 'Other']

type Form = { storeName: string; name: string; email: string; phone: string; channel: string; handle: string; accepted: boolean }
const EMPTY: Form = { storeName: '', name: '', email: '', phone: '', channel: '', handle: '', accepted: false }

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const phoneDigits = (v: string) => v.replace(/\D/g, '')
const isPhone = (v: string) => { const d = phoneDigits(v); return d.startsWith('234') ? d.length === 13 : d.startsWith('0') ? d.length === 11 : d.length === 10 }
const toE164 = (v: string) => {
  const d = phoneDigits(v)
  if (d.startsWith('234')) return `+${d}`
  if (d.startsWith('0')) return `+234${d.slice(1)}`
  return `+234${d}`
}
const SOCIAL = new Set(['Instagram', 'TikTok', 'X (Twitter)'])
const handleFor = (channel: string, v: string) => {
  const h = v.trim()
  return SOCIAL.has(channel) && !h.startsWith('@') && !/^https?:/i.test(h) ? `@${h}` : h
}

function errorsOf(f: Form, password: string, account: boolean) {
  const e: Partial<Record<keyof Form | 'password', string>> = {}
  if (!f.storeName.trim()) e.storeName = 'Enter your store’s name'
  if (!f.name.trim()) e.name = 'Enter your name'
  if (account) { /* the account's email */ }
  else if (!f.email.trim()) e.email = 'Enter your email'
  else if (!isEmail(f.email)) e.email = 'Enter a valid email'
  if (!f.phone.trim()) e.phone = 'Enter your phone number'
  else if (!isPhone(f.phone)) e.phone = 'Enter an 11-digit Nigerian number'
  if (!f.channel) e.channel = 'Choose where you sell'
  if (!f.handle.trim()) e.handle = f.channel === 'Physical shop' ? 'Enter the shop’s address' : 'Enter your handle or link'
  if (!account && password.length < 8) e.password = 'Use at least 8 characters'
  if (!f.accepted) e.accepted = 'Accept the terms to apply'
  return e
}

const APPLY_NEXT = `${ROUTES.login}?next=${encodeURIComponent('/partners/apply')}`

/** `account`: the signed-in user, when applying on an existing account. */
function PartnerApplyForm({ account }: { account: SessionUser | null }) {
  const [form, setForm] = useState<Form>(EMPTY)
  const [password, setPassword] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<React.ReactNode>('')
  const [done, setDone] = useState<{ name: string; email: string; sent: boolean; account: boolean } | null>(null)
  const [terms, setTerms] = useState(false)
  const loaded = useRef(false)

  // Restore the draft (never the password). Read after mount, not in render,
  // and once: a fresh session object must not reset what's been typed.
  useEffect(() => {
    if (loaded.current) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setForm(f => ({ ...f, ...JSON.parse(saved), accepted: false }))
      else {
        const old = localStorage.getItem(OLD_KEY)
        if (old) {
          const o = JSON.parse(old)
          const social = Array.isArray(o.socialMedia) ? o.socialMedia.find((x: any) => x?.platform && x?.handle) : null
          setForm(f => ({
            ...f,
            storeName: o.storeName || o.legalName || '', name: o.fullName || '', email: o.contactEmail || '', phone: o.contactPhone || '',
            channel: social ? (CHANNELS.find(c => c.startsWith(social.platform.split('/')[0])) || 'Other') : '',
            handle: social?.handle || '',
          }))
        }
        localStorage.removeItem(OLD_KEY)
      }
    } catch { /* storage off: start empty */ }
    // Signed in: fill the owner from the account where the draft has nothing.
    if (account) setForm(f => ({ ...f, name: f.name || account.full_name || '', phone: f.phone || account.phone || '' }))
    loaded.current = true
  }, [account])

  useEffect(() => {
    if (!loaded.current) return
    const { accepted: _a, ...draft } = form
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)) } catch { /* */ }
  }, [form])

  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => { setForm(f => ({ ...f, [k]: v })); setError('') }
  const errors = errorsOf(form, password, !!account)
  const show = (k: keyof typeof errors) => (tried ? errors[k] : undefined)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (Object.keys(errors).length) {
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]')
      first?.focus()
      return
    }
    setBusy(true); setError('')
    const body = {
      store_name: form.storeName.trim(),
      owner_name: form.name.trim(),
      owner_phone: toE164(form.phone),
      social_media: `${form.channel}: ${handleFor(form.channel, form.handle)}`,
      terms_accepted: true,
      privacy_accepted: true,
      ...(account ? {} : { owner_email: form.email.trim(), password }),
    }
    try {
      let status: number, ok: boolean, data: any, message: string | undefined
      if (account) {
        const r = await authFetch<any>('/v2/partners', { method: 'POST', body, redirectOnAuth: false })
        status = r.status; ok = r.ok; data = r.data; message = r.error
      } else {
        const res = await fetch(`${API_BASE}/v2/partners`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        const json = await res.json().catch(() => ({}))
        status = res.status; ok = res.ok && !!json.ok; data = json.data; message = json.error
      }
      if (!ok) {
        if (status === 409 && !account) setError(<>An account already exists for this email. <Link href={APPLY_NEXT}>Sign in to apply with it</Link>, or use a different email.</>)
        else if (status === 401 || status === 403) setError(<>Your session has ended. <Link href={APPLY_NEXT}>Sign in again</Link> to apply.</>)
        else setError(message || 'We couldn’t send your application. Try again.')
        return
      }
      try { localStorage.removeItem(STORAGE_KEY) } catch { /* */ }
      setDone({ name: form.name.trim().split(/\s+/)[0], email: account?.email || form.email.trim(), sent: data?.verification_email_sent !== false, account: !!account })
    } catch {
      setError('We couldn’t reach BuySub. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AuthLayout legal={false}>
        <h1 className={s.title}>Application sent</h1>
        <p className={s.sub}>Thanks, {done.name}.</p>
        <div className={s.form}>
          {done.account ? (
            <>
              <AuthAlert kind="ok">Your application is in, on your BuySub account <b>{done.email}</b>.</AuthAlert>
              <p className={s.sub}>We review applications within 3 to 5 business days. Once you’re approved, the partner portal opens from your account menu, with your referral link and payout settings. You’ll keep signing in as you do now.</p>
              <ButtonLink href={ROUTES.partner.home} full>See your application</ButtonLink>
              <ButtonLink href={`https://wa.me/${WHATSAPP_NUMBER}`} external variant="secondary" full>Questions? Chat on WhatsApp</ButtonLink>
            </>
          ) : <>
          {done.sent ? (
            <AuthAlert kind="ok">We’ve emailed a verification link to <b>{done.email}</b>. Open it so we can review your application.</AuthAlert>
          ) : (
            <AuthAlert kind="error">We couldn’t send your verification email. Go to <Link href={ROUTES.login}>sign in</Link>, enter your details and choose “Resend verification email”.</AuthAlert>
          )}
          <p className={s.sub}>We review applications within 3 to 5 business days of verification. Once you’re approved, sign in to get your referral link and add where we should send your payouts.</p>
          <ButtonLink href={`https://wa.me/${WHATSAPP_NUMBER}`} external variant="secondary" full>Questions? Chat on WhatsApp</ButtonLink>
          </>}
        </div>
      </AuthLayout>
    )
  }

  const handleLabel = form.channel === 'Physical shop' ? 'Shop address' : form.channel === 'Website' ? 'Website link' : 'Handle or link'
  const handlePlaceholder = form.channel === 'Physical shop' ? 'e.g. Shop 12, Computer Village, Ikeja' : form.channel === 'Website' ? 'https://' : form.channel === 'WhatsApp' ? 'Your business WhatsApp number' : '@yourstore'

  return (
    <AuthLayout wide legal={false}>
      <h1 className={s.title}>Apply to become a partner</h1>
      <p className={s.sub}>Takes about a minute. You’ll add payout details after you’re approved.</p>
      <form className={s.form} onSubmit={submit} noValidate>
        {error && <AuthAlert kind="error">{error}</AuthAlert>}
        {account && (
          <p className={s.hint} style={{ fontSize: 'var(--bs-text-sm)' }}>
            Applying with your BuySub account, <b style={{ color: 'var(--bs-text-primary)' }}>{account.email}</b>. You’ll keep the same sign-in.{' '}
            <button type="button" className={s.inlineLink} onClick={() => signOut('/partners/apply')}>Use a different email</button>
          </p>
        )}
        <Field label="Store name" error={show('storeName')}>
          {p => <Input {...p} autoComplete="organization" value={form.storeName} onChange={e => set('storeName')(e.target.value)} autoFocus />}
        </Field>
        <Field label="Your name" error={show('name')}>
          {p => <Input {...p} autoComplete="name" value={form.name} onChange={e => set('name')(e.target.value)} />}
        </Field>
        {account ? (
          <Field label="Phone" error={show('phone')}>
            {p => <Input {...p} type="tel" autoComplete="tel" inputMode="tel" placeholder="0801 234 5678" value={form.phone} onChange={e => set('phone')(e.target.value)} />}
          </Field>
        ) : (
          <div className={s.row2}>
            <Field label="Email" hint="You’ll sign in with this." error={show('email')}>
              {p => <Input {...p} type="email" autoComplete="email" inputMode="email" value={form.email} onChange={e => set('email')(e.target.value)} />}
            </Field>
            <Field label="Phone" error={show('phone')}>
              {p => <Input {...p} type="tel" autoComplete="tel" inputMode="tel" placeholder="0801 234 5678" value={form.phone} onChange={e => set('phone')(e.target.value)} />}
            </Field>
          </div>
        )}
        <div className={s.row2}>
          <Field label="Where you sell" error={show('channel')}>
            {p => (
              <Select {...p} value={form.channel} onChange={e => set('channel')(e.target.value)}>
                <option value="">Choose…</option>
                {CHANNELS.map(c => <option key={c}>{c}</option>)}
              </Select>
            )}
          </Field>
          <Field label={handleLabel} error={show('handle')}>
            {p => <Input {...p} value={form.handle} placeholder={handlePlaceholder} onChange={e => set('handle')(e.target.value)} />}
          </Field>
        </div>
        {!account && <div style={{ display: 'grid', gap: 6 }}>
          <label htmlFor="pa-pass" className={s.label}>Password</label>
          <PasswordInput id="pa-pass" value={password} onChange={v => { setPassword(v); setError('') }} autoComplete="new-password"
            describedBy="pa-pass-hint" invalid={!!show('password')} />
          <span id="pa-pass-hint" className={show('password') ? s.hintError : s.hint}>{show('password') || 'At least 8 characters. You’ll use it to sign in to the partner portal.'}</span>
        </div>}
        <div style={{ display: 'grid', gap: 6 }}>
          <Checkbox checked={form.accepted} onChange={e => set('accepted')(e.target.checked)} aria-invalid={show('accepted') ? true : undefined}
            aria-describedby={show('accepted') ? 'pa-terms-err' : undefined}
            label={<>I accept the <button type="button" className={s.inlineLink} style={{ fontSize: 'inherit', textDecoration: 'underline' }}
              onClick={e => { e.preventDefault(); e.stopPropagation(); setTerms(true) }}>partner terms</button> and the{' '}
              <a href={EXTERNAL.privacy} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ textDecoration: 'underline' }}>privacy policy</a>.</>} />
          {show('accepted') && <span id="pa-terms-err" className={s.hintError}>{show('accepted')}</span>}
        </div>
        <Button type="submit" full loading={busy}>Send application</Button>
      </form>
      {!account && <p className={s.switch}>Already have a BuySub account? <Link href={APPLY_NEXT}>Sign in to apply with it</Link></p>}

      <Modal open={terms} onClose={() => setTerms(false)} title="Partner programme terms" wide>
        <ModalBody><TermsContent /></ModalBody>
      </Modal>
    </AuthLayout>
  )
}

// From the 4-step form. Clause 2 updated 9 October 2026 for the short form:
// CAC registration is optional, and payout details plus the AML declaration
// are required before a payout rather than at application.
const TERMS: [string, string][] = [
  ['1. Introduction', 'These Terms & Conditions ("Agreement") govern your participation in the BuySub Partner Program ("Program"). By submitting a Partner Application, you agree to be bound by this Agreement in full. BuySub reserves the right to amend these terms at any time with reasonable notice to active partners.'],
  ['2. Eligibility', 'To qualify for the Program, you must: (a) operate a legitimate retail or online business in Nigeria, such as a gadget store, whether or not it is registered with the Corporate Affairs Commission (CAC); (b) if your business is registered with the CAC, provide accurate registration details when asked; (c) not be engaged in any activity that violates Nigerian law or BuySub\'s policies; and (d) receive formal approval from BuySub following review of your application. Before receiving any payout, you must provide valid payout details and confirm the anti-money-laundering declaration in clause 8.'],
  ['3. Partner Obligations', 'As a Partner, you agree to: (a) accurately represent BuySub products and services to customers; (b) not misrepresent pricing, availability, or features; (c) refrain from spam or deceptive marketing; (d) promptly notify BuySub of complaints; (e) comply with all applicable Nigerian consumer protection and data privacy laws; and (f) keep your account credentials confidential.'],
  ['4. Commission & Payouts', 'Partners earn a commission on qualifying sales. Commission rates are communicated at onboarding and may be revised with 30 days\' notice. Payouts are processed on the elected schedule. BuySub reserves the right to withhold payment pending fraud investigation. Commissions are forfeited on reversed or refunded orders.'],
  ['5. Prohibited Activities', 'Partners must not: (a) sell or transfer subscription credentials; (b) facilitate unauthorized account sharing; (c) offer unauthorized discounts; (d) engage in money laundering; or (e) disparage BuySub in any public forum.'],
  ['6. Intellectual Property', 'BuySub grants a limited, non-exclusive, revocable licence to use BuySub\'s name, logo, and approved materials solely for promoting the Program.'],
  ['7. Data & Privacy', 'You agree to handle customer data in accordance with Nigeria\'s Data Protection Act 2023. Customer data obtained through the Program may not be used for any other purpose.'],
  ['8. AML Compliance', 'Partners confirm they are not subject to any sanctions and that funds are from legitimate sources. BuySub may terminate immediately and report suspicious activity to NFIU where required by law.'],
  ['9. Term & Termination', 'BuySub may suspend or terminate participation immediately for material breach, complaints, or fraud. You may terminate with 14 days\' notice. Outstanding commissions are paid within 30 days.'],
  ['10. Limitation of Liability', 'BuySub\'s total liability shall not exceed commissions paid in the three months preceding the claim.'],
  ['11. Governing Law', 'This Agreement is governed by Nigerian law. Disputes are subject to the exclusive jurisdiction of Lagos State courts.'],
  ['12. Contact', `For questions, contact BuySub via WhatsApp at +${WHATSAPP_NUMBER} or through the contact form on the BuySub website.`],
]

function TermsContent() {
  return (
    <div style={{ display: 'grid', gap: 'var(--bs-space-4)', fontSize: 'var(--bs-text-md)', lineHeight: 'var(--bs-leading-relaxed)', color: 'var(--bs-text-secondary)' }}>
      <p style={{ fontSize: 'var(--bs-text-xs)', color: 'var(--bs-text-muted)' }}>Effective January 2025. Last updated 9 October 2026.</p>
      {TERMS.map(([title, body]) => (
        <div key={title}>
          <h3 style={{ fontSize: 'var(--bs-text-md)', fontWeight: 'var(--bs-weight-semibold)', color: 'var(--bs-text-primary)', marginBottom: 4 }}>{title}</h3>
          <p>{body}</p>
        </div>
      ))}
    </div>
  )
}

// Admins can close applications (Settings → Service switches); the API
// refuses them too. A saved draft stays in this browser for when they reopen.
export default function PartnerApplyPage() {
  const status = useSiteStatus()
  if (status.loaded && !status.services.partner_applications) {
    return (
      <AuthLayout legal={false}>
        <EmptyState icon="users" title="Applications are closed for now"
          action={<ButtonLink href={`${ROUTES.login}?next=%2Fpartner`} variant="secondary">Partner sign in</ButtonLink>}>
          We’re not taking new partner applications at the moment. Please check back soon.
        </EmptyState>
      </AuthLayout>
    )
  }
  return <ApplyGate />
}

/** Waits for the session, then applies on the account if signed in. */
function ApplyGate() {
  const session = useSession()
  const signedIn = session.status === 'signed_in' && !!session.user
  useEffect(() => { if (signedIn) loadPartner() }, [signedIn])

  if (session.status === 'loading' || (signedIn && session.partner === null)) {
    return (
      <AuthLayout legal={false}>
        <div className={s.checking}><Spinner size={18} /> Checking your session</div>
      </AuthLayout>
    )
  }
  if (signedIn && session.partner) {
    const approved = session.partner.status === 'approved'
    return (
      <AuthLayout legal={false}>
        <h1 className={s.title}>{approved ? 'You’re already a partner' : 'You’ve already applied'}</h1>
        <p className={s.sub}>{approved ? 'Your referral link and earnings are in the partner portal.' : 'Your application is on this account. Its status is in the partner portal.'}</p>
        <div className={s.form}>
          <ButtonLink href={ROUTES.partner.home} full>{approved ? 'Open the partner portal' : 'See your application'}</ButtonLink>
        </div>
      </AuthLayout>
    )
  }
  return <PartnerApplyForm account={signedIn ? session.user : null} />
}
