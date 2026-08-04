// ============================================================
// PHASE 3 — Partner Signup Form (split-screen layout)
// File: apps/web/app/partners/page.tsx
//
// UI redesign only. All logic, validation, state, submission,
// draft persistence, and Terms content are preserved 1:1.
// ============================================================

'use client'

import { useState, useEffect, useRef } from 'react'
import { T } from '@/lib/constants'

/* ===============================================================
   CONFIG
=============================================================== */
const API = process.env.NEXT_PUBLIC_API_BASE || 'https://buysub-api-v2.ebuka-nwaju.workers.dev'
const STORAGE_KEY = 'partner_signup_draft_v4'
const WHATSAPP_NUMBER = '2348107872916'
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1990 + 1 }, (_, i) => 1990 + i)

/* ===============================================================
   INITIAL FORM
=============================================================== */
const INITIAL_FORM = {
  legalName: '', storeName: '', address: '', lga: '', state: '',
  businessPhone: '', alternatePhone: '', businessEmail: '', cac: '',
  registrationYear: '', socialMedia: [{ platform: '', handle: '' }],
  fullName: '', contactEmail: '', contactPhone: '', gender: '', location: '',
  contactMethod: '', payoutFrequency: '', payoutMethod: '',
  bank: '', accountName: '', accountNumber: '',
  token: '', chain: '', wallet: '',
  amlAccepted: false, privacyAccepted: false, termsAccepted: false,
  password: '',
  passwordConfirm: '',
}

/* ===============================================================
   HELPERS
=============================================================== */
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const isPhoneValid = (v: string) => { const d = v.replace(/\D/g, ''); return d.startsWith('0') ? d.length === 11 : d.length === 10 }
const isAccountValid = (v: string) => /^\d{10}$/.test(v)
const isAlphanumeric = (v: string) => /^[a-z0-9]+$/i.test(v)

const formatPhoneForAPI = (v: string) => {
  if (!v) return ''
  const d = v.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('0')) return `+234${d.slice(1)}`
  if (d.length === 10) return `+234${d}`
  return v
}

const formatHandle = (v: string) => {
  if (!v) return ''
  if (v.startsWith('http') || v.startsWith('@')) return v
  return `@${v}`
}

const STEP_LABELS = ['Business Details', 'Owner Info', 'Payment & Terms', 'Account']

/* ===============================================================
   TERMS & CONDITIONS
=============================================================== */
const TermsContent = () => (
  <div style={{ padding: T.space[5], color: T.color.textSecondary, fontSize: T.text.base, lineHeight: T.leading.relaxed, overflowY: 'auto', flex: 1 }}>
    <h2 style={{ fontSize: T.text.lg, fontWeight: T.weight.bold as any, color: T.color.textPrimary, marginBottom: T.space[1] }}>BuySub Partner Program</h2>
    <p style={{ color: T.color.textMuted, fontSize: T.text.xs, marginBottom: T.space[6] }}>Terms & Conditions — Effective January 2025</p>
    {[
      ['1. Introduction', 'These Terms & Conditions ("Agreement") govern your participation in the BuySub Partner Program ("Program"). By submitting a Partner Application, you agree to be bound by this Agreement in full. BuySub reserves the right to amend these terms at any time with reasonable notice to active partners.'],
      ['2. Eligibility', 'To qualify for the Program, you must: (a) operate a legitimate retail or online business registered in Nigeria; (b) hold a valid CAC registration where applicable; (c) not be engaged in any activity that violates Nigerian law or BuySub\'s policies; and (d) receive formal approval from BuySub following review of your application.'],
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
    ].map(([title, content]) => (
      <div key={title} style={{ marginBottom: T.space[5] }}>
        <h3 style={{ fontSize: T.text.base, fontWeight: T.weight.semibold as any, color: T.color.textPrimary, marginBottom: T.space[1] }}>{title}</h3>
        <p style={{ color: T.color.textSecondary, margin: 0 }}>{content}</p>
      </div>
    ))}
  </div>
)

/* ===============================================================
   MAIN COMPONENT
=============================================================== */
export default function PartnerSignupForm() {
  const [step, setStep] = useState(1)
  const [touched, setTouched] = useState<any>({})
  const [showTerms, setShowTerms] = useState(false)
  const [sameAsLegal, setSameAsLegal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitError, setSubmitError] = useState('')
  const [submittedName, setSubmittedName] = useState('')

  const [form, setForm] = useState<any>({ ...INITIAL_FORM })

  const termsRef = useRef<HTMLDivElement>(null)
  const termsTriggerRef = useRef<HTMLElement | null>(null)

  // Terms dialog: Escape closes, focus moves in on open and back to whatever
  // opened it on close.
  useEffect(() => {
    if (!showTerms) return
    const trigger = termsTriggerRef.current
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowTerms(false) }
    document.addEventListener('keydown', onKey)
    termsRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      trigger?.focus()
    }
  }, [showTerms])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setForm((f: any) => ({ ...f, ...JSON.parse(saved) }))
      }
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)) } catch { /* */ }
  }, [form])

  const update = (k: string, v: any) => {
    setForm((f: any) => {
      const next = { ...f, [k]: v }
      if (k === 'legalName' && sameAsLegal) next.storeName = v
      return next
    })
  }
  const blur = (k: string) => setTouched((t: any) => ({ ...t, [k]: true }))

  const toggleSameAsLegal = (checked: boolean) => {
    setSameAsLegal(checked)
    if (checked) update('storeName', form.legalName)
    else update('storeName', '')
  }

  /* Validation */
  const getAllErrors = (f: any) => {
    const e: any = {}
    if (!f.legalName) e.legalName = 'Required'
    if (!f.storeName) e.storeName = 'Required'
    if (!f.address) e.address = 'Required'
    if (!f.lga) e.lga = 'Required'
    if (!f.state) e.state = 'Required'
    if (!f.businessPhone) e.businessPhone = 'Required'
    else if (!isPhoneValid(f.businessPhone)) e.businessPhone = 'Invalid (11 digits)'
    if (f.alternatePhone && !isPhoneValid(f.alternatePhone)) e.alternatePhone = 'Invalid (11 digits)'
    if (!f.businessEmail) e.businessEmail = 'Required'
    else if (!isEmail(f.businessEmail)) e.businessEmail = 'Invalid email'
    if (f.cac && !isAlphanumeric(f.cac)) e.cac = 'Alphanumeric only'
    if (!f.fullName) e.fullName = 'Required'
    if (!f.contactEmail) e.contactEmail = 'Required'
    else if (!isEmail(f.contactEmail)) e.contactEmail = 'Invalid email'
    if (!f.contactPhone) e.contactPhone = 'Required'
    else if (!isPhoneValid(f.contactPhone)) e.contactPhone = 'Invalid (11 digits)'
    if (!f.gender) e.gender = 'Required'
    if (!f.contactMethod) e.contactMethod = 'Required'
    if (!f.payoutFrequency) e.payoutFrequency = 'Required'
    if (!f.payoutMethod) e.payoutMethod = 'Required'
    if (f.payoutMethod === 'Bank Transfer') {
      if (!f.bank) e.bank = 'Required'
      if (!f.accountName) e.accountName = 'Required'
      if (!f.accountNumber) e.accountNumber = 'Required'
      else if (!isAccountValid(f.accountNumber)) e.accountNumber = 'Must be 10 digits'
    }
    if (f.payoutMethod === 'Crypto') {
      if (!f.token) e.token = 'Required'
      if (!f.chain) e.chain = 'Required'
      if (!f.wallet) e.wallet = 'Required'
    }
    if (!f.amlAccepted) e.amlAccepted = 'Required'
    if (!f.privacyAccepted) e.privacyAccepted = 'Required'
    if (!f.termsAccepted) e.termsAccepted = 'Required'
    if (!f.password) e.password = 'Required'
    else if (f.password.length < 8) e.password = 'At least 8 characters'
    if (!f.passwordConfirm) e.passwordConfirm = 'Required'
    else if (f.passwordConfirm !== f.password) e.passwordConfirm = 'Passwords do not match'
    return e
  }

  const errors = getAllErrors(form)

  const getStepFields = (s: number) => {
    if (s === 1) return ['legalName', 'storeName', 'address', 'lga', 'state', 'businessPhone', 'businessEmail', 'cac', 'alternatePhone']
    if (s === 2) return ['fullName', 'contactEmail', 'contactPhone', 'gender', 'contactMethod']
    if (s === 3) return ['payoutFrequency', 'payoutMethod', 'bank', 'accountName', 'accountNumber', 'token', 'chain', 'wallet', 'amlAccepted', 'privacyAccepted', 'termsAccepted']
    if (s === 4) return ['password', 'passwordConfirm']
    return []
  }

  const stepFields = getStepFields(step)
  const isCurrentStepValid = !stepFields.some(k => errors[k])

  const next = () => {
    const updates: any = {}; stepFields.forEach(k => (updates[k] = true))
    setTouched((prev: any) => ({ ...prev, ...updates }))
    if (isCurrentStepValid) { setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  }

  const back = () => { setStep(step - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const submit = async () => {
    const allFields = [...getStepFields(1), ...getStepFields(2), ...getStepFields(3)]
    const updates: any = {}; allFields.forEach(k => (updates[k] = true))
    setTouched(updates)
    if (Object.keys(getAllErrors(form)).length > 0) return

    setIsSubmitting(true)

    const payload = {
      legal_name: form.legalName,
      store_name: form.storeName,
      address: form.address,
      lga: form.lga,
      state: form.state,
      business_phone: formatPhoneForAPI(form.businessPhone),
      alternate_phone: form.alternatePhone ? formatPhoneForAPI(form.alternatePhone) : null,
      business_email: form.businessEmail,
      cac_number: form.cac || null,
      registration_year: form.registrationYear ? parseInt(form.registrationYear, 10) : null,
      social_media: form.socialMedia
        .filter((s: any) => s.platform && s.handle)
        .map((s: any) => `${s.platform}: ${formatHandle(s.handle)}`)
        .join('\n') || null,
      owner_name: form.fullName,
      owner_email: form.contactEmail,
      owner_phone: formatPhoneForAPI(form.contactPhone),
      gender: form.gender || null,
      owner_location: form.location || null,
      contact_method: form.contactMethod || null,
      payout_frequency: form.payoutFrequency,
      payout_method: form.payoutMethod,
      bank_name: form.payoutMethod === 'Bank Transfer' ? form.bank : null,
      account_name: form.payoutMethod === 'Bank Transfer' ? form.accountName : null,
      account_number: form.payoutMethod === 'Bank Transfer' ? form.accountNumber : null,
      crypto_token: form.payoutMethod === 'Crypto' ? form.token : null,
      crypto_chain: form.payoutMethod === 'Crypto' ? form.chain : null,
      wallet_address: form.payoutMethod === 'Crypto' ? form.wallet : null,
      aml_accepted: form.amlAccepted,
      privacy_accepted: form.privacyAccepted,
      terms_accepted: form.termsAccepted,
      password: form.password,
    }

    try {
      const res = await fetch(`${API}/v2/partners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || 'Submission failed')

      setSubmittedName(form.fullName || form.legalName)
      try { localStorage.removeItem(STORAGE_KEY) } catch { /* */ }
      setSubmitResult('success')
    } catch (error: any) {
      console.error(error)
      if (error.message?.includes('already exists') || error.message?.includes('409')) {
        setSubmitError('An account already exists for this email. Please log in or use a different email.')
      } else {
        setSubmitError(error.message || 'An unexpected error occurred.')
      }
      setSubmitResult('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setForm({ ...INITIAL_FORM }); setStep(1); setTouched({}); setSameAsLegal(false)
    setSubmitResult('idle'); setSubmitError(''); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* ───────────────────────── SUCCESS ───────────────────────── */
  if (submitResult === 'success') {
    return (
      <SplitLayout>
        <div style={{ textAlign: 'center', maxWidth: 460, margin: '0 auto', padding: `${T.space[8]} ${T.space[2]}` }}>
          <div style={{
            width: 64, height: 64, borderRadius: T.radius.full,
            background: 'rgba(var(--bs-success-rgb), 0.12)',
            color: T.color.success,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: `0 auto ${T.space[6]}`,
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div style={{ fontSize: T.text['2xl'], fontWeight: T.weight.bold as any, color: T.color.textPrimary, marginBottom: T.space[2], letterSpacing: '-0.02em' }}>
            Application submitted
          </div>
          <div style={{ fontSize: T.text.base, color: T.color.textSecondary, lineHeight: T.leading.relaxed }}>
            Thanks, {submittedName}. Your partner application is under review.
            We'll reach out within 3–5 business days.
            Once approved, you can log in at <a href="/login" style={{ color: T.color.accentOnSurface }}>app.buysub.ng/login</a>.
          </div>
          <div style={{ marginTop: T.space[8], display: 'flex', gap: T.space[3], justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
              className="bs-btn"
              style={{ ...S.btnPrimary, background: '#25D366', textDecoration: 'none', gap: T.space[2] }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.116 1.523 5.847L.057 23.57a.75.75 0 0 0 .92.92l5.723-1.466A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.93 0-3.736-.518-5.287-1.42l-.379-.225-3.932 1.007 1.007-3.932-.225-.379A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" /></svg>
              Chat on WhatsApp
            </a>
            <button type="button" className="bs-btn" onClick={resetForm} style={S.btnSecondary}>Submit another</button>
          </div>
        </div>
      </SplitLayout>
    )
  }

  /* ───────────────────────── ERROR ───────────────────────── */
  if (submitResult === 'error') {
    return (
      <SplitLayout>
        <div style={{ textAlign: 'center', maxWidth: 460, margin: '0 auto', padding: `${T.space[8]} ${T.space[2]}` }}>
          <div style={{
            width: 64, height: 64, borderRadius: T.radius.full,
            background: 'rgba(var(--bs-error-rgb), 0.12)',
            color: T.color.error,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: `0 auto ${T.space[6]}`,
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
          <div style={{ fontSize: T.text['2xl'], fontWeight: T.weight.bold as any, color: T.color.textPrimary, marginBottom: T.space[2], letterSpacing: '-0.02em' }}>
            Submission failed
          </div>
          <div style={{ fontSize: T.text.base, color: T.color.textSecondary, lineHeight: T.leading.relaxed }}>{submitError}</div>
          <button type="button" className="bs-btn" onClick={() => setSubmitResult('idle')} style={{ ...S.btnPrimary, marginTop: T.space[6] }}>Try again</button>
        </div>
      </SplitLayout>
    )
  }

  /* ───────────────────────── FORM ───────────────────────── */
  const stepTitle = ['Business details', 'Owner information', 'Payment & compliance', 'Account access'][step - 1]
  const stepEyebrow = ['Business Information', 'Personal Information', 'Payout Configuration', 'Login Credentials'][step - 1]

  return (
    <SplitLayout>
      {/* Terms modal */}
      {showTerms && (
        <div style={S.modalOverlay} onClick={() => setShowTerms(false)}>
          <div
            ref={termsRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="partner-terms-title"
            tabIndex={-1}
            style={S.modal}
            onClick={e => e.stopPropagation()}
          >
            <div style={S.modalHeader}>
              <span id="partner-terms-title" style={{ fontSize: T.text.lg, fontWeight: T.weight.semibold as any }}>
                Terms &amp; Conditions
              </span>
              <button
                type="button"
                className="bs-modal-close"
                onClick={() => setShowTerms(false)}
                aria-label="Close terms"
                style={S.modalClose}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <TermsContent />
          </div>
        </div>
      )}

      {/* Step pill */}
      <div style={S.stepPill}>Step {step} of {STEP_LABELS.length}</div>

      {/* Eyebrow + title */}
      <div style={{ marginBottom: T.space[6] }}>
        <div style={S.eyebrow}>{stepEyebrow}</div>
        <h1 style={S.pageTitle}>{stepTitle}</h1>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: T.space[2], marginBottom: T.space[8] }}
        role="group" aria-label={`Step ${step} of ${STEP_LABELS.length}: ${STEP_LABELS[step - 1]}`}>
        {STEP_LABELS.map((label, i) => {
          const s = i + 1
          const active = s === step
          const done = s < step
          return (
            <div key={s} style={{ flex: 1 }}>
              <div aria-hidden="true" style={{
                height: 3, borderRadius: T.radius.sm,
                background: done || active ? T.color.accent : T.color.borderDefault,
                transition: `background var(--bs-dur-2) var(--bs-ease-inout)`,
              }} />
              <div style={{
                fontSize: T.text['2xs'], marginTop: T.space[2],
                color: active ? T.color.textPrimary : T.color.textMuted,
                fontWeight: (active ? T.weight.semibold : T.weight.regular) as any,
              }}>
                {label}
              </div>
            </div>
          )
        })}
      </div>

      {/* Step 1: Business */}
      {step === 1 && (
        <FormStack>
          <Field label="Legal Business Name *" error={touched.legalName && errors.legalName}>
            <BsInput value={form.legalName} onChange={v => update('legalName', v)} onBlur={() => blur('legalName')} placeholder="Legal Business Name" invalid={!!(touched.legalName && errors.legalName)} />
          </Field>

          <BsCheckbox label="Store name same as legal name" checked={sameAsLegal} onChange={toggleSameAsLegal} />

          <Field label="Store Name *" error={touched.storeName && errors.storeName}>
            <BsInput value={form.storeName} onChange={v => update('storeName', v)} onBlur={() => blur('storeName')} placeholder="Store Name" disabled={sameAsLegal} invalid={!!(touched.storeName && errors.storeName)} />
          </Field>

          <Field label="Business Address *" error={touched.address && errors.address}>
            <BsInput value={form.address} onChange={v => update('address', v)} onBlur={() => blur('address')} placeholder="Business Address" invalid={!!(touched.address && errors.address)} />
          </Field>

          <FieldRow>
            <Field label="LGA *" error={touched.lga && errors.lga}>
              <BsInput value={form.lga} onChange={v => update('lga', v)} onBlur={() => blur('lga')} placeholder="Local Government Area" invalid={!!(touched.lga && errors.lga)} />
            </Field>
            <Field label="State *" error={touched.state && errors.state}>
              <BsSelect value={form.state} onChange={v => update('state', v)} onBlur={() => blur('state')}
                options={['', 'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara']}
                placeholder="Select state"
                invalid={!!(touched.state && errors.state)} />
            </Field>
          </FieldRow>

          <FieldRow>
            <Field label="Business Phone *" error={touched.businessPhone && errors.businessPhone}>
              <BsPhone value={form.businessPhone} onChange={v => update('businessPhone', v)} onBlur={() => blur('businessPhone')} placeholder="Business Phone" invalid={!!(touched.businessPhone && errors.businessPhone)} />
            </Field>
            <Field label="Alternate Phone" error={touched.alternatePhone && errors.alternatePhone}>
              <BsPhone value={form.alternatePhone} onChange={v => update('alternatePhone', v)} onBlur={() => blur('alternatePhone')} placeholder="Alternate Phone" invalid={!!(touched.alternatePhone && errors.alternatePhone)} />
            </Field>
          </FieldRow>

          <Field label="Business Email *" error={touched.businessEmail && errors.businessEmail}>
            <BsInput type="email" value={form.businessEmail} onChange={v => update('businessEmail', v)} onBlur={() => blur('businessEmail')} placeholder="Business Email" invalid={!!(touched.businessEmail && errors.businessEmail)} />
          </Field>

          <FieldRow>
            <Field label="CAC Number" error={touched.cac && errors.cac}>
              <BsInput value={form.cac} onChange={v => update('cac', v)} onBlur={() => blur('cac')} placeholder="Optional" invalid={!!(touched.cac && errors.cac)} />
            </Field>
            <Field label="Registration Year">
              <BsSelect value={form.registrationYear} onChange={v => update('registrationYear', v)}
                options={['', ...[...YEARS].reverse().map(String)]} placeholder="Select year" />
            </Field>
          </FieldRow>

          {/* Social media */}
          <Field label="Social Media Channels">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.socialMedia.map((s: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <BsSelect value={s.platform}
                      onChange={v => { const sm = [...form.socialMedia]; sm[i] = { ...sm[i], platform: v }; update('socialMedia', sm) }}
                      options={['', 'Instagram', 'Twitter/X', 'Facebook', 'TikTok', 'WhatsApp', 'LinkedIn', 'YouTube', 'Other']} placeholder="Platform" />
                  </div>
                  <div style={{ flex: 1.3 }}>
                    <BsInput value={s.handle}
                      onChange={v => { const sm = [...form.socialMedia]; sm[i] = { ...sm[i], handle: v }; update('socialMedia', sm) }}
                      placeholder="@handle or URL" />
                  </div>
                  {form.socialMedia.length > 1 && (
                    <button type="button" onClick={() => { const sm = form.socialMedia.filter((_: any, j: number) => j !== i); update('socialMedia', sm) }}
                      className="bs-icon-btn" aria-label={`Remove social channel ${i + 1}`} style={S.iconBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {form.socialMedia.length < 5 && (
                <button type="button" onClick={() => update('socialMedia', [...form.socialMedia, { platform: '', handle: '' }])}
                  className="bs-back"
                  style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', minHeight: 'var(--bs-control-lg)', background: 'transparent', border: 'none', color: T.color.accentOnSurface, cursor: 'pointer', fontSize: T.text.base, fontWeight: T.weight.medium as any, padding: `0 ${T.space[1]} 0 0`, borderRadius: T.radius.md, fontFamily: 'inherit' }}>
                  Add another channel
                </button>
              )}
            </div>
          </Field>
        </FormStack>
      )}

      {/* Step 2: Owner */}
      {step === 2 && (
        <FormStack>
          <Field label="Full Name *" error={touched.fullName && errors.fullName}>
            <BsInput value={form.fullName} onChange={v => update('fullName', v)} onBlur={() => blur('fullName')} placeholder="Full Name" invalid={!!(touched.fullName && errors.fullName)} />
          </Field>
          <Field label="Email *" error={touched.contactEmail && errors.contactEmail}>
            <BsInput type="email" value={form.contactEmail} onChange={v => update('contactEmail', v)} onBlur={() => blur('contactEmail')} placeholder="Email" invalid={!!(touched.contactEmail && errors.contactEmail)} />
          </Field>
          <Field label="Phone *" error={touched.contactPhone && errors.contactPhone}>
            <BsPhone value={form.contactPhone} onChange={v => update('contactPhone', v)} onBlur={() => blur('contactPhone')} placeholder="Phone" invalid={!!(touched.contactPhone && errors.contactPhone)} />
          </Field>
          <FieldRow>
            <Field label="Gender *" error={touched.gender && errors.gender}>
              <BsSelect value={form.gender} onChange={v => update('gender', v)} onBlur={() => blur('gender')}
                options={['', 'Male', 'Female']} placeholder="Select gender"
                invalid={!!(touched.gender && errors.gender)} />
            </Field>
            <Field label="Preferred Contact *" error={touched.contactMethod && errors.contactMethod}>
              <BsSelect value={form.contactMethod} onChange={v => update('contactMethod', v)} onBlur={() => blur('contactMethod')}
                options={['', 'WhatsApp', 'Phone Call', 'Email', 'SMS']} placeholder="Select method"
                invalid={!!(touched.contactMethod && errors.contactMethod)} />
            </Field>
          </FieldRow>
          <Field label="Location">
            <BsInput value={form.location} onChange={v => update('location', v)} placeholder="City, State" />
          </Field>
        </FormStack>
      )}

      {/* Step 3: Payment */}
      {step === 3 && (
        <FormStack>
          <FieldRow>
            <Field label="Payout Frequency *" error={touched.payoutFrequency && errors.payoutFrequency}>
              <BsSelect value={form.payoutFrequency} onChange={v => update('payoutFrequency', v)} onBlur={() => blur('payoutFrequency')}
                options={['', 'Monthly', 'Quarterly', 'Biannual', 'Annual']} placeholder="Select frequency"
                invalid={!!(touched.payoutFrequency && errors.payoutFrequency)} />
            </Field>
            <Field label="Payout Method *" error={touched.payoutMethod && errors.payoutMethod}>
              <BsSelect value={form.payoutMethod} onChange={v => update('payoutMethod', v)} onBlur={() => blur('payoutMethod')}
                options={['', 'Bank Transfer', 'Crypto']} placeholder="Select method"
                invalid={!!(touched.payoutMethod && errors.payoutMethod)} />
            </Field>
          </FieldRow>

          {form.payoutMethod === 'Bank Transfer' && (
            <>
              <Field label="Bank Name *" error={touched.bank && errors.bank}>
                <BsInput value={form.bank} onChange={v => update('bank', v)} onBlur={() => blur('bank')} placeholder="Bank Name" invalid={!!(touched.bank && errors.bank)} />
              </Field>
              <Field label="Account Name *" error={touched.accountName && errors.accountName}>
                <BsInput value={form.accountName} onChange={v => update('accountName', v)} onBlur={() => blur('accountName')} placeholder="Account Name" invalid={!!(touched.accountName && errors.accountName)} />
              </Field>
              <Field label="Account Number *" error={touched.accountNumber && errors.accountNumber}>
                <BsInput value={form.accountNumber} onChange={v => update('accountNumber', v)} onBlur={() => blur('accountNumber')} maxLength={10} placeholder="10 digit account number" invalid={!!(touched.accountNumber && errors.accountNumber)} />
              </Field>
            </>
          )}

          {form.payoutMethod === 'Crypto' && (
            <>
              <Field label="Token *" error={touched.token && errors.token}>
                <BsInput value={form.token} onChange={v => update('token', v)} onBlur={() => blur('token')} placeholder="e.g. USDT" invalid={!!(touched.token && errors.token)} />
              </Field>
              <Field label="Chain *" error={touched.chain && errors.chain}>
                <BsInput value={form.chain} onChange={v => update('chain', v)} onBlur={() => blur('chain')} placeholder="e.g. TRC-20" invalid={!!(touched.chain && errors.chain)} />
              </Field>
              <Field label="Wallet Address *" error={touched.wallet && errors.wallet}>
                <BsInput value={form.wallet} onChange={v => update('wallet', v)} onBlur={() => blur('wallet')} placeholder="Wallet address" invalid={!!(touched.wallet && errors.wallet)} />
              </Field>
            </>
          )}

          {/* Consents */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: T.space[3],
            marginTop: T.space[2],
            padding: T.space[5],
            background: T.color.bgElevated,
            borderRadius: T.radius.lg,
            border: `1px solid ${T.color.borderDefault}`,
          }}>
            <BsCheckbox label="I confirm that I comply with AML/CFT regulations and that all funds are from legitimate sources. *"
              error={touched.amlAccepted && errors.amlAccepted}
              checked={form.amlAccepted} onChange={v => update('amlAccepted', v)} />
            <BsCheckbox label="I have read and accept the BuySub Privacy Policy. *"
              error={touched.privacyAccepted && errors.privacyAccepted}
              checked={form.privacyAccepted} onChange={v => update('privacyAccepted', v)} />
            <BsCheckbox
              // This was a <span onClick> inside the checkbox's <label>, so
              // clicking through to read the terms also ticked "I accept" —
              // and it was not keyboard reachable. A <button> is interactive
              // content, so the label no longer forwards activation to the
              // checkbox, and stopPropagation guards it either way.
              label={<>I have read and accept the <button
                type="button"
                className="bs-terms-link"
                onClick={e => { e.preventDefault(); e.stopPropagation(); termsTriggerRef.current = e.currentTarget; setShowTerms(true) }}
                style={{
                  background: 'transparent', border: 'none', padding: 0,
                  font: 'inherit', color: T.color.accentOnSurface,
                  cursor: 'pointer', textDecoration: 'underline',
                  borderRadius: T.radius.sm,
                }}
              >Partner Program Terms &amp; Conditions</button>. *</>}
              error={touched.termsAccepted && errors.termsAccepted}
              checked={form.termsAccepted} onChange={v => update('termsAccepted', v)} />
          </div>
        </FormStack>
      )}

      {step === 4 && (
        <FormStack>
          <div style={{
            padding: T.space[4], borderRadius: T.radius.md,
            background: 'rgba(var(--bs-accent-rgb), 0.10)',
            border: '1px solid rgba(var(--bs-accent-rgb), 0.28)',
            fontSize: T.text.base, color: T.color.textSecondary, lineHeight: T.leading.relaxed,
          }}>
            Set a password so you can log in to your partner dashboard
            once your application is approved. You'll use <strong style={{ color: T.color.textPrimary }}>{form.contactEmail || 'your email'}</strong> to sign in.
          </div>
      
          <Field label="Choose a password *" error={touched.password && errors.password}>
            <BsInput
              type="password"
              value={form.password}
              onChange={(v: string) => update('password', v)}
              onBlur={() => blur('password')}
              placeholder="At least 8 characters"
              invalid={!!(touched.password && errors.password)}
            />
          </Field>
      
          <Field label="Confirm password *" error={touched.passwordConfirm && errors.passwordConfirm}>
            <BsInput
              type="password"
              value={form.passwordConfirm}
              onChange={(v: string) => update('passwordConfirm', v)}
              onBlur={() => blur('passwordConfirm')}
              placeholder="Type it again"
              invalid={!!(touched.passwordConfirm && errors.passwordConfirm)}
            />
          </Field>
        </FormStack>
      )}

      {/* Footer */}
      <div style={{ marginTop: T.space[8] }}>
        {step < 4 ? (
          <button type="button" className="bs-cta" style={{ ...S.btnCta, opacity: isCurrentStepValid ? 1 : 0.5, cursor: isCurrentStepValid ? 'pointer' : 'not-allowed' }}
            onClick={next} disabled={!isCurrentStepValid}>
            Continue
          </button>
        ) : (
          <button type="button" className="bs-cta" style={{ ...S.btnCta, opacity: isSubmitting ? 0.6 : isCurrentStepValid ? 1 : 0.5, cursor: (isSubmitting || !isCurrentStepValid) ? 'not-allowed' : 'pointer' }}
            onClick={submit} disabled={isSubmitting || !isCurrentStepValid}>
            {isSubmitting ? 'Submitting…' : 'Submit application'}
          </button>
        )}

        <div style={{ marginTop: T.space[4], textAlign: 'center' }}>
          {step > 1 ? (
            <button type="button" className="bs-back" onClick={back} style={S.backLink}>Go back</button>
          ) : (
            <span style={{ fontSize: T.text.xs, color: T.color.textMuted }}>
              Already a partner? <a href="mailto:partners@buysub.ng" className="bs-back" style={{ color: T.color.accentOnSurface, textDecoration: 'none', fontWeight: T.weight.medium as any, borderRadius: T.radius.md }}>Contact us</a>
            </span>
          )}
        </div>
      </div>
    </SplitLayout>
  )
}

/* ================================================================
   SPLIT LAYOUT — brand panel (left) + form panel (right)
================================================================ */
function SplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={S.page}>
      <style>{`
        .bs-input:focus, .bs-input:focus-visible,
        .bs-select:focus, .bs-select:focus-visible {
          outline: none !important;
          border-color: var(--bs-accent) !important;
          box-shadow: var(--bs-ring) !important;
        }
        /* The real checkbox is visually hidden, so the ring has to move to the
           box we draw for it. */
        .bs-checkbox-input:focus-visible + .bs-checkbox-box {
          box-shadow: var(--bs-ring);
        }
        .bs-cta:hover:not(:disabled) { background: var(--bs-accent-hover) !important; }
        .bs-back:hover { color: var(--bs-accent-hover) !important; }

        .bs-terms-link:focus-visible,
        .bs-cta:focus-visible,
        .bs-back:focus-visible,
        .bs-icon-btn:focus-visible,
        .bs-modal-close:focus-visible,
        .bs-btn:focus-visible {
          outline: none;
          box-shadow: var(--bs-ring);
        }

        @media (max-width: 900px) {
          .bs-split-brand { display: none !important; }
          .bs-split-form { width: 100% !important; padding: var(--bs-space-8) var(--bs-space-4) var(--bs-space-12) !important; }
        }
        /* Paired fields cannot share a 360px row. */
        @media (max-width: 600px) {
          .bs-field-row { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Left: brand panel ── */}
      <div className="bs-split-brand" style={S.brandPanel}>
        {/* Watermark pattern */}
        <svg
          viewBox="0 0 600 600"
          style={{
            position: 'absolute', left: '-10%', bottom: '-10%',
            width: '120%', height: '120%', opacity: 0.18,
            pointerEvents: 'none',
          }}
        >
          <defs>
            <pattern id="bs-watermark" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
              <path d="M60 15 L100 40 L100 80 L60 105 L20 80 L20 40 Z" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />
              <path d="M60 35 L85 50 L85 75 L60 90 L35 75 L35 50 Z" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="600" height="600" fill="url(#bs-watermark)" />
        </svg>

        {/* Logo / wordmark */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: T.radius.lg,
            background: T.color.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: T.text.xl, fontWeight: T.weight.bold as any,
            color: T.brandSlab.fg,
            boxShadow: T.elev.accent,
          }}>
            B
          </div>
          <div>
            <div style={{ fontSize: T.text.xl, fontWeight: T.weight.bold as any, color: T.brandSlab.fg, letterSpacing: '-0.01em', lineHeight: T.leading.tight }}>
              BuySub
            </div>
            <div style={{ fontSize: T.text['2xs'], color: T.brandSlab.fgDim, marginTop: T.space[1], letterSpacing: '0.02em' }}>
              Africa's Subscription Marketplace
            </div>
          </div>
        </div>

        {/* Tagline at bottom */}
        <div style={{ position: 'relative', marginTop: 'auto' }}>
          <div style={{ fontSize: T.text['2xl'], fontWeight: T.weight.bold as any, color: T.brandSlab.fg, lineHeight: T.leading.tight, letterSpacing: '-0.02em', marginBottom: T.space[3] }}>
            Grow with the BuySub Partner Program.
          </div>
          <div style={{ fontSize: T.text.base, color: T.brandSlab.fgDim, lineHeight: T.leading.relaxed, maxWidth: 440 }}>
            Earn commission on every qualifying sale. Flexible payouts. Full support. Join hundreds of partners already scaling with us.
          </div>
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div className="bs-split-form" style={S.formPanel}>
        <div style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   FORM PRIMITIVES
================================================================ */
function FormStack({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: T.space[5] }}>{children}</div>
}

function FieldRow({ children }: { children: React.ReactNode }) {
  // Collapses to one column under 600px via .bs-field-row — two inputs cannot
  // share a 360px row.
  return <div className="bs-field-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: T.space[3] }}>{children}</div>
}

function Field({
  label, error, children,
}: { label?: string; error?: any; children: React.ReactNode }) {
  return (
    <div>
      {label && (
        <div style={{
          fontSize: T.text.xs, fontWeight: T.weight.medium as any,
          color: T.color.textSecondary,
          marginBottom: T.space[1],
        }}>
          {label}
        </div>
      )}
      {children}
      {error && typeof error === 'string' && (
        <div role="alert" style={{ fontSize: T.text.xs, color: T.color.error, marginTop: T.space[1] }}>{error}</div>
      )}
    </div>
  )
}

type BsInputProps = {
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  type?: React.HTMLInputTypeAttribute
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  invalid?: boolean
}

function BsInput({
  value, onChange, onBlur, type = 'text', placeholder, disabled, maxLength, invalid,
}: BsInputProps) {
  return (
    <input
      className="bs-input"
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      style={{
        ...baseFieldStyle,
        borderColor: invalid ? T.color.error : 'var(--bs-border-default)',
        opacity: disabled ? 0.5 : 1,
      }}
    />
  )
}

type BsSelectProps = {
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  options: string[]
  placeholder?: string
  invalid?: boolean
}

function BsSelect({
  value, onChange, onBlur, options, placeholder, invalid,
}: BsSelectProps) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        className="bs-select"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        style={{
          ...baseFieldStyle,
          appearance: 'none',
          paddingRight: 36,
          borderColor: invalid ? T.color.error : 'var(--bs-border-default)',
          cursor: 'pointer',
          color: value ? 'var(--bs-text-primary)' : 'var(--bs-text-muted)',
        }}
      >
        {options.map((o: string, i: number) => (
          <option key={i} value={o} style={{ background: T.color.bgElevated, color: T.color.textPrimary }}>
            {o || (placeholder || 'Select…')}
          </option>
        ))}
      </select>
      <div style={{
        position: 'absolute', right: 12, top: '50%',
        transform: 'translateY(-50%)', pointerEvents: 'none',
        color: 'var(--bs-text-muted)',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  )
}

type BsPhoneProps = {
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  placeholder?: string
  invalid?: boolean
}

function BsPhone({
  value, onChange, onBlur, placeholder, invalid,
}: BsPhoneProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      // No fixed height here: the border would eat 2px off the inner input and
      // drop the actual tap target to 42. The input sets the height instead.
      background: T.color.bgInput,
      border: `1px solid ${invalid ? T.color.error : T.color.borderDefault}`,
      borderRadius: T.radius.md,
      overflow: 'hidden',
      transition: `border-color var(--bs-dur-1) var(--bs-ease-inout), box-shadow var(--bs-dur-1) var(--bs-ease-inout)`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: `0 ${T.space[3]}`,
        borderRight: `1px solid ${T.color.borderDefault}`,
        fontSize: T.text.base, color: T.color.textSecondary,
      }}>
        <div style={{
          width: 22, height: 16, borderRadius: 3,
          background: 'linear-gradient(to right, #008751 33.3%, #fff 33.3% 66.6%, #008751 66.6%)',
          flexShrink: 0,
        }} />
        <span style={{ fontWeight: 500 }}>+234</span>
      </div>
      <input
        className="bs-input"
        type="tel"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        style={{
          flex: 1, height: 'var(--bs-control-lg)', padding: `0 ${T.space[3]}`,
          background: 'transparent', border: 'none',
          color: T.color.textPrimary,
          fontSize: T.text.base, outline: 'none',
          fontFamily: 'inherit', minWidth: 0,
        }}
      />
    </div>
  )
}

type BsCheckboxProps = {
  label: React.ReactNode
  error?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function BsCheckbox({
  label, error, checked, onChange,
}: BsCheckboxProps) {
  return (
    <label style={{
      display: 'flex', gap: T.space[3], alignItems: 'flex-start', cursor: 'pointer',
      fontSize: T.text.base, color: T.color.textPrimary,
      minHeight: 'var(--bs-control-lg)', paddingTop: T.space[2], paddingBottom: T.space[2],
    }}>
      <input
        className="bs-checkbox-input"
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        aria-invalid={!!error}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
      <span
        className="bs-checkbox-box"
        aria-hidden="true"
        style={{
          width: 20, height: 20, borderRadius: T.radius.sm,
          border: `1.5px solid ${error ? T.color.error : (checked ? T.color.accent : T.color.borderStrong)}`,
          background: checked ? T.color.accent : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 1,
          transition: `background var(--bs-dur-1) var(--bs-ease-inout), border-color var(--bs-dur-1) var(--bs-ease-inout)`,
        }}
      >
        {checked && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span style={{ lineHeight: T.leading.snug }}>
        {label}
        {error && <span style={{ color: T.color.error, fontSize: T.text.xs, marginLeft: T.space[2] }}>{error}</span>}
      </span>
    </label>
  )
}

/* ================================================================
   STYLES
================================================================ */
const baseFieldStyle: React.CSSProperties = {
  height: 'var(--bs-control-lg)', width: '100%',
  padding: `0 ${T.space[3]}`,
  background: T.color.bgInput,
  border: `1px solid ${T.color.borderDefault}`,
  borderRadius: T.radius.md,
  color: T.color.textPrimary,
  fontSize: T.text.base,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  outline: 'none',
  transition: `border-color var(--bs-dur-1) var(--bs-ease-inout), box-shadow var(--bs-dur-1) var(--bs-ease-inout)`,
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    background: T.color.bgBase,
    color: T.color.textPrimary,
    fontFamily: 'inherit',
  },
  // Deliberately dark in BOTH themes — see the --bs-brand-slab-* note in
  // lib/constants.ts. Nothing here may resolve from a token that flips.
  brandPanel: {
    width: '42%',
    minHeight: '100dvh',
    position: 'sticky',
    top: 0,
    padding: `${T.space[8]} ${T.space[12]}`,
    background: T.brandSlab.bg,
    borderRight: `1px solid ${T.brandSlab.border}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  formPanel: {
    width: '58%',
    flex: 1,
    padding: `${T.space[12]} ${T.space[4]} ${T.space[12]}`,
  },
  stepPill: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 28,
    padding: `0 ${T.space[3]}`,
    borderRadius: T.radius.full,
    background: 'rgba(var(--bs-accent-rgb), 0.15)',
    border: '1px solid rgba(var(--bs-accent-rgb), 0.45)',
    color: T.color.accentOnSurface,
    fontSize: T.text.xs,
    fontWeight: T.weight.semibold as any,
    marginBottom: T.space[5],
  },
  eyebrow: {
    fontSize: T.text.xs,
    color: T.color.textSecondary,
    marginBottom: T.space[1],
    fontWeight: T.weight.regular as any,
  },
  pageTitle: {
    fontSize: T.text['3xl'],
    fontWeight: T.weight.bold as any,
    color: T.color.textPrimary,
    letterSpacing: '-0.025em',
    lineHeight: T.leading.tight,
    margin: 0,
  },
  btnCta: {
    width: '100%',
    height: 'var(--bs-control-xl)',
    padding: `0 ${T.space[6]}`,
    borderRadius: T.radius.md,
    background: T.color.accentFill,
    border: 'none',
    color: '#fff',
    fontSize: T.text.base,
    fontWeight: T.weight.semibold as any,
    transition: `background var(--bs-dur-1) var(--bs-ease-inout), opacity var(--bs-dur-1) var(--bs-ease-inout)`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: T.space[2],
    fontFamily: 'inherit',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'var(--bs-control-lg)',
    padding: `0 ${T.space[4]}`,
    borderRadius: T.radius.md,
    background: 'transparent',
    border: 'none',
    color: T.color.accentOnSurface,
    fontSize: T.text.base,
    fontWeight: T.weight.medium as any,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: `color var(--bs-dur-1) var(--bs-ease-inout)`,
  },
  btnPrimary: {
    minHeight: 'var(--bs-control-lg)', padding: `0 ${T.space[6]}`,
    borderRadius: T.radius.md,
    background: T.color.accentFill, border: 'none', color: '#fff',
    cursor: 'pointer', fontSize: T.text.base,
    fontWeight: T.weight.semibold as any,
    fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
  btnSecondary: {
    minHeight: 'var(--bs-control-lg)', padding: `0 ${T.space[5]}`,
    borderRadius: T.radius.md,
    background: 'transparent',
    border: `1px solid ${T.color.borderDefault}`,
    color: T.color.textSecondary,
    cursor: 'pointer', fontSize: T.text.base,
    fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
  iconBtn: {
    width: 'var(--bs-control-lg)', height: 'var(--bs-control-lg)',
    borderRadius: T.radius.md,
    background: 'transparent',
    border: `1px solid ${T.color.borderDefault}`,
    color: T.color.textMuted,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    fontFamily: 'inherit',
  },
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: T.space[5],
  },
  modal: {
    background: T.color.bgCard,
    borderRadius: T.radius.xl,
    border: `1px solid ${T.color.borderDefault}`,
    boxShadow: T.elev[3],
    maxWidth: 600, width: '100%', maxHeight: '80dvh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    outline: 'none',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: T.space[3],
    padding: `${T.space[4]} ${T.space[5]}`,
    borderBottom: `1px solid ${T.color.borderSubtle}`,
  },
  modalClose: {
    width: 'var(--bs-control-lg)', height: 'var(--bs-control-lg)',
    borderRadius: T.radius.md,
    background: 'transparent',
    border: `1px solid ${T.color.borderDefault}`,
    color: T.color.textMuted,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    fontFamily: 'inherit',
  },
}
