// ============================================================
// PARTNER DASHBOARD
// File: app/partners/dashboard/page.tsx
//
// Authenticated self-service dashboard for approved partners.
// Shows affiliate stats (clicks, conversions, earnings) and
// allows editing of the partner profile (F1).
// ============================================================

'use client'

import { useState, useEffect, useCallback } from 'react'
import { T } from '@/lib/constants'
import { useTheme } from '@/lib/theme'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const API = process.env.NEXT_PUBLIC_API_BASE || 'https://buysub-api-v2.ebuka-nwaju.workers.dev'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)


/* ── Icons (module level, house style: 24×24, currentColor, stroke 2) ── */
const svgBase = (size: number) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
})
const IconSun = ({ size = 16 }: { size?: number }) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)
const IconMoon = ({ size = 16 }: { size?: number }) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
)
const IconCopy = ({ size = 16 }: { size?: number }) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)
const IconCheck = ({ size = 16 }: { size?: number }) => (
  <svg {...svgBase(size)} aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
)
const IconUserX = ({ size = 26 }: { size?: number }) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" /><path d="m17 8 5 5M22 8l-5 5" />
  </svg>
)

type PartnerProfile = Record<string, any>
type Affiliate = { id: string; referral_code: string; status: string; display_name: string } | null
type Stats = { affiliate_id: string | null; clicks: number; conversions: number; earnings_ngn: number; pending_ngn: number }

export default function PartnerDashboard() {
  const { isDark, toggle: toggleTheme } = useTheme()
  const [copyState, setCopyState] = useState<'idle'|'done'|'failed'>('idle')
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [profile, setProfile] = useState<PartnerProfile | null>(null)
  const [affiliate, setAffiliate] = useState<Affiliate>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [tab, setTab] = useState<'overview' | 'profile'>('overview')
  const [saveState, setSaveState] = useState<'idle'|'saving'|'saved'|'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [form, setForm] = useState<PartnerProfile>({})

  // Theme persistence (F5)

  const api = useCallback(async (path: string, init: RequestInit = {}) => {
    return fetch(`${API}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    })
  }, [token])

  const load = useCallback(async (t: string) => {
    const [meRes, statsRes] = await Promise.all([
      fetch(`${API}/v2/partners/me`,       { headers: { Authorization: `Bearer ${t}` } }),
      fetch(`${API}/v2/partners/me/stats`, { headers: { Authorization: `Bearer ${t}` } }),
    ])
    if (meRes.ok) {
      const j = await meRes.json()
      setProfile(j.data?.profile || null)
      setAffiliate(j.data?.affiliate || null)
      setForm(j.data?.profile || {})
    }
    if (statsRes.ok) {
      const j = await statsRes.json()
      setStats(j.data || null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) { window.location.href = '/login'; return }
      setToken(session.access_token)
      load(session.access_token)
    })
  }, [load])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const updateField = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const saveProfile = async () => {
    if (!token) return
    setSaveState('saving'); setSaveError('')
    const editableKeys = [
      'business_phone','alternate_phone','business_email','address','lga','state',
      'social_media','owner_phone','contact_method','owner_location',
      'payout_frequency','payout_method','bank_name','account_name','account_number',
      'crypto_token','crypto_chain','wallet_address',
    ]
    const patch: any = {}
    for (const k of editableKeys) if (form[k] !== profile?.[k]) patch[k] = form[k] ?? null
    if (Object.keys(patch).length === 0) { setSaveState('saved'); setTimeout(() => setSaveState('idle'), 2000); return }

    const res = await api('/v2/partners/me', { method: 'PATCH', body: JSON.stringify(patch) })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setSaveError(j.error || 'Failed to save'); setSaveState('error')
      return
    }
    const j = await res.json()
    setProfile(j.data); setForm(j.data)
    setSaveState('saved'); setTimeout(() => setSaveState('idle'), 2000)
  }

  if (loading) {
    return <><PdStyles /><BootGate message="Loading your dashboard" /></>
  }
  if (!profile) {
    return (
      <>
        <PdStyles />
        <Center>
          <div style={{ textAlign: 'center', maxWidth: 380 }}>
            <div style={{
              width: 56, height: 56, borderRadius: T.radius.lg,
              background: 'rgba(var(--bs-accent-rgb), 0.10)',
              color: T.color.accentOnSurface,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: `0 auto ${T.space[4]}`,
            }}>
              <IconUserX />
            </div>
            <div style={{
              fontSize: T.text.lg, fontWeight: T.weight.semibold as any,
              color: T.color.textPrimary, marginBottom: T.space[2],
            }}>No partner profile</div>
            <div style={{
              fontSize: T.text.sm, color: T.color.textSecondary,
              lineHeight: T.leading.relaxed, marginBottom: T.space[5],
            }}>
              You're logged in but don't have a partner application on file.
            </div>
            <a href="/partners" className="bs-pd-btn" style={btnPrimary()}>Apply to partner program</a>
            <div style={{ marginTop: T.space[3] }}>
              <button type="button" className="bs-pd-ghost" onClick={signOut} style={btnGhost()}>Sign out</button>
            </div>
          </div>
        </Center>
      </>
    )
  }

  const isPending  = profile.status === 'pending_review'
  const isRejected = profile.status === 'rejected'
  const isApproved = profile.status === 'approved'

  return (
    <div style={{ background: T.color.bgBase, color: T.color.textPrimary, minHeight: '100dvh' }}>
      <PdStyles />

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: T.color.bgCard, borderBottom: `1px solid ${T.color.borderDefault}`,
        padding: `${T.space[2]} ${T.space[4]}`, display: 'flex', alignItems: 'center', gap: T.space[3],
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: T.radius.md, background: T.color.accentFill,
          color: '#fff', fontWeight: T.weight.bold as any, fontSize: T.text.base,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }} aria-hidden="true">B</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: T.text.sm, fontWeight: T.weight.semibold as any, color: T.color.textPrimary, lineHeight: T.leading.tight }}>Partner dashboard</div>
          <div style={{ fontSize: T.text.xs, color: T.color.textSecondary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.store_name || profile.legal_name}</div>
        </div>
        <button
          type="button"
          className="bs-pd-ghost"
          onClick={toggleTheme}
          style={iconBtn()}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDark ? <IconSun /> : <IconMoon />}
        </button>
        <button type="button" className="bs-pd-ghost" onClick={signOut} style={btnGhost()}>Sign out</button>
      </div>

      {/* Status banner */}
      {isPending && (
        <Banner kind="info">
          Your application is under review. We'll email you within 3–5 business days.
        </Banner>
      )}
      {isRejected && (
        <Banner kind="error">
          Your application was not approved.
          {profile.reviewer_notes ? ` Reason: ${profile.reviewer_notes}` : ''}
        </Banner>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: T.space[4] }}>

        {/* Tabs */}
        <div role="tablist" aria-label="Partner sections"
          style={{ display: 'flex', gap: T.space[1], borderBottom: `1px solid ${T.color.borderDefault}`, marginBottom: T.space[6] }}>
          <TabBtn id="overview" active={tab==='overview'} onClick={() => setTab('overview')}>Overview</TabBtn>
          <TabBtn id="profile" active={tab==='profile'} onClick={() => setTab('profile')}>Profile</TabBtn>
        </div>

        {tab === 'overview' && (
          <>
            {isApproved && affiliate && (
              <div style={{
                padding: T.space[5], marginBottom: T.space[6],
                background: 'linear-gradient(135deg, rgba(var(--bs-accent-rgb), 0.14) 0%, rgba(var(--bs-accent-rgb), 0.05) 100%)',
                border: '1px solid rgba(var(--bs-accent-rgb), 0.28)', borderRadius: T.radius.lg,
                display: 'flex', gap: T.space[3], alignItems: 'center', flexWrap: 'wrap',
              }}>
                <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <div style={{ fontSize: T.text.xs, color: T.color.accentOnSurface, fontWeight: T.weight.semibold as any }}>
                    Your referral code
                  </div>
                  <div style={{
                    fontSize: T.text.xl, fontWeight: T.weight.bold as any, color: T.color.textPrimary,
                    fontFamily: 'ui-monospace, Menlo, monospace', marginTop: T.space[1], wordBreak: 'break-all',
                  }}>
                    {affiliate.referral_code}
                  </div>
                  <div style={{ fontSize: T.text.xs, color: T.color.textSecondary, marginTop: T.space[1] }}>
                    Share this URL:{' '}
                    <span style={{
                      color: T.color.textPrimary, userSelect: 'all',
                      wordBreak: 'break-all',
                    }}>buysub.ng/?ref={affiliate.referral_code}</span>
                    {copyState === 'failed' && (
                      <span style={{ display: 'block', color: T.color.warning, marginTop: T.space[1] }}>
                        Could not reach the clipboard. Select the URL above to copy it.
                      </span>
                    )}
                  </div>
                  <span aria-live="polite" style={{
                    position: 'absolute', width: 1, height: 1, overflow: 'hidden',
                    clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
                  }}>{
                    copyState === 'done' ? 'Referral link copied to clipboard'
                    : copyState === 'failed' ? 'Could not copy. Select the URL above and copy it manually.'
                    : ''
                  }</span>
                </div>
                <button
                  type="button"
                  className="bs-pd-btn"
                  onClick={() => {
                    const url = `https://buysub.ng/?ref=${affiliate.referral_code}`
                    const settle = (r: 'done' | 'failed') => {
                      setCopyState(r)
                      setTimeout(() => setCopyState('idle'), 2600)
                    }
                    // Clipboard writes reject when the document lacks focus or
                    // permission. Reporting only success would leave the exact
                    // silence this was meant to fix.
                    if (!navigator.clipboard) { settle('failed'); return }
                    navigator.clipboard.writeText(url)
                      .then(() => settle('done'))
                      .catch(() => settle('failed'))
                  }}
                  style={{ ...btnPrimary(), flexShrink: 0, gap: T.space[2] }}
                >
                  {copyState === 'done' ? <IconCheck /> : <IconCopy />}
                  {copyState === 'done' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy link'}
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: T.space[3] }}>
              <StatCard label="Clicks" value={stats?.clicks ?? 0} />
              <StatCard label="Conversions" value={stats?.conversions ?? 0} />
              <StatCard label="Earnings (paid)" value={`₦${Number(stats?.earnings_ngn ?? 0).toLocaleString()}`} accent />
              <StatCard label="Pending" value={`₦${Number(stats?.pending_ngn ?? 0).toLocaleString()}`} />
            </div>

            {!isApproved && (
              <div style={{
                marginTop: T.space[6], padding: T.space[5],
                background: T.color.bgCard, border: `1px solid ${T.color.borderDefault}`, borderRadius: T.radius.lg,
                fontSize: T.text.sm, color: T.color.textSecondary, lineHeight: T.leading.relaxed,
              }}>
                {isPending && 'Stats will become available once your application is approved.'}
                {isRejected && 'Please contact us on WhatsApp if you\'d like to discuss your application.'}
              </div>
            )}
          </>
        )}

        {tab === 'profile' && (
          <div>
            {/* Save state banner */}
            {saveState === 'error' && <Banner kind="error">{saveError}</Banner>}
            {saveState === 'saved' && <Banner kind="success">Changes saved</Banner>}

            <Section title="Contact">
              <Row><F label="Business email" htmlFor="pd-business_email"><Inp id="pd-business_email" value={form.business_email || ''} onChange={v => updateField('business_email', v)} /></F>
                   <F label="Business phone" htmlFor="pd-business_phone"><Inp id="pd-business_phone" value={form.business_phone || ''} onChange={v => updateField('business_phone', v)} /></F></Row>
              <Row><F label="Alternate phone" htmlFor="pd-alternate_phone"><Inp id="pd-alternate_phone" value={form.alternate_phone || ''} onChange={v => updateField('alternate_phone', v)} /></F>
                   <F label="Owner phone" htmlFor="pd-owner_phone"><Inp id="pd-owner_phone" value={form.owner_phone || ''} onChange={v => updateField('owner_phone', v)} /></F></Row>
              <Row><F label="Preferred contact method" htmlFor="pd-contact_method">
                     <Sel id="pd-contact_method" value={form.contact_method || ''} onChange={v => updateField('contact_method', v)}
                          options={['','WhatsApp','Phone Call','Email','SMS']} />
                   </F>
                   <F label="Owner location" htmlFor="pd-owner_location"><Inp id="pd-owner_location" value={form.owner_location || ''} onChange={v => updateField('owner_location', v)} /></F></Row>
            </Section>

            <Section title="Address">
              <F label="Business address" htmlFor="pd-address"><Inp id="pd-address" value={form.address || ''} onChange={v => updateField('address', v)} /></F>
              <Row><F label="LGA" htmlFor="pd-lga"><Inp id="pd-lga" value={form.lga || ''} onChange={v => updateField('lga', v)} /></F>
                   <F label="State" htmlFor="pd-state"><Inp id="pd-state" value={form.state || ''} onChange={v => updateField('state', v)} /></F></Row>
            </Section>

            <Section title="Payout">
              <Row>
                <F label="Payout frequency" htmlFor="pd-payout_frequency">
                  <Sel id="pd-payout_frequency" value={form.payout_frequency || ''} onChange={v => updateField('payout_frequency', v)}
                       options={['','Monthly','Quarterly','Biannual','Annual']} />
                </F>
                <F label="Payout method" htmlFor="pd-payout_method">
                  <Sel id="pd-payout_method" value={form.payout_method || ''} onChange={v => updateField('payout_method', v)}
                       options={['','Bank Transfer','Crypto']} />
                </F>
              </Row>
              {form.payout_method === 'Bank Transfer' && (<>
                <F label="Bank name" htmlFor="pd-bank_name"><Inp id="pd-bank_name" value={form.bank_name || ''} onChange={v => updateField('bank_name', v)} /></F>
                <Row><F label="Account name" htmlFor="pd-account_name"><Inp id="pd-account_name" value={form.account_name || ''} onChange={v => updateField('account_name', v)} /></F>
                     <F label="Account number" htmlFor="pd-account_number"><Inp id="pd-account_number" value={form.account_number || ''} onChange={v => updateField('account_number', v)} maxLength={10} /></F></Row>
              </>)}
              {form.payout_method === 'Crypto' && (<>
                <Row><F label="Token" htmlFor="pd-crypto_token"><Inp id="pd-crypto_token" value={form.crypto_token || ''} onChange={v => updateField('crypto_token', v)} /></F>
                     <F label="Chain" htmlFor="pd-crypto_chain"><Inp id="pd-crypto_chain" value={form.crypto_chain || ''} onChange={v => updateField('crypto_chain', v)} /></F></Row>
                <F label="Wallet address" htmlFor="pd-wallet_address"><Inp id="pd-wallet_address" value={form.wallet_address || ''} onChange={v => updateField('wallet_address', v)} /></F>
              </>)}
            </Section>

            <div style={{ display: 'flex', gap: T.space[3], marginTop: T.space[5], flexWrap: 'wrap' }}>
              <button
                onClick={saveProfile}
                disabled={saveState === 'saving'}
                className="bs-pd-btn"
                style={{ ...btnPrimary(), opacity: saveState === 'saving' ? 0.6 : 1 }}
              >
                {saveState === 'saving' ? 'Saving…' : 'Save changes'}
              </button>
              <button
                onClick={() => { setForm(profile); setSaveState('idle') }}
                className="bs-pd-ghost"
                style={btnGhost()}
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Small building blocks ────────────────────────────────── */
function Center({ children }: any) {
  return (
    <div style={{
      background: T.color.bgBase, minHeight: '100dvh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: T.space[5],
    }}>
      {children}
    </div>
  )
}

function BootGate({ message }: { message: string }) {
  return (
    <Center>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: T.space[4] }}>
        <div style={{
          width: 40, height: 40, borderRadius: T.radius.md, background: T.color.accentFill,
          color: '#fff', fontWeight: T.weight.bold as any, fontSize: T.text.lg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} aria-hidden="true">B</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: T.space[2] }}>
          <span className="bs-pd-spinner" />
          <span style={{ fontSize: T.text.sm, color: T.color.textMuted }}>{message}</span>
        </div>
      </div>
    </Center>
  )
}

function Banner({ kind, children }: { kind: 'info'|'success'|'error'; children: React.ReactNode }) {
  const rgb = kind === 'success' ? '--bs-success-rgb'
            : kind === 'error'   ? '--bs-error-rgb'
            : '--bs-accent-rgb'
  const fg = kind === 'success' ? T.color.success
           : kind === 'error'   ? T.color.error
           : T.color.accentOnSurface
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      style={{
        padding: `${T.space[3]} ${T.space[4]}`,
        background: `rgba(var(${rgb}), 0.10)`,
        borderBottom: `1px solid rgba(var(${rgb}), 0.28)`,
        color: fg, fontSize: T.text.sm, textAlign: 'center',
        lineHeight: T.leading.snug,
      }}
    >
      {children}
    </div>
  )
}

function StatCard({ label, value, accent }: any) {
  return (
    <div style={{
      background: T.color.bgCard, border: `1px solid ${T.color.borderDefault}`,
      borderRadius: T.radius.lg, padding: T.space[4],
    }}>
      <div style={{ fontSize: T.text.xs, color: T.color.textSecondary, fontWeight: T.weight.medium as any }}>{label}</div>
      <div style={{
        fontSize: T.text['2xl'], fontWeight: T.weight.bold as any,
        color: accent ? T.color.accentOnSurface : T.color.textPrimary,
        marginTop: T.space[1], letterSpacing: '-0.01em',
      }}>{value}</div>
    </div>
  )
}

function TabBtn({ id, active, onClick, children }: any) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      id={`pd-tab-${id}`}
      onClick={onClick}
      className="bs-pd-tab"
      style={{
        display: 'inline-flex', alignItems: 'center',
        minHeight: 'var(--bs-control-lg)', padding: `0 ${T.space[4]}`,
        background: 'transparent', border: 'none',
        borderBottom: `2px solid ${active ? T.color.accent : 'transparent'}`,
        color: active ? T.color.accentOnSurface : T.color.textMuted,
        fontSize: T.text.sm, fontWeight: T.weight.semibold as any,
        cursor: 'pointer', marginBottom: -1, fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  )
}

function Section({ title, children }: any) {
  return (
    <div style={{
      background: T.color.bgCard, border: `1px solid ${T.color.borderDefault}`,
      borderRadius: T.radius.lg, padding: T.space[5], marginBottom: T.space[3],
    }}>
      <div style={{
        fontSize: T.text.sm, color: T.color.textPrimary,
        fontWeight: T.weight.semibold as any, marginBottom: T.space[3],
      }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: T.space[3] }}>{children}</div>
    </div>
  )
}

// Collapses to one column under 600px — two inputs cannot share a 360px row.
function Row({ children }: any) {
  return <div className="bs-pd-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: T.space[3] }}>{children}</div>
}

function F({ label, htmlFor, children }: any) {
  return (
    <div>
      <label htmlFor={htmlFor} style={{
        display: 'block', fontSize: T.text.xs, color: T.color.textSecondary,
        marginBottom: T.space[1], fontWeight: T.weight.medium as any,
      }}>{label}</label>
      {children}
    </div>
  )
}

type InputProps = { id?: string; value: string; onChange: (v: string) => void; maxLength?: number }
type SelectProps = { id?: string; value: string; onChange: (v: string) => void; options: string[] }

const fieldStyle: React.CSSProperties = {
  width: '100%', height: 'var(--bs-control-lg)', padding: `0 ${T.space[3]}`,
  borderRadius: T.radius.md,
  background: T.color.bgElevated, border: `1px solid ${T.color.borderDefault}`,
  color: T.color.textPrimary, fontSize: T.text.sm,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  transition: `border-color var(--bs-dur-1) var(--bs-ease-inout), box-shadow var(--bs-dur-1) var(--bs-ease-inout)`,
}

function Inp({ id, value, onChange, maxLength }: InputProps) {
  return (
    <input id={id} className="bs-pd-input" value={value ?? ''} maxLength={maxLength}
      onChange={e => onChange(e.target.value)} style={fieldStyle} />
  )
}

function Sel({ id, value, onChange, options }: SelectProps) {
  return (
    <select id={id} className="bs-pd-input" value={value ?? ''}
      onChange={e => onChange(e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>
      {options.map((o: string) => <option key={o} value={o}>{o || 'Select…'}</option>)}
    </select>
  )
}

/* 44px is a floor on this surface — see the density note in REFACTOR.md. */
function btnPrimary(): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minHeight: 'var(--bs-control-xl)', padding: `0 ${T.space[5]}`,
    borderRadius: T.radius.md, background: T.color.accentFill, border: 'none',
    color: '#fff', fontSize: T.text.sm, fontWeight: T.weight.semibold as any,
    cursor: 'pointer', textDecoration: 'none', fontFamily: 'inherit',
    transition: `background var(--bs-dur-1) var(--bs-ease-inout)`,
  }
}
function btnGhost(): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minHeight: 'var(--bs-control-lg)', padding: `0 ${T.space[4]}`,
    borderRadius: T.radius.md, background: 'transparent',
    border: `1px solid ${T.color.borderDefault}`, color: T.color.textPrimary,
    fontSize: T.text.sm, fontWeight: T.weight.medium as any, cursor: 'pointer',
    fontFamily: 'inherit',
    transition: `border-color var(--bs-dur-1) var(--bs-ease-inout), color var(--bs-dur-1) var(--bs-ease-inout)`,
  }
}
function iconBtn(): React.CSSProperties {
  return {
    width: 'var(--bs-control-lg)', height: 'var(--bs-control-lg)',
    borderRadius: T.radius.md, background: 'transparent',
    border: `1px solid ${T.color.borderDefault}`, color: T.color.textSecondary,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0, fontFamily: 'inherit',
    transition: `border-color var(--bs-dur-1) var(--bs-ease-inout), color var(--bs-dur-1) var(--bs-ease-inout)`,
  }
}

function PdStyles() {
  return (
    <style>{`
        .bs-pd-input:focus,.bs-pd-input:focus-visible { outline:none !important; border-color:var(--bs-accent) !important; box-shadow:var(--bs-ring); }
        .bs-pd-input::placeholder { color:var(--bs-text-faint); }
        .bs-pd-btn:hover:not(:disabled) { background:var(--bs-accent-hover) !important; }
        .bs-pd-btn:active:not(:disabled) { transform:scale(0.99); }
        .bs-pd-ghost:hover:not(:disabled) { border-color:var(--bs-border-strong); color:var(--bs-text-primary); }
        .bs-pd-tab:hover { color:var(--bs-text-primary); }
        .bs-pd-input:focus-visible,
        .bs-pd-btn:focus-visible,
        .bs-pd-ghost:focus-visible,
        .bs-pd-tab:focus-visible { outline:none; box-shadow:var(--bs-ring); }
        /* Paired fields cannot share a 360px row. */
        @media (max-width: 600px) { .bs-pd-row { grid-template-columns:1fr !important; } }
      
      @keyframes bsPdSpin { to { transform: rotate(360deg); } }
      .bs-pd-spinner {
        width: 16px; height: 16px; flex-shrink: 0; display: inline-block;
        border: 2px solid var(--bs-border-strong);
        border-top-color: var(--bs-accent);
        border-radius: var(--bs-radius-full);
        animation: bsPdSpin 0.7s linear infinite;
      }
    `}</style>
  )
}
