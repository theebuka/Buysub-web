'use client'

// Partner profile. Store and owner are read-only here: changing them needs a
// fresh review. Registered-business details (legal name, CAC number, year) can
// be added once, then read-only. Everything else PATCH /v2/partners/me
// accepts is editable, one section and save at a time. Payout details and the
// AML declaration are what payouts wait on (setupSteps in usePartner).

import { useState, type ReactNode } from 'react'
import { Button, Checkbox, Field, Input, Select } from '@/components/ui'
import { authFetch } from '@/lib/apiAuth'
import { invalidate } from '@/lib/useApi'
import { PageHead } from '@/components/account/AccountShell'
import { usePartner, type PartnerProfile as P } from './usePartner'
import s from '@/components/account/account.module.css'

type Draft = Partial<Record<keyof P, string>>

function Section({ id, title, desc, keys, profile, children }: {
  id?: string; title: string; desc: ReactNode; keys: (keyof P)[]; profile: P
  children: (d: Draft, set: (k: keyof P) => (e: { target: { value: string } }) => void) => ReactNode
}) {
  const str = (k: keyof P) => (profile[k] == null ? '' : String(profile[k]))
  const initial = () => Object.fromEntries(keys.map(k => [k, str(k)])) as Draft
  const [d, setD] = useState<Draft>(initial)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const set = (k: keyof P) => (e: { target: { value: string } }) => { setD(p => ({ ...p, [k]: e.target.value })); setMsg(null) }
  const changed = keys.filter(k => (d[k] ?? '') !== str(k))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const body = Object.fromEntries(changed.map(k => [k, (d[k] || '').trim() || null]))
    const r = await authFetch('/v2/partners/me', { method: 'PATCH', body })
    setBusy(false)
    if (!r.ok) return setMsg({ ok: false, text: r.error || 'Couldn’t save. Try again.' })
    // Keep this section's draft as saved (trimmed); other sections keep
    // whatever unsaved edits they have when the profile refetches.
    setD(p => ({ ...p, ...Object.fromEntries(changed.map(k => [k, (d[k] || '').trim()])) }))
    setMsg({ ok: true, text: 'Saved.' })
    invalidate('/v2/partners/me')
  }

  return (
    <section className={s.setRow} id={id} style={{ scrollMarginTop: 'calc(var(--bs-header-h) + 16px)' }}>
      <div>
        <h2 className={s.h2}>{title}</h2>
        <p className={s.secondary} style={{ marginTop: 4, lineHeight: 1.5 }}>{desc}</p>
      </div>
      <form className={s.setForm} onSubmit={save}>
        {children(d, set)}
        <div className={s.setActions}>
          <Button type="submit" size="md" variant="secondary" loading={busy} disabled={!changed.length}>Save</Button>
          {msg && <span className={msg.ok ? s.ok : s.err} role="status">{msg.text}</span>}
        </div>
      </form>
    </section>
  )
}

function ReadOnly({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
      <span className={s.muted}>{label}</span>
      <span style={{ fontSize: 'var(--bs-text-sm)', color: 'var(--bs-text-primary)', overflowWrap: 'anywhere' }}>{value || 'Not provided'}</span>
    </div>
  )
}

const opts = (list: string[], v?: string) => [...(v && !list.includes(v) ? [v] : []), ...list]

export default function PartnerProfile() {
  const { profile } = usePartner()
  if (!profile) return null
  return (
    <>
      <PageHead title="Profile" lede={`${profile.store_name || profile.legal_name}`} />
      <div className={s.settings}>
        <section className={s.setRow}>
          <div>
            <h2 className={s.h2}>Store</h2>
            <p className={s.secondary} style={{ marginTop: 4, lineHeight: 1.5 }}>From your application. Contact us to change these, as they need a new review.</p>
          </div>
          <div className={s.setForm} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))' }}>
            <ReadOnly label="Store name" value={profile.store_name} />
            <ReadOnly label="Owner" value={profile.owner_name} />
            <ReadOnly label="Owner email" value={profile.owner_email} />
          </div>
        </section>

        {profile.legal_name && profile.cac_number && profile.registration_year ? (
          <section className={s.setRow}>
            <div>
              <h2 className={s.h2}>Registered business</h2>
              <p className={s.secondary} style={{ marginTop: 4, lineHeight: 1.5 }}>Contact us to change these, as they need a new review.</p>
            </div>
            <div className={s.setForm} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))' }}>
              <ReadOnly label="Legal name" value={profile.legal_name} />
              <ReadOnly label="CAC number" value={profile.cac_number} />
              <ReadOnly label="Registration year" value={profile.registration_year ? String(profile.registration_year) : null} />
            </div>
          </section>
        ) : (
          <Section title="Registered business" desc="Optional. Only if your store is registered with the CAC. Each one can be added once; after that, changes go through us." profile={profile}
            keys={['legal_name', 'cac_number', 'registration_year']}>
            {(d, set) => <>
              <Field label="Legal business name">{p => <Input {...p} value={d.legal_name || ''} onChange={set('legal_name')} disabled={!!profile.legal_name} />}</Field>
              <div style={{ display: 'grid', gap: 'var(--bs-space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                <Field label="CAC number">{p => <Input {...p} value={d.cac_number || ''} onChange={set('cac_number')} placeholder="e.g. RC1234567" disabled={!!profile.cac_number} />}</Field>
                <Field label="Registration year">{p => <Input {...p} inputMode="numeric" maxLength={4} disabled={!!profile.registration_year} value={d.registration_year || ''} onChange={e => set('registration_year')({ target: { value: e.target.value.replace(/\D/g, '') } })} />}</Field>
              </div>
            </>}
          </Section>
        )}

        <Section title="Contact" desc="How customers and BuySub reach your business." profile={profile}
          keys={['business_email', 'business_phone', 'alternate_phone', 'owner_phone', 'contact_method', 'social_media']}>
          {(d, set) => <>
            <Field label="Business email">{p => <Input {...p} type="email" value={d.business_email || ''} onChange={set('business_email')} />}</Field>
            <Field label="Business phone">{p => <Input {...p} type="tel" value={d.business_phone || ''} onChange={set('business_phone')} />}</Field>
            <Field label="Alternate phone">{p => <Input {...p} type="tel" value={d.alternate_phone || ''} onChange={set('alternate_phone')} />}</Field>
            <Field label="Your phone">{p => <Input {...p} type="tel" value={d.owner_phone || ''} onChange={set('owner_phone')} />}</Field>
            <Field label="Preferred contact">{p => (
              <Select {...p} value={d.contact_method || ''} onChange={set('contact_method')}>
                <option value="">Choose…</option>
                {opts(['WhatsApp', 'Phone Call', 'Email', 'SMS'], d.contact_method).map(o => <option key={o}>{o}</option>)}
              </Select>
            )}</Field>
            <Field label="Social media" hint="Where you promote BuySub, e.g. Instagram: @yourstore">{p => <Input {...p} value={d.social_media || ''} onChange={set('social_media')} />}</Field>
          </>}
        </Section>

        <Section title="Location" desc="Your business address." profile={profile} keys={['address', 'lga', 'state', 'owner_location']}>
          {(d, set) => <>
            <Field label="Address">{p => <Input {...p} autoComplete="street-address" value={d.address || ''} onChange={set('address')} />}</Field>
            <div style={{ display: 'grid', gap: 'var(--bs-space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              <Field label="LGA">{p => <Input {...p} value={d.lga || ''} onChange={set('lga')} />}</Field>
              <Field label="State">{p => <Input {...p} value={d.state || ''} onChange={set('state')} />}</Field>
            </div>
            <Field label="Where you’re based">{p => <Input {...p} value={d.owner_location || ''} onChange={set('owner_location')} />}</Field>
          </>}
        </Section>

        <Section id="payout" title="Payout" desc="Where BuySub sends your commission, and how often." profile={profile}
          keys={['payout_method', 'payout_frequency', 'bank_name', 'account_name', 'account_number', 'crypto_token', 'crypto_chain', 'wallet_address']}>
          {(d, set) => <>
            <div style={{ display: 'grid', gap: 'var(--bs-space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              <Field label="Method">{p => (
                <Select {...p} value={d.payout_method || ''} onChange={set('payout_method')}>
                  <option value="">Choose…</option>
                  {opts(['Bank Transfer', 'Crypto'], d.payout_method).map(o => <option key={o}>{o}</option>)}
                </Select>
              )}</Field>
              <Field label="Frequency" hint="We pay you on the 1st of the month each period ends.">{p => (
                <Select {...p} value={d.payout_frequency || ''} onChange={set('payout_frequency')}>
                  <option value="">Choose…</option>
                  {opts(['Monthly', 'Quarterly', 'Biannual', 'Annual'], d.payout_frequency).map(o => <option key={o}>{o}</option>)}
                </Select>
              )}</Field>
            </div>
            {d.payout_method === 'Crypto' ? <>
              <div style={{ display: 'grid', gap: 'var(--bs-space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                <Field label="Token">{p => <Input {...p} value={d.crypto_token || ''} onChange={set('crypto_token')} placeholder="e.g. USDT" />}</Field>
                <Field label="Network">{p => <Input {...p} value={d.crypto_chain || ''} onChange={set('crypto_chain')} placeholder="e.g. TRC20" />}</Field>
              </div>
              <Field label="Wallet address" hint="Double-check it. Crypto sent to a wrong address can’t be recovered.">{p => <Input {...p} value={d.wallet_address || ''} onChange={set('wallet_address')} spellCheck={false} />}</Field>
            </> : <>
              <Field label="Bank">{p => <Input {...p} value={d.bank_name || ''} onChange={set('bank_name')} />}</Field>
              <div style={{ display: 'grid', gap: 'var(--bs-space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                <Field label="Account name">{p => <Input {...p} value={d.account_name || ''} onChange={set('account_name')} />}</Field>
                <Field label="Account number">{p => <Input {...p} inputMode="numeric" maxLength={10} value={d.account_number || ''} onChange={e => set('account_number')({ target: { value: e.target.value.replace(/\D/g, '') } })} />}</Field>
              </div>
            </>}
          </>}
        </Section>

        <Declaration accepted={!!profile.aml_accepted} />
      </div>
    </>
  )
}

/** The AML declaration. Payouts wait for it; once given it can't be withdrawn here. */
function Declaration({ accepted }: { accepted: boolean }) {
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const confirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    const r = await authFetch('/v2/partners/me', { method: 'PATCH', body: { aml_accepted: true } })
    setBusy(false)
    if (!r.ok) return setError(r.error || 'Couldn’t save. Try again.')
    invalidate('/v2/partners/me')
    invalidate('/v2/partners/me/payouts')
  }
  return (
    <section className={s.setRow} id="declaration" style={{ scrollMarginTop: 'calc(var(--bs-header-h) + 16px)' }}>
      <div>
        <h2 className={s.h2}>Declaration</h2>
        <p className={s.secondary} style={{ marginTop: 4, lineHeight: 1.5 }}>Needed once before your first payout.</p>
      </div>
      {accepted ? (
        <div className={s.setForm}>
          <p className={s.secondary}>You’ve confirmed that you comply with anti-money-laundering rules and that funds you receive are from legitimate sources.</p>
        </div>
      ) : (
        <form className={s.setForm} onSubmit={confirm}>
          <Checkbox checked={checked} onChange={e => setChecked(e.target.checked)}
            label="I comply with AML/CFT regulations, and all funds are from legitimate sources." />
          <div className={s.setActions}>
            <Button type="submit" size="md" variant="secondary" loading={busy} disabled={!checked}>Confirm</Button>
            {error && <span className={s.err} role="status">{error}</span>}
          </div>
        </form>
      )}
    </section>
  )
}
