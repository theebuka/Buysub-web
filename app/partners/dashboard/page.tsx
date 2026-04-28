// ============================================================
// PARTNER DASHBOARD
// File: app/partners/dashboard/page.tsx
//
// Authenticated self-service dashboard for approved partners.
// Shows affiliate stats (clicks, conversions, earnings) and
// allows editing of the partner profile (F1).
// ============================================================

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const API = process.env.NEXT_PUBLIC_API_BASE || 'https://buysub-api-v2.ebuka-nwaju.workers.dev'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const T_DARK  = { bg:'#0a0a0c', card:'#111114', elev:'#14141a', border:'#1c1c22', borderStrong:'#2a2a32', text:'#e8e8ec', muted:'#a0a0b0', faint:'#6b6b7e', accent:'#7C5CFF' }
const T_LIGHT = { bg:'#f5f5f7', card:'#ffffff', elev:'#fafafc', border:'#e5e5ea', borderStrong:'#d1d1d6', text:'#1a1a22', muted:'#6e6e78', faint:'#8e8e96', accent:'#7C5CFF' }

type PartnerProfile = Record<string, any>
type Affiliate = { id: string; referral_code: string; status: string; display_name: string } | null
type Stats = { affiliate_id: string | null; clicks: number; conversions: number; earnings_ngn: number; pending_ngn: number }

export default function PartnerDashboard() {
  const [isDark, setIsDark] = useState(true)
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
  useEffect(() => {
    try { if (localStorage.getItem('bs_admin_theme') === 'light') setIsDark(false) } catch {}
  }, [])
  const toggleTheme = () => {
    const next = !isDark; setIsDark(next)
    try { localStorage.setItem('bs_admin_theme', next ? 'dark' : 'light') } catch {}
  }
  const T = useMemo(() => (isDark ? T_DARK : T_LIGHT), [isDark])

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
    return <Center T={T}><div style={{ color: T.faint, fontSize: 13 }}>Loading…</div></Center>
  }
  if (!profile) {
    return (
      <Center T={T}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 8 }}>No partner profile</div>
          <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.6, marginBottom: 20 }}>
            You're logged in but don't have a partner application on file.
          </div>
          <a href="/partners" style={btnPrimary(T)}>Apply to partner program</a>
          <div style={{ marginTop: 14 }}>
            <button onClick={signOut} style={btnGhost(T)}>Sign out</button>
          </div>
        </div>
      </Center>
    )
  }

  const isPending  = profile.status === 'pending_review'
  const isRejected = profile.status === 'rejected'
  const isApproved = profile.status === 'approved'

  return (
    <div style={{ background: T.bg, color: T.text, minHeight: '100vh', fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <style>{`
        .bs-pd-input:focus,.bs-pd-input:focus-visible { outline:none !important; border-color:#7C5CFF !important; box-shadow:0 0 0 3px rgba(124,92,255,0.15); }
        .bs-pd-btn:hover:not(:disabled) { background:#6B4EE6 !important; }
        .bs-pd-ghost:hover:not(:disabled) { background:${T.elev} !important; }
      `}</style>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: T.card, borderBottom: `1px solid ${T.border}`,
        padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, background: T.accent,
          color: '#fff', fontWeight: 700, fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>B</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, lineHeight: 1 }}>Partner Dashboard</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{profile.store_name || profile.legal_name}</div>
        </div>
        <button onClick={toggleTheme} style={iconBtn(T)} aria-label="Toggle theme">{isDark ? '☀' : '☾'}</button>
        <button onClick={signOut} style={btnGhost(T)}>Sign out</button>
      </div>

      {/* Status banner */}
      {isPending && (
        <Banner T={T} kind="info">
          Your application is under review. We'll email you within 3–5 business days.
        </Banner>
      )}
      {isRejected && (
        <Banner T={T} kind="error">
          Your application was not approved.
          {profile.reviewer_notes ? ` Reason: ${profile.reviewer_notes}` : ''}
        </Banner>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${T.border}`, marginBottom: 24 }}>
          <TabBtn T={T} active={tab==='overview'} onClick={() => setTab('overview')}>Overview</TabBtn>
          <TabBtn T={T} active={tab==='profile'} onClick={() => setTab('profile')}>Profile</TabBtn>
        </div>

        {tab === 'overview' && (
          <>
            {isApproved && affiliate && (
              <div style={{
                padding: 20, marginBottom: 24,
                background: `linear-gradient(135deg, ${T.accent}1f 0%, ${T.accent}0a 100%)`,
                border: `1px solid ${T.accent}40`, borderRadius: 16,
                display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
              }}>
                <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: T.accent, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Your referral code
                  </div>
                  <div style={{
                    fontSize: 20, fontWeight: 700, color: T.text,
                    fontFamily: "'SF Mono',Menlo,monospace", marginTop: 4, wordBreak: 'break-all',
                  }}>
                    {affiliate.referral_code}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>
                    Share this URL: <span style={{ color: T.text }}>buysub.ng/?ref={affiliate.referral_code}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const url = `https://buysub.ng/?ref=${affiliate.referral_code}`
                    navigator.clipboard?.writeText(url).catch(() => {})
                  }}
                  style={{ ...btnPrimary(T), flexShrink: 0 }}
                >
                  Copy link
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <StatCard T={T} label="Clicks" value={stats?.clicks ?? 0} />
              <StatCard T={T} label="Conversions" value={stats?.conversions ?? 0} />
              <StatCard T={T} label="Earnings (paid)" value={`₦${Number(stats?.earnings_ngn ?? 0).toLocaleString()}`} accent />
              <StatCard T={T} label="Pending" value={`₦${Number(stats?.pending_ngn ?? 0).toLocaleString()}`} />
            </div>

            {!isApproved && (
              <div style={{
                marginTop: 24, padding: 20,
                background: T.card, border: `1px solid ${T.border}`, borderRadius: 16,
                fontSize: 13, color: T.muted, lineHeight: 1.7,
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
            {saveState === 'error' && <Banner T={T} kind="error">{saveError}</Banner>}
            {saveState === 'saved' && <Banner T={T} kind="success">Changes saved</Banner>}

            <Section T={T} title="Contact">
              <Row><F T={T} label="Business email"><Inp T={T} value={form.business_email || ''} onChange={v => updateField('business_email', v)} /></F>
                   <F T={T} label="Business phone"><Inp T={T} value={form.business_phone || ''} onChange={v => updateField('business_phone', v)} /></F></Row>
              <Row><F T={T} label="Alternate phone"><Inp T={T} value={form.alternate_phone || ''} onChange={v => updateField('alternate_phone', v)} /></F>
                   <F T={T} label="Owner phone"><Inp T={T} value={form.owner_phone || ''} onChange={v => updateField('owner_phone', v)} /></F></Row>
              <Row><F T={T} label="Preferred contact method">
                     <Sel T={T} value={form.contact_method || ''} onChange={v => updateField('contact_method', v)}
                          options={['','WhatsApp','Phone Call','Email','SMS']} />
                   </F>
                   <F T={T} label="Owner location"><Inp T={T} value={form.owner_location || ''} onChange={v => updateField('owner_location', v)} /></F></Row>
            </Section>

            <Section T={T} title="Address">
              <F T={T} label="Business address"><Inp T={T} value={form.address || ''} onChange={v => updateField('address', v)} /></F>
              <Row><F T={T} label="LGA"><Inp T={T} value={form.lga || ''} onChange={v => updateField('lga', v)} /></F>
                   <F T={T} label="State"><Inp T={T} value={form.state || ''} onChange={v => updateField('state', v)} /></F></Row>
            </Section>

            <Section T={T} title="Payout">
              <Row>
                <F T={T} label="Payout frequency">
                  <Sel T={T} value={form.payout_frequency || ''} onChange={v => updateField('payout_frequency', v)}
                       options={['','Monthly','Quarterly','Biannual','Annual']} />
                </F>
                <F T={T} label="Payout method">
                  <Sel T={T} value={form.payout_method || ''} onChange={v => updateField('payout_method', v)}
                       options={['','Bank Transfer','Crypto']} />
                </F>
              </Row>
              {form.payout_method === 'Bank Transfer' && (<>
                <F T={T} label="Bank name"><Inp T={T} value={form.bank_name || ''} onChange={v => updateField('bank_name', v)} /></F>
                <Row><F T={T} label="Account name"><Inp T={T} value={form.account_name || ''} onChange={v => updateField('account_name', v)} /></F>
                     <F T={T} label="Account number"><Inp T={T} value={form.account_number || ''} onChange={v => updateField('account_number', v)} maxLength={10} /></F></Row>
              </>)}
              {form.payout_method === 'Crypto' && (<>
                <Row><F T={T} label="Token"><Inp T={T} value={form.crypto_token || ''} onChange={v => updateField('crypto_token', v)} /></F>
                     <F T={T} label="Chain"><Inp T={T} value={form.crypto_chain || ''} onChange={v => updateField('crypto_chain', v)} /></F></Row>
                <F T={T} label="Wallet address"><Inp T={T} value={form.wallet_address || ''} onChange={v => updateField('wallet_address', v)} /></F>
              </>)}
            </Section>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={saveProfile}
                disabled={saveState === 'saving'}
                className="bs-pd-btn"
                style={{ ...btnPrimary(T), opacity: saveState === 'saving' ? 0.6 : 1 }}
              >
                {saveState === 'saving' ? 'Saving…' : 'Save changes'}
              </button>
              <button
                onClick={() => { setForm(profile); setSaveState('idle') }}
                className="bs-pd-ghost"
                style={btnGhost(T)}
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
function Center({ T, children }: any) {
  return (
    <div style={{ background: T.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Inter',-apple-system,sans-serif" }}>
      {children}
    </div>
  )
}

function Banner({ T, kind, children }: { T: any; kind: 'info'|'success'|'error'; children: React.ReactNode }) {
  const c = kind === 'success' ? '#22c55e' : kind === 'error' ? '#ef4444' : T.accent
  const bg = kind === 'success' ? 'rgba(34,197,94,0.1)' : kind === 'error' ? 'rgba(239,68,68,0.1)' : `rgba(124,92,255,0.1)`
  return (
    <div style={{ margin: '0 auto', padding: '12px 24px', background: bg, borderBottom: `1px solid ${c}40`, color: c, fontSize: 13, textAlign: 'center' }}>
      {children}
    </div>
  )
}

function StatCard({ T, label, value, accent }: any) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontSize: 11, color: T.muted, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent ? T.accent : T.text, marginTop: 6, letterSpacing: '-0.01em' }}>{value}</div>
    </div>
  )
}

function TabBtn({ T, active, onClick, children }: any) {
  return (
    <button onClick={onClick}
      style={{ padding: '10px 16px', background: 'transparent', border: 'none',
        borderBottom: `2px solid ${active ? T.accent : 'transparent'}`,
        color: active ? T.text : T.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: -1 }}>
      {children}
    </button>
  )
}

function Section({ T, title, children }: any) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 14 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  )
}
function Row({ children }: any) { return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div> }
function F({ T, label, children }: any) {
  return (
    <div>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 6, fontWeight: 500 }}>{label}</div>
      {children}
    </div>
  )
}
type InputProps = {
  T: any
  value: string
  onChange: (v: string) => void
  maxLength?: number
}
type SelectProps = {
  T: any
  value: string
  onChange: (v: string) => void
  options: string[]
}

function Inp({ T, value, onChange, maxLength }: InputProps) {
  return (
    <input className="bs-pd-input" value={value ?? ''} onChange={e => onChange(e.target.value)} maxLength={maxLength}
      style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 10,
        background: T.elev, border: `1px solid ${T.border}`, color: T.text, fontSize: 14,
        outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
  )
}
function Sel({ T, value, onChange, options }: SelectProps) {
  return (
    <select className="bs-pd-input" value={value ?? ''} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 10,
        background: T.elev, border: `1px solid ${T.border}`, color: T.text, fontSize: 14,
        outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}>
      {options.map((o: string) => <option key={o} value={o}>{o || 'Select…'}</option>)}
    </select>
  )
}
function btnPrimary(T: any): React.CSSProperties { return { display: 'inline-block', height: 44, padding: '0 22px', borderRadius: 10, background: T.accent, border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', lineHeight: '44px' } }
function btnGhost(T: any): React.CSSProperties { return { height: 40, padding: '0 16px', borderRadius: 10, background: 'transparent', border: `1px solid ${T.border}`, color: T.text, fontSize: 13, fontWeight: 500, cursor: 'pointer' } }
function iconBtn(T: any): React.CSSProperties { return { width: 36, height: 36, borderRadius: 10, background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' } }