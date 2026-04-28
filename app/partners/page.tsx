// ============================================================
// PHASE 3 — Partner Signup Form (split-screen layout)
// File: apps/web/app/partners/page.tsx
//
// UI redesign only. All logic, validation, state, submission,
// draft persistence, and Terms content are preserved 1:1.
// ============================================================

'use client'

import { useState, useEffect } from 'react'

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
  <div style={{ padding: '24px 28px', color: 'var(--bs-text-secondary, #a0a0b0)', fontSize: 13, lineHeight: 1.8, overflowY: 'auto', flex: 1 }}>
    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--bs-text-primary, #e8e8ec)', marginBottom: 4 }}>BuySub Partner Program</h2>
    <p style={{ color: 'var(--bs-text-muted, #6b6b7e)', fontSize: 12, marginBottom: 24 }}>Terms & Conditions — Effective January 2025</p>
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
      <div key={title} style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--bs-text-primary, #e8e8ec)', marginBottom: 6 }}>{title}</h3>
        <p style={{ color: 'var(--bs-text-secondary, #a0a0b0)', margin: 0 }}>{content}</p>
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
        <div style={{ textAlign: 'center', maxWidth: 460, margin: '0 auto', padding: '40px 8px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(34,197,94,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--bs-text-primary, #e8e8ec)', marginBottom: 10, letterSpacing: '-0.02em' }}>
            Application submitted
          </div>
          <div style={{ fontSize: 14, color: 'var(--bs-text-secondary, #a0a0b0)', lineHeight: 1.7 }}>
            Thanks, {submittedName}. Your partner application is under review.
            We'll reach out within 3–5 business days.
            Once approved, you can log in at <a href="/login" style={{ color: '#7C5CFF' }}>app.buysub.ng/login</a>.
          </div>
          <div style={{ marginTop: 32, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
              style={{ ...S.btnPrimary, background: '#25D366', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.116 1.523 5.847L.057 23.57a.75.75 0 0 0 .92.92l5.723-1.466A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.93 0-3.736-.518-5.287-1.42l-.379-.225-3.932 1.007 1.007-3.932-.225-.379A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" /></svg>
              Chat on WhatsApp
            </a>
            <button onClick={resetForm} style={S.btnSecondary}>Submit another</button>
          </div>
        </div>
      </SplitLayout>
    )
  }

  /* ───────────────────────── ERROR ───────────────────────── */
  if (submitResult === 'error') {
    return (
      <SplitLayout>
        <div style={{ textAlign: 'center', maxWidth: 460, margin: '0 auto', padding: '40px 8px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(239,68,68,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--bs-text-primary, #e8e8ec)', marginBottom: 10, letterSpacing: '-0.02em' }}>
            Submission failed
          </div>
          <div style={{ fontSize: 14, color: 'var(--bs-text-secondary, #a0a0b0)', lineHeight: 1.7 }}>{submitError}</div>
          <button onClick={() => setSubmitResult('idle')} style={{ ...S.btnPrimary, marginTop: 28 }}>Try again</button>
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
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Terms & Conditions</span>
              <button onClick={() => setShowTerms(false)} style={S.modalClose}>×</button>
            </div>
            <TermsContent />
          </div>
        </div>
      )}

      {/* Step pill */}
      <div style={S.stepPill}>Step {step}/3</div>

      {/* Eyebrow + title */}
      <div style={{ marginBottom: 28 }}>
        <div style={S.eyebrow}>{stepEyebrow}</div>
        <h1 style={S.pageTitle}>{stepTitle}</h1>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
        {STEP_LABELS.map((label, i) => {
          const s = i + 1
          const active = s === step
          const done = s < step
          return (
            <div key={s} style={{ flex: 1 }}>
              <div style={{
                height: 3, borderRadius: 2,
                background: done || active ? '#7C5CFF' : 'var(--bs-border-default, #27272e)',
                transition: 'background .2s',
              }} />
              <div style={{
                fontSize: 11, marginTop: 8,
                color: active ? 'var(--bs-text-primary, #e8e8ec)' : 'var(--bs-text-muted, #6b6b7e)',
                fontWeight: active ? 600 : 400,
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
                      style={S.iconBtn}>×</button>
                  )}
                </div>
              ))}
              {form.socialMedia.length < 5 && (
                <button type="button" onClick={() => update('socialMedia', [...form.socialMedia, { platform: '', handle: '' }])}
                  style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: '#7C5CFF', cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: '4px 0' }}>
                  + Add channel
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
            display: 'flex', flexDirection: 'column', gap: 14,
            marginTop: 8,
            padding: '18px 20px',
            background: 'var(--bs-bg-elevated, #18181c)',
            borderRadius: 12,
            border: '1px solid var(--bs-border-default, #27272e)',
          }}>
            <BsCheckbox label="I confirm that I comply with AML/CFT regulations and that all funds are from legitimate sources. *"
              error={touched.amlAccepted && errors.amlAccepted}
              checked={form.amlAccepted} onChange={v => update('amlAccepted', v)} />
            <BsCheckbox label="I have read and accept the BuySub Privacy Policy. *"
              error={touched.privacyAccepted && errors.privacyAccepted}
              checked={form.privacyAccepted} onChange={v => update('privacyAccepted', v)} />
            <BsCheckbox
              label={<>I have read and accept the <span style={{ color: '#7C5CFF', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setShowTerms(true)}>Partner Program Terms & Conditions</span>. *</>}
              error={touched.termsAccepted && errors.termsAccepted}
              checked={form.termsAccepted} onChange={v => update('termsAccepted', v)} />
          </div>
        </FormStack>
      )}

      {step === 4 && (
        <FormStack>
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            background: 'rgba(124,92,255,0.08)',
            border: '1px solid rgba(124,92,255,0.25)',
            fontSize: 13, color: 'var(--bs-text-secondary, #a0a0b0)', lineHeight: 1.6,
          }}>
            Set a password so you can log in to your partner dashboard
            once your application is approved. You'll use <strong style={{ color: 'var(--bs-text-primary, #e8e8ec)' }}>{form.contactEmail || 'your email'}</strong> to sign in.
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
      <div style={{ marginTop: 36 }}>
        {step < 4 ? (
          <button style={{ ...S.btnCta, opacity: isCurrentStepValid ? 1 : 0.5, cursor: isCurrentStepValid ? 'pointer' : 'not-allowed' }}
            onClick={next} disabled={!isCurrentStepValid}>
            Continue <span style={{ marginLeft: 6 }}>→</span>
          </button>
        ) : (
          <button style={{ ...S.btnCta, opacity: isSubmitting ? 0.6 : isCurrentStepValid ? 1 : 0.5, cursor: (isSubmitting || !isCurrentStepValid) ? 'not-allowed' : 'pointer' }}
            onClick={submit} disabled={isSubmitting || !isCurrentStepValid}>
            {isSubmitting ? 'Submitting…' : <>Submit <span style={{ marginLeft: 6 }}>→</span></>}
          </button>
        )}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          {step > 1 ? (
            <button type="button" onClick={back} style={S.backLink}>Go back</button>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--bs-text-muted, #6b6b7e)' }}>
              Already a partner? <a href="mailto:partners@buysub.ng" style={{ color: '#7C5CFF', textDecoration: 'none', fontWeight: 500 }}>Contact us</a>
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
        @media (max-width: 900px) {
          .bs-split-brand { display: none !important; }
          .bs-split-form { width: 100% !important; padding: 56px 20px 80px !important; }
        }
        .bs-input:focus, .bs-input:focus-visible,
        .bs-select:focus, .bs-select:focus-visible {
          outline: none !important;
          border-color: #7C5CFF !important;
          box-shadow: 0 0 0 3px rgba(124,92,255,0.15) !important;
        }
        .bs-cta:hover:not(:disabled) { background: #6B4EE6 !important; }
        .bs-back:hover { color: #9177ff !important; }
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

        {/* Accent glow */}
        <div style={{
          position: 'absolute',
          top: '-20%', left: '-10%',
          width: '60%', height: '60%',
          background: 'radial-gradient(circle, rgba(124,92,255,0.4) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }} />

        {/* Logo / wordmark */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: '#7C5CFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#fff',
            boxShadow: '0 8px 28px rgba(124,92,255,0.45)',
          }}>
            B
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1 }}>
              BuySub
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4, letterSpacing: '0.02em' }}>
              Africa's Subscription Marketplace
            </div>
          </div>
        </div>

        {/* Tagline at bottom */}
        <div style={{ position: 'relative', marginTop: 'auto' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1.25, letterSpacing: '-0.02em', marginBottom: 14 }}>
            Grow with the BuySub Partner Program.
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, maxWidth: 440 }}>
            Earn commission on every qualifying sale. Flexible payouts. Full support. Join hundreds of partners already scaling with us.
          </div>
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div className="bs-split-form" style={S.formPanel}>
        <div style={{ maxWidth: '80%', margin: '0 auto', width: '100%' }}>
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
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>{children}</div>
}

function Field({
  label, error, children,
}: { label?: string; error?: any; children: React.ReactNode }) {
  return (
    <div>
      {label && (
        <div style={{
          fontSize: 13, fontWeight: 500,
          color: 'var(--bs-text-primary, #e8e8ec)',
          marginBottom: 8,
        }}>
          {label}
        </div>
      )}
      {children}
      {error && typeof error === 'string' && (
        <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{error}</div>
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
        borderColor: invalid ? '#ef4444' : 'var(--bs-border-default, #27272e)',
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
          borderColor: invalid ? '#ef4444' : 'var(--bs-border-default, #27272e)',
          cursor: 'pointer',
          color: value ? 'var(--bs-text-primary, #e8e8ec)' : 'var(--bs-text-muted, #6b6b7e)',
        }}
      >
        {options.map((o: string, i: number) => (
          <option key={i} value={o} style={{ background: '#14141a', color: '#e8e8ec' }}>
            {o || (placeholder || 'Select…')}
          </option>
        ))}
      </select>
      <div style={{
        position: 'absolute', right: 12, top: '50%',
        transform: 'translateY(-50%)', pointerEvents: 'none',
        color: 'var(--bs-text-muted, #6b6b7e)',
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
      height: 46,
      background: 'var(--bs-bg-input, #14141a)',
      border: `1px solid ${invalid ? '#ef4444' : 'var(--bs-border-default, #27272e)'}`,
      borderRadius: 10,
      overflow: 'hidden',
      transition: 'border-color .15s, box-shadow .15s',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '0 12px',
        borderRight: '1px solid var(--bs-border-default, #27272e)',
        fontSize: 13, color: 'var(--bs-text-secondary, #a0a0b0)',
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
          flex: 1, height: '100%', padding: '0 14px',
          background: 'transparent', border: 'none',
          color: 'var(--bs-text-primary, #e8e8ec)',
          fontSize: 14, outline: 'none',
          fontFamily: 'inherit',
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
    <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 13, color: 'var(--bs-text-primary, #e8e8ec)' }}>
      <span
        style={{
          width: 18, height: 18, borderRadius: 4,
          border: `1.5px solid ${error ? '#ef4444' : (checked ? '#7C5CFF' : 'var(--bs-border-strong, #3a3a44)')}`,
          background: checked ? '#7C5CFF' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 1,
          transition: 'all .15s',
        }}
      >
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
        {checked && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span style={{ lineHeight: 1.55 }}>
        {label}
        {error && <span style={{ color: '#ef4444', fontSize: 11, marginLeft: 6 }}>{error}</span>}
      </span>
    </label>
  )
}

/* ================================================================
   STYLES
================================================================ */
const baseFieldStyle: React.CSSProperties = {
  height: 46, width: '100%',
  padding: '0 14px',
  background: 'var(--bs-bg-input, #14141a)',
  border: '1px solid var(--bs-border-default, #27272e)',
  borderRadius: 10,
  color: 'var(--bs-text-primary, #e8e8ec)',
  fontSize: 14,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color .15s, box-shadow .15s',
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    overflow: 'hidden',
    background: 'var(--bs-bg-base, #0a0a0c)',
    color: 'var(--bs-text-primary, #e8e8ec)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  brandPanel: {
    width: '42%',
    minHeight: '100vh',
    position: 'sticky',
    top: 0,
    padding: '44px 48px',
    background: 'linear-gradient(155deg, #1a1432 0%, #0e0a1f 60%, #080510 100%)',
    borderRight: '1px solid var(--bs-border-subtle, #1c1c22)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  formPanel: {
    width: '58%',
    flex: 1,
    padding: '72px 16px 96px',
    overflowY: 'auto',
  },
  stepPill: {
    display: 'inline-block',
    padding: '6px 14px',
    borderRadius: 999,
    background: 'rgba(124,92,255,0.12)',
    border: '1px solid rgba(124,92,255,0.28)',
    color: '#9b82ff',
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 20,
    letterSpacing: '0.02em',
  },
  eyebrow: {
    fontSize: 13,
    color: 'var(--bs-text-secondary, #a0a0b0)',
    marginBottom: 6,
    fontWeight: 400,
  },
  pageTitle: {
    fontSize: 36,
    fontWeight: 700,
    color: 'var(--bs-text-primary, #e8e8ec)',
    letterSpacing: '-0.025em',
    lineHeight: 1.1,
    margin: 0,
  },
  btnCta: {
    width: '100%',
    height: 52,
    padding: '0 24px',
    borderRadius: 12,
    background: '#7C5CFF',
    border: 'none',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    transition: 'background .15s, opacity .15s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
    boxShadow: '0 10px 28px rgba(124,92,255,0.28)',
  },
  backLink: {
    background: 'transparent',
    border: 'none',
    color: '#7C5CFF',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'underline',
    fontFamily: 'inherit',
    padding: '8px 16px',
    transition: 'color .15s',
  },
  btnPrimary: {
    height: 44, padding: '0 24px', borderRadius: 10,
    background: '#7C5CFF', border: 'none', color: '#fff',
    cursor: 'pointer', fontSize: 14, fontWeight: 500,
    fontFamily: 'inherit',
  },
  btnSecondary: {
    height: 44, padding: '0 20px', borderRadius: 10,
    background: 'transparent',
    border: '1px solid var(--bs-border-default, #27272e)',
    color: 'var(--bs-text-secondary, #a0a0b0)',
    cursor: 'pointer', fontSize: 14,
    fontFamily: 'inherit',
  },
  iconBtn: {
    width: 38, height: 46, borderRadius: 10,
    background: 'transparent',
    border: '1px solid var(--bs-border-default, #27272e)',
    color: 'var(--bs-text-muted, #6b6b7e)',
    cursor: 'pointer', fontSize: 18,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    fontFamily: 'inherit',
  },
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modal: {
    background: 'var(--bs-bg-card, #111114)', borderRadius: 16,
    border: '1px solid var(--bs-border-default, #27272e)',
    maxWidth: 600, width: '100%', maxHeight: '80vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid var(--bs-border-subtle, #1c1c22)',
  },
  modalClose: {
    width: 32, height: 32, borderRadius: 8,
    background: 'transparent',
    border: '1px solid var(--bs-border-default, #27272e)',
    color: 'var(--bs-text-muted, #6b6b7e)',
    cursor: 'pointer', fontSize: 18,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit',
  },
}