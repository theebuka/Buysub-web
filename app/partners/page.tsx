// ============================================================
// PHASE 3 — Partner Signup Form (Ported from Airtable → Supabase)
// File: apps/web/app/partners/page.tsx
//
// Changes from the Airtable version:
//   1. Submission now POSTs to /v2/partners instead of Airtable proxy
//   2. Field names mapped from Airtable's "Legal Business Name" style
//      to Supabase's snake_case (legal_name, store_name, etc.)
//   3. Removed AIRTABLE_BASE_ID, AIRTABLE_TABLE, and FIELD_MAP
//   4. Removed webhook (event logging happens server-side now)
//   5. All UI/UX preserved 1:1
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

/* ===============================================================
   ICONS
=============================================================== */
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

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
   STEP LABELS
=============================================================== */
const STEP_LABELS = ['Business Details', 'Owner Info', 'Payment & Terms']

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

  const [form, setForm] = useState<any>(() => {
    if (typeof window === 'undefined') return { ...INITIAL_FORM }
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? { ...INITIAL_FORM, ...JSON.parse(saved) } : { ...INITIAL_FORM }
    } catch { return { ...INITIAL_FORM } }
  })

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
    return e
  }

  const errors = getAllErrors(form)

  const getStepFields = (s: number) => {
    if (s === 1) return ['legalName', 'storeName', 'address', 'lga', 'state', 'businessPhone', 'businessEmail', 'cac', 'alternatePhone']
    if (s === 2) return ['fullName', 'contactEmail', 'contactPhone', 'gender', 'contactMethod']
    if (s === 3) return ['payoutFrequency', 'payoutMethod', 'bank', 'accountName', 'accountNumber', 'token', 'chain', 'wallet', 'amlAccepted', 'privacyAccepted', 'termsAccepted']
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

  /* ── Submit — now POSTs to /v2/partners (Supabase) ── */
  const submit = async () => {
    const allFields = [...getStepFields(1), ...getStepFields(2), ...getStepFields(3)]
    const updates: any = {}; allFields.forEach(k => (updates[k] = true))
    setTouched(updates)
    if (Object.keys(getAllErrors(form)).length > 0) return

    setIsSubmitting(true)

    // Map form fields to Supabase snake_case columns
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
      setSubmitError(error.message || 'An unexpected error occurred.')
      setSubmitResult('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setForm({ ...INITIAL_FORM }); setStep(1); setTouched({}); setSameAsLegal(false)
    setSubmitResult('idle'); setSubmitError(''); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* ── Success Screen ── */
  if (submitResult === 'success') {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 20px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--bs-text-primary, #e8e8ec)', marginBottom: 8 }}>Application Submitted</div>
          <div style={{ fontSize: 14, color: 'var(--bs-text-secondary, #a0a0b0)', lineHeight: 1.7 }}>
            Thanks, {submittedName}. Your partner application is under review. We'll reach out within 3–5 business days via your preferred contact method.
          </div>
          <div style={{ marginTop: 28, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
              style={{ ...styles.btnPrimary, background: '#25D366', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.116 1.523 5.847L.057 23.57a.75.75 0 0 0 .92.92l5.723-1.466A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.93 0-3.736-.518-5.287-1.42l-.379-.225-3.932 1.007 1.007-3.932-.225-.379A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" /></svg>
              Chat with Us
            </a>
            <button onClick={resetForm} style={styles.btnSecondary}>Submit Another</button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Error Screen ── */
  if (submitResult === 'error') {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 20px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--bs-text-primary, #e8e8ec)', marginBottom: 8 }}>Submission Failed</div>
          <div style={{ fontSize: 14, color: 'var(--bs-text-secondary, #a0a0b0)', lineHeight: 1.7 }}>{submitError}</div>
          <button onClick={() => setSubmitResult('idle')} style={{ ...styles.btnPrimary, marginTop: 24 }}>Try Again</button>
        </div>
      </div>
    )
  }

  /* ── Form ── */
  return (
    <div style={styles.container}>
      {/* Terms modal */}
      {showTerms && (
        <div style={styles.modalOverlay} onClick={() => setShowTerms(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Terms & Conditions</span>
              <button onClick={() => setShowTerms(false)} style={styles.modalClose}>×</button>
            </div>
            <TermsContent />
          </div>
        </div>
      )}

      <div style={{ maxWidth: 580, margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>Partner Application</div>
          <div style={{ fontSize: 13, color: 'var(--bs-text-muted, #6b6b7e)', marginTop: 4 }}>Join the BuySub Partner Program</div>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {STEP_LABELS.map((label, i) => {
            const s = i + 1
            const active = s === step
            const done = s < step
            return (
              <div key={s} style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', fontSize: 11, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? '#16a34a' : active ? '#7C5CFF' : 'var(--bs-bg-elevated, #18181c)',
                    color: done || active ? '#fff' : 'var(--bs-text-muted, #6b6b7e)',
                    border: `1px solid ${done ? '#16a34a' : active ? '#7C5CFF' : 'var(--bs-border-default, #27272e)'}`,
                  }}>
                    {done ? <CheckIcon /> : s}
                  </div>
                  <span style={{ fontSize: 12, color: active ? 'var(--bs-text-primary, #e8e8ec)' : 'var(--bs-text-muted, #6b6b7e)', fontWeight: active ? 600 : 400 }}>{label}</span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: done ? '#16a34a' : active ? '#7C5CFF' : 'var(--bs-border-subtle, #1c1c22)' }} />
              </div>
            )
          })}
        </div>

        {/* Step 1: Business Details */}
        {step === 1 && (
          <FormSection title="Business Details">
            <Input label="Legal Business Name *" error={touched.legalName && errors.legalName} value={form.legalName} onChange={v => update('legalName', v)} onBlur={() => blur('legalName')} />
            <Checkbox label="Store name same as legal name" checked={sameAsLegal} onChange={toggleSameAsLegal} />
            <Input label="Store Name *" error={touched.storeName && errors.storeName} value={form.storeName} onChange={v => update('storeName', v)} onBlur={() => blur('storeName')} disabled={sameAsLegal} />
            <Input label="Business Address *" error={touched.address && errors.address} value={form.address} onChange={v => update('address', v)} onBlur={() => blur('address')} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="LGA *" error={touched.lga && errors.lga} value={form.lga} onChange={v => update('lga', v)} onBlur={() => blur('lga')} />
              <Select label="State *" error={touched.state && errors.state} value={form.state} onChange={v => update('state', v)} onBlur={() => blur('state')}
                options={['', 'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara']} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Business Phone *" error={touched.businessPhone && errors.businessPhone} value={form.businessPhone} onChange={v => update('businessPhone', v)} onBlur={() => blur('businessPhone')} type="tel" placeholder="080..." />
              <Input label="Alternate Phone" error={touched.alternatePhone && errors.alternatePhone} value={form.alternatePhone} onChange={v => update('alternatePhone', v)} onBlur={() => blur('alternatePhone')} type="tel" />
            </div>
            <Input label="Business Email *" error={touched.businessEmail && errors.businessEmail} value={form.businessEmail} onChange={v => update('businessEmail', v)} onBlur={() => blur('businessEmail')} type="email" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="CAC Number" error={touched.cac && errors.cac} value={form.cac} onChange={v => update('cac', v)} onBlur={() => blur('cac')} placeholder="Optional" />
              <Select label="Registration Year" value={form.registrationYear} onChange={v => update('registrationYear', v)}
                options={['', ...YEARS.reverse().map(String)]} />
            </div>
            {/* Social media */}
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 11, color: 'var(--bs-text-secondary, #a0a0b0)', marginBottom: 6 }}>Social Media Channels</div>
              {form.socialMedia.map((s: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <Select value={s.platform} onChange={v => { const sm = [...form.socialMedia]; sm[i] = { ...sm[i], platform: v }; update('socialMedia', sm) }}
                    options={['', 'Instagram', 'Twitter/X', 'Facebook', 'TikTok', 'WhatsApp', 'LinkedIn', 'YouTube', 'Other']} style={{ flex: 1 }} />
                  <Input value={s.handle} onChange={v => { const sm = [...form.socialMedia]; sm[i] = { ...sm[i], handle: v }; update('socialMedia', sm) }}
                    placeholder="@handle or URL" style={{ flex: 1 }} />
                  {form.socialMedia.length > 1 && (
                    <button onClick={() => { const sm = form.socialMedia.filter((_: any, j: number) => j !== i); update('socialMedia', sm) }}
                      style={{ ...styles.iconBtn, flexShrink: 0 }}>×</button>
                  )}
                </div>
              ))}
              {form.socialMedia.length < 5 && (
                <button onClick={() => update('socialMedia', [...form.socialMedia, { platform: '', handle: '' }])}
                  style={{ background: 'transparent', border: 'none', color: '#7C5CFF', cursor: 'pointer', fontSize: 12 }}>+ Add channel</button>
              )}
            </div>
          </FormSection>
        )}

        {/* Step 2: Owner Info */}
        {step === 2 && (
          <FormSection title="Owner Information">
            <Input label="Full Name *" error={touched.fullName && errors.fullName} value={form.fullName} onChange={v => update('fullName', v)} onBlur={() => blur('fullName')} />
            <Input label="Email *" error={touched.contactEmail && errors.contactEmail} value={form.contactEmail} onChange={v => update('contactEmail', v)} onBlur={() => blur('contactEmail')} type="email" />
            <Input label="Phone *" error={touched.contactPhone && errors.contactPhone} value={form.contactPhone} onChange={v => update('contactPhone', v)} onBlur={() => blur('contactPhone')} type="tel" placeholder="080..." />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Select label="Gender *" error={touched.gender && errors.gender} value={form.gender} onChange={v => update('gender', v)} onBlur={() => blur('gender')}
                options={['', 'Male', 'Female', 'Other', 'Prefer not to say']} />
              <Select label="Preferred Contact *" error={touched.contactMethod && errors.contactMethod} value={form.contactMethod} onChange={v => update('contactMethod', v)} onBlur={() => blur('contactMethod')}
                options={['', 'WhatsApp', 'Phone Call', 'Email', 'SMS']} />
            </div>
            <Input label="Location" value={form.location} onChange={v => update('location', v)} placeholder="City, State" />
          </FormSection>
        )}

        {/* Step 3: Payment & Terms */}
        {step === 3 && (
          <FormSection title="Payment & Compliance">
            <Select label="Payout Frequency *" error={touched.payoutFrequency && errors.payoutFrequency} value={form.payoutFrequency} onChange={v => update('payoutFrequency', v)} onBlur={() => blur('payoutFrequency')}
              options={['', 'Monthly', 'Quarterly', 'Biannual', 'Annual']} />
            <Select label="Payout Method *" error={touched.payoutMethod && errors.payoutMethod} value={form.payoutMethod} onChange={v => update('payoutMethod', v)} onBlur={() => blur('payoutMethod')}
              options={['', 'Bank Transfer', 'Crypto']} />

            {form.payoutMethod === 'Bank Transfer' && (
              <>
                <Input label="Bank Name *" error={touched.bank && errors.bank} value={form.bank} onChange={v => update('bank', v)} onBlur={() => blur('bank')} />
                <Input label="Account Name *" error={touched.accountName && errors.accountName} value={form.accountName} onChange={v => update('accountName', v)} onBlur={() => blur('accountName')} />
                <Input label="Account Number *" error={touched.accountNumber && errors.accountNumber} value={form.accountNumber} onChange={v => update('accountNumber', v)} onBlur={() => blur('accountNumber')} maxLength={10} />
              </>
            )}
            {form.payoutMethod === 'Crypto' && (
              <>
                <Input label="Token *" error={touched.token && errors.token} value={form.token} onChange={v => update('token', v)} onBlur={() => blur('token')} />
                <Input label="Chain *" error={touched.chain && errors.chain} value={form.chain} onChange={v => update('chain', v)} onBlur={() => blur('chain')} />
                <Input label="Wallet Address *" error={touched.wallet && errors.wallet} value={form.wallet} onChange={v => update('wallet', v)} onBlur={() => blur('wallet')} />
              </>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8, padding: '16px 18px', background: 'var(--bs-bg-elevated, #18181c)', borderRadius: 12, border: '1px solid var(--bs-border-default, #27272e)' }}>
              <Checkbox label="I confirm that I comply with AML/CFT regulations and that all funds are from legitimate sources. *"
                error={touched.amlAccepted && errors.amlAccepted} checked={form.amlAccepted} onChange={v => update('amlAccepted', v)} />
              <Checkbox label="I have read and accept the BuySub Privacy Policy. *"
                error={touched.privacyAccepted && errors.privacyAccepted} checked={form.privacyAccepted} onChange={v => update('privacyAccepted', v)} />
              <Checkbox
                label={<>I have read and accept the <span style={{ color: '#7C5CFF', cursor: 'pointer' }} onClick={() => setShowTerms(true)}>Partner Program Terms & Conditions</span>. *</>}
                error={touched.termsAccepted && errors.termsAccepted} checked={form.termsAccepted} onChange={v => update('termsAccepted', v)} />
            </div>
          </FormSection>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
          {step > 1 && <button style={styles.btnSecondary} onClick={back}>← Back</button>}
          <div style={{ flex: 1 }} />
          {step < 3 && (
            <button style={{ ...styles.btnPrimary, opacity: isCurrentStepValid ? 1 : 0.45, cursor: isCurrentStepValid ? 'pointer' : 'not-allowed' }}
              onClick={next} disabled={!isCurrentStepValid}>Continue →</button>
          )}
          {step === 3 && (
            <button style={{ ...styles.btnPrimary, opacity: isSubmitting ? 0.6 : isCurrentStepValid ? 1 : 0.45 }}
              onClick={submit} disabled={isSubmitting || !isCurrentStepValid}>
              {isSubmitting ? 'Submitting…' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Form sub-components ── */
const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ background: 'var(--bs-bg-card, #111114)', border: '1px solid var(--bs-border-subtle, #1c1c22)', borderRadius: 16, padding: '20px 22px' }}>
    <div style={{ fontSize: 11, color: 'var(--bs-text-muted, #6b6b7e)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>{title}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
  </div>
)

const Input = ({ label, error, value, onChange, onBlur, type = 'text', placeholder, disabled, maxLength, style: extraStyle }: any) => (
  <div style={extraStyle}>
    {label && <div style={{ fontSize: 11, color: error ? '#dc2626' : 'var(--bs-text-secondary, #a0a0b0)', marginBottom: 4 }}>{label}</div>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur}
      placeholder={placeholder} disabled={disabled} maxLength={maxLength}
      style={{ ...inputStyle, borderColor: error ? '#dc2626' : 'var(--bs-border-default, #27272e)', opacity: disabled ? 0.5 : 1 }} />
    {error && typeof error === 'string' && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>{error}</div>}
  </div>
)

const Select = ({ label, error, value, onChange, onBlur, options, style: extraStyle }: any) => (
  <div style={extraStyle}>
    {label && <div style={{ fontSize: 11, color: error ? '#dc2626' : 'var(--bs-text-secondary, #a0a0b0)', marginBottom: 4 }}>{label}</div>}
    <select value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur}
      style={{ ...inputStyle, borderColor: error ? '#dc2626' : 'var(--bs-border-default, #27272e)' }}>
      {options.map((o: string) => <option key={o} value={o}>{o || 'Select…'}</option>)}
    </select>
    {error && typeof error === 'string' && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>{error}</div>}
  </div>
)

const Checkbox = ({ label, error, checked, onChange }: any) => (
  <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 13, color: 'var(--bs-text-primary, #e8e8ec)' }}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
      style={{ width: 16, height: 16, accentColor: '#7C5CFF', cursor: 'pointer', flexShrink: 0, marginTop: 2 }} />
    <span style={{ lineHeight: 1.5 }}>{label}{error && <span style={{ color: '#dc2626', fontSize: 11, marginLeft: 6 }}>{error}</span>}</span>
  </label>
)

const inputStyle: React.CSSProperties = {
  height: 40, padding: '0 12px', borderRadius: 8, fontSize: 13, width: '100%',
  background: 'var(--bs-bg-input, #111114)', border: '1px solid var(--bs-border-default, #27272e)',
  color: 'var(--bs-text-primary, #e8e8ec)', boxSizing: 'border-box', outline: 'none',
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'var(--bs-bg-base, #0a0a0c)', minHeight: '100vh',
    color: 'var(--bs-text-primary, #e8e8ec)', fontFamily: "'Inter', -apple-system, sans-serif",
    padding: '0 16px 60px', paddingTop: 'calc(10vh + 16px)', boxSizing: 'border-box',
  },
  btnPrimary: {
    height: 44, padding: '0 24px', borderRadius: 10, background: '#7C5CFF', border: 'none',
    color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500,
  },
  btnSecondary: {
    height: 44, padding: '0 20px', borderRadius: 10, background: 'transparent',
    border: '1px solid var(--bs-border-default, #27272e)', color: 'var(--bs-text-secondary, #a0a0b0)',
    cursor: 'pointer', fontSize: 14,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 8, background: 'transparent',
    border: '1px solid var(--bs-border-default, #27272e)', color: 'var(--bs-text-muted, #6b6b7e)',
    cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modal: {
    background: 'var(--bs-bg-card, #111114)', borderRadius: 16,
    border: '1px solid var(--bs-border-default, #27272e)',
    maxWidth: 600, width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid var(--bs-border-subtle, #1c1c22)',
  },
  modalClose: {
    width: 32, height: 32, borderRadius: 8, background: 'transparent',
    border: '1px solid var(--bs-border-default, #27272e)', color: 'var(--bs-text-muted, #6b6b7e)',
    cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  link: { color: '#7C5CFF', cursor: 'pointer', textDecoration: 'underline' },
}
