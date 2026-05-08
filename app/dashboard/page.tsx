'use client'

// ================================================================
// BUYSUB — CUSTOMER DASHBOARD
// File: app/dashboard/page.tsx
//
// Tabs: Orders · Messages · Wallet · Profile
// Auth: Supabase session from localStorage (same domain)
// Theme: BuySub design tokens (CSS variables)
// ================================================================

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || ''
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const API           = process.env.NEXT_PUBLIC_API_BASE || 'https://buysub-api-v2.ebuka-nwaju.workers.dev'
const LOGO_DEV_TOKEN = 'pk_S77F38yQR6WQWErhPEEp1w'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ── helpers ──────────────────────────────────────────────────────
const fmt     = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG')}`
const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}
const fmtFull = (iso: string) => {
  try { return new Date(iso).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}
const initials = (name: string) =>
  (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const statusColor = (s: string) => {
  if (s === 'paid' || s === 'approved') return { bg: 'rgba(22,163,74,0.12)', color: '#16a34a' }
  if (s === 'pending_manual' || s === 'pending') return { bg: 'rgba(217,119,6,0.12)', color: '#d97706' }
  if (s === 'cancelled' || s === 'rejected') return { bg: 'rgba(220,38,38,0.12)', color: '#dc2626' }
  return { bg: 'rgba(107,107,126,0.12)', color: '#6b6b7e' }
}

// ── read Supabase token from localStorage ────────────────────────
function readSession(): { token: string; userId: string; email: string } | null {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const s = JSON.parse(localStorage.getItem(key) || '{}')
        if (s?.access_token && s?.user) {
          if (s.expires_at && s.expires_at * 1000 < Date.now()) {
            localStorage.removeItem(key)
            return null
          }
          return { token: s.access_token, userId: s.user.id, email: s.user.email || '' }
        }
      }
    }
  } catch {}
  return null
}

async function apiFetch(path: string, token: string, opts: RequestInit = {}) {
  try {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(opts.headers || {}),
      },
    })
    const data = await res.json()
    if (res.status === 401) { window.location.href = '/login'; return { ok: false } }
    return data
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

// ── types ─────────────────────────────────────────────────────────
type Tab = 'orders' | 'messages' | 'wallet' | 'profile'

interface Order {
  id: string; order_ref: string; status: string; total_ngn: number
  subtotal_ngn: number; discount_ngn: number; payment_method: string
  currency: string; created_at: string; order_items?: any[]
}
interface Message {
  id: string; subject: string; product_name: string | null
  product_domain: string | null; body: string; is_read: boolean
  created_at: string; expires_at: string | null
}
interface WalletTx {
  id: string
  type: string
  amount_ngn: number | string  // ← FIX
  source: string
  reference: string | null
  note: string | null
  created_at: string
}
interface Profile {
  full_name: string; phone: string; email: string; avatar_url: string | null
}

// ================================================================
// MAIN COMPONENT
// ================================================================
export default function CustomerDashboard() {
  const [session, setSession]   = useState<ReturnType<typeof readSession>>(null)
  const [mounted, setMounted]   = useState(false)
  const [tab, setTab]           = useState<Tab>('orders')

  // data
  const [orders,   setOrders]   = useState<Order[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [wallet,   setWallet]   = useState<{ balance_ngn: number } | null>(null)
  const [txns,     setTxns]     = useState<WalletTx[]>([])
  const [profile,  setProfile]  = useState<Profile | null>(null)

  // ui state
  const [loading,       setLoading]       = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [openMessage,   setOpenMessage]   = useState<Message | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileForm,   setProfileForm]   = useState<Profile>({ full_name: '', phone: '', email: '', avatar_url: null })
  const [pwForm,        setPwForm]        = useState({ current: '', next: '', confirm: '' })
  const [pwError,       setPwError]       = useState('')
  const [pwSuccess,     setPwSuccess]     = useState('')
  const [pwLoading,     setPwLoading]     = useState(false)

  // ── mount: read session ────────────────────────────────────────
  useEffect(() => {
    setMounted(true)
    const s = readSession()
    if (!s) { window.location.href = '/login'; return }
    setSession(s)
  }, [])

  // ── load data for current tab ──────────────────────────────────
  const loadTab = useCallback(async (t: Tab, token: string) => {
    setLoading(true)
    if (t === 'orders') {
      const r = await apiFetch('/v2/me/orders', token)
      if (r.ok) setOrders(r.data || [])
    }
    if (t === 'messages') {
      const r = await apiFetch('/v2/me/messages', token)
      if (r.ok) setMessages(r.data || [])
    }
    if (t === 'wallet') {
      const [wr, tr] = await Promise.all([
        apiFetch('/v2/me/wallet', token),
        apiFetch('/v2/me/wallet/transactions', token),
      ])
      if (wr.ok) setWallet(wr.data)
      if (tr.ok) setTxns(tr.data || [])
    }
    if (t === 'profile') {
      const r = await apiFetch('/v2/me', token)
      if (r.ok) {
        setProfile(r.data)
        setProfileForm({ full_name: r.data.full_name || '', phone: r.data.phone || '', email: r.data.email || '', avatar_url: r.data.avatar_url })
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!session) return
    loadTab(tab, session.token)
  }, [session, tab])

  // ── mark message read ──────────────────────────────────────────
  const markRead = async (msg: Message) => {
    setOpenMessage(msg)
    if (!msg.is_read && session) {
      await apiFetch(`/v2/me/messages/${msg.id}/read`, session.token, { method: 'PATCH' })
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m))
    }
  }

  // ── save profile ───────────────────────────────────────────────
  const saveProfile = async () => {
    if (!session) return
    setProfileSaving(true)
    const r = await apiFetch('/v2/me', session.token, {
      method: 'PATCH',
      body: JSON.stringify({ full_name: profileForm.full_name, phone: profileForm.phone }),
    })
    setProfileSaving(false)
    if (r.ok) setProfile(prev => ({ ...prev!, ...profileForm }))
  }

  // ── change password ────────────────────────────────────────────
  const changePassword = async () => {
    setPwError('')
    setPwSuccess('')
    if (!pwForm.current) { setPwError('Current password is required'); return }
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters'); return }
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match'); return }
    setPwLoading(true)
    // Verify current password
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: session?.email || '',
      password: pwForm.current,
    })
    if (authErr) { setPwError('Current password is incorrect'); setPwLoading(false); return }
    const { error: updateErr } = await supabase.auth.updateUser({ password: pwForm.next })
    setPwLoading(false)
    if (updateErr) { setPwError(updateErr.message); return }
    setPwSuccess('Password changed successfully.')
    setPwForm({ current: '', next: '', confirm: '' })
  }

  // ── sign out ───────────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (!mounted) return null

  const firstName = (profile?.full_name || session?.email || '').split(' ')[0] || 'You'
  const unreadCount = messages.filter(m => !m.is_read).length

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'var(--bs-bg-base)',
      minHeight: '100vh',
      color: 'var(--bs-text-primary)',
      fontFamily: 'Inter, sans-serif',
    }}>
      <style>{`
        .bs-dash-tab:hover { color: var(--bs-text-primary) !important; }
        .bs-dash-card { transition: border-color .15s; }
        .bs-dash-card:hover { border-color: var(--bs-border-strong) !important; }
        .bs-dash-input:focus { outline: none; border-color: #7C5CFF !important; }
        @keyframes bsDashFade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .bs-dash-animate { animation: bsDashFade .2s ease; }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav style={{
        height: 64, borderBottom: '1px solid var(--bs-border-default)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', background: 'var(--bs-bg-card)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <a href="/shop" style={{ fontWeight: 700, fontSize: 18, color: 'var(--bs-text-primary)', textDecoration: 'none' }}>
          BuySub
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/shop" style={{ fontSize: 13, color: 'var(--bs-text-secondary)', textDecoration: 'none' }}>Shop</a>
          {/* Avatar chip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bs-bg-elevated)', border: '1px solid var(--bs-border-default)',
            borderRadius: 999, padding: '6px 14px 6px 8px', cursor: 'pointer',
          }} onClick={signOut} title="Sign out">
            <div style={{
              width: 28, height: 28, borderRadius: 999, background: '#7C5CFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {initials(profile?.full_name || session?.email || '')}
            </div>
            <span style={{ fontSize: 13, color: 'var(--bs-text-primary)', fontWeight: 500 }}>{firstName}</span>
          </div>
        </div>
      </nav>

      {/* ── LAYOUT ──────────────────────────────────────────────── */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 80px' }}>
        
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--bs-text-primary)' }}>My Dashboard</div>
          <div style={{ fontSize: 13, color: 'var(--bs-text-muted)', marginTop: 4 }}>{session?.email}</div>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: '1px solid var(--bs-border-default)',
          marginBottom: 28, overflowX: 'auto',
        }}>
          {([
            { id: 'orders',   label: 'Orders' },
            { id: 'messages', label: unreadCount > 0 ? `Messages  ${unreadCount}` : 'Messages' },
            { id: 'wallet',   label: 'Wallet' },
            { id: 'profile',  label: 'Profile' },
          ] as { id: Tab; label: string }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className="bs-dash-tab" style={{
              padding: '12px 20px', fontSize: 13, border: 'none', cursor: 'pointer',
              background: 'transparent', whiteSpace: 'nowrap',
              color: tab === t.id ? '#7C5CFF' : 'var(--bs-text-muted)',
              borderBottom: tab === t.id ? '2px solid #7C5CFF' : '2px solid transparent',
              fontWeight: tab === t.id ? 600 : 400, transition: 'all .15s',
              fontFamily: 'Inter, sans-serif',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── ORDERS ────────────────────────────────────────────── */}
        {tab === 'orders' && (
          <div className="bs-dash-animate">
            {loading ? <LoadingState /> : orders.length === 0 ? (
              <EmptyState icon="📦" title="No orders yet" sub="Your purchase history will appear here." cta="Browse shop" ctaHref="/shop" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {orders.map(o => {
                  const sc = statusColor(o.status)
                  const isExp = expandedOrder === o.id
                  return (
                    <div key={o.id} className="bs-dash-card" style={{
                      background: 'var(--bs-bg-card)', border: '1px solid var(--bs-border-subtle)',
                      borderRadius: 16, overflow: 'hidden',
                    }}>
                      {/* Compact row */}
                      <div onClick={() => setExpandedOrder(isExp ? null : o.id)} style={{
                        padding: '16px 20px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: 'var(--bs-text-primary)' }}>{o.order_ref}</span>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color, fontWeight: 500 }}>
                              {o.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--bs-text-muted)', marginTop: 4 }}>{fmtDate(o.created_at)}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <span style={{ fontSize: 16, fontWeight: 700 }}>{fmt(o.total_ngn)}</span>
                          <span style={{ color: 'var(--bs-text-muted)', fontSize: 12 }}>{isExp ? '▾' : '▸'}</span>
                        </div>
                      </div>

                      {/* Expanded */}
                      {isExp && (
                        <div style={{ borderTop: '1px solid var(--bs-border-subtle)', padding: '16px 20px' }}>
                          {o.order_items && o.order_items.length > 0 && (
                            <div style={{ marginBottom: 14 }}>
                              {o.order_items.map((it: any, i: number) => (
                                <div key={i} style={{
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  padding: '8px 0', borderBottom: i < o.order_items!.length - 1 ? '1px solid var(--bs-border-subtle)' : 'none', gap: 10,
                                }}>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--bs-text-primary)' }}>{it.product_name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--bs-text-muted)' }}>
                                      {it.billing_period} · ×{it.quantity}
                                    </div>
                                  </div>
                                  <span style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{fmt(it.total_price_ngn || it.unit_price_ngn * it.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--bs-border-subtle)', paddingTop: 12 }}>
                            {o.discount_ngn > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#16a34a' }}>
                                <span>Discount</span><span>−{fmt(o.discount_ngn)}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                              <span>Total paid</span><span>{fmt(o.total_ngn)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--bs-text-muted)' }}>
                              <span>Payment</span><span style={{ textTransform: 'capitalize' }}>{(o.payment_method || '').replace(/_/g, ' ')}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MESSAGES ──────────────────────────────────────────── */}
        {tab === 'messages' && (
          <div className="bs-dash-animate">
            {loading ? <LoadingState /> : messages.length === 0 ? (
              <EmptyState icon="📬" title="No messages" sub="Product details and delivery info from BuySub will appear here." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.map(m => (
                  <div key={m.id} className="bs-dash-card" onClick={() => markRead(m)} style={{
                    background: 'var(--bs-bg-card)', border: `1px solid ${m.is_read ? 'var(--bs-border-subtle)' : '#7C5CFF44'}`,
                    borderRadius: 16, padding: '16px 20px', cursor: 'pointer',
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                    opacity: m.is_read ? 0.85 : 1,
                  }}>
                    {/* Product logo or envelope */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: m.product_domain ? 'var(--bs-bg-elevated)' : 'rgba(124,92,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', border: '1px solid var(--bs-border-subtle)',
                    }}>
                      {m.product_domain ? (
                        <img src={`https://img.logo.dev/${m.product_domain}?token=${LOGO_DEV_TOKEN}&size=64&theme=dark`} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <span style={{ fontSize: 18 }}>📨</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        {!m.is_read && (
                          <div style={{ width: 7, height: 7, borderRadius: 999, background: '#7C5CFF', flexShrink: 0 }} />
                        )}
                        <div style={{ fontSize: 13, fontWeight: m.is_read ? 500 : 700, color: 'var(--bs-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.subject}
                        </div>
                      </div>
                      {m.product_name && (
                        <div style={{ fontSize: 11, color: '#7C5CFF', marginBottom: 3 }}>{m.product_name}</div>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--bs-text-muted)' }}>{fmtDate(m.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Message detail modal */}
            {openMessage && (
              <>
                <div onClick={() => setOpenMessage(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} />
                <div style={{
                  position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                  width: 'min(560px, calc(100vw - 32px))', maxHeight: '80vh',
                  background: 'var(--bs-bg-card)', border: '1px solid var(--bs-border-default)',
                  borderRadius: 20, zIndex: 201, display: 'flex', flexDirection: 'column',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
                }}>
                  <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--bs-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                    <div style={{ minWidth: 0, flex: 1, paddingRight: 12 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--bs-text-primary)', marginBottom: 3 }}>{openMessage.subject}</div>
                      {openMessage.product_name && <div style={{ fontSize: 12, color: '#7C5CFF' }}>{openMessage.product_name}</div>}
                      <div style={{ fontSize: 11, color: 'var(--bs-text-muted)', marginTop: 4 }}>{fmtFull(openMessage.created_at)}</div>
                    </div>
                    <button onClick={() => setOpenMessage(null)} style={{ background: 'transparent', border: 'none', color: 'var(--bs-text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1, flexShrink: 0 }}>×</button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                    <pre style={{
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      fontSize: 13, lineHeight: 1.8, color: 'var(--bs-text-primary)',
                      fontFamily: 'ui-monospace, "Cascadia Code", Menlo, monospace',
                      background: 'var(--bs-bg-elevated)', border: '1px solid var(--bs-border-subtle)',
                      borderRadius: 12, padding: 16, margin: 0,
                    }}>
                      {openMessage.body}
                    </pre>
                    {openMessage.expires_at && (
                      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--bs-text-muted)' }}>
                        ⏱ Expires {fmtDate(openMessage.expires_at)}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── WALLET ────────────────────────────────────────────── */}
        {tab === 'wallet' && (
          <div className="bs-dash-animate">
            {loading ? <LoadingState /> : (
              <>
                {/* Balance card */}
                <div style={{
                  background: 'linear-gradient(135deg, #7C5CFF 0%, #5B3FD4 100%)',
                  borderRadius: 20, padding: '28px 28px 24px',
                  marginBottom: 24, color: '#fff',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, marginBottom: 10 }}>
                    BuySub Wallet
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>
                    {fmt(wallet?.balance_ngn ?? 0)}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Available credit · can be used at checkout
                  </div>
                </div>

                {/* Transactions */}
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--bs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                  Transaction History
                </div>
                {txns.length === 0 ? (
                  <EmptyState icon="💳" title="No transactions yet" sub="Wallet top-ups and credits will appear here." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {txns.map(tx =>  {
                    const amount = Number(tx.amount_ngn)

                    return (
                      <div key={tx.id} style={{
                        background: 'var(--bs-bg-card)', border: '1px solid var(--bs-border-subtle)',
                        borderRadius: 14, padding: '14px 18px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                      }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--bs-text-primary)', textTransform: 'capitalize' }}>
                                {(() => {
                                    const labelMap: Record<string, string> = {
                                        admin_topup: 'Manual Top-up',
                                        refund: 'Order Refund',
                                        promotion: 'Promotion/Bonus',
                                        compensation: 'Compensation',
                                    }

                                    const raw = tx.reference || tx.note || tx.source || tx.type
                                    return (labelMap[raw] || raw).replace(/_/g, ' ')
                                })()}
                            </div>
                            {tx.note && <div style={{ fontSize: 11, color: 'var(--bs-text-muted)', marginTop: 2 }}>{tx.note}</div>}
                            <div style={{ fontSize: 11, color: 'var(--bs-text-muted)', marginTop: 2 }}>{fmtFull(tx.created_at)}</div>
                        </div>
                        <div style={{
                            fontSize: 15, fontWeight: 700, flexShrink: 0,
                            color: tx.type === 'debit' ? '#dc2626' : '#16a34a',
                        }}>
                            {tx.type === 'debit' ? '−' : '+'}{fmt(amount)}
                        </div>
                      </div>
                    )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── PROFILE ───────────────────────────────────────────── */}
        {tab === 'profile' && (
          <div className="bs-dash-animate">
            {loading ? <LoadingState /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                
                {/* Avatar + name */}
                <div style={{
                  background: 'var(--bs-bg-card)', border: '1px solid var(--bs-border-subtle)',
                  borderRadius: 20, padding: '24px',
                  display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
                }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 999, background: '#7C5CFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>
                    {initials(profile?.full_name || session?.email || '')}
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--bs-text-primary)' }}>
                      {profile?.full_name || session?.email}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--bs-text-muted)', marginTop: 2 }}>{session?.email}</div>
                  </div>
                </div>

                {/* Edit form */}
                <SectionCard title="Personal Info">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                    <FieldGroup label="Full Name">
                      <input className="bs-dash-input" style={inputStyle} value={profileForm.full_name}
                        onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Your name" />
                    </FieldGroup>
                    <FieldGroup label="Phone">
                      <input className="bs-dash-input" style={inputStyle} value={profileForm.phone}
                        onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} placeholder="080..." />
                    </FieldGroup>
                    <FieldGroup label="Email">
                      <input className="bs-dash-input" style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
                        value={profileForm.email} disabled placeholder="Email" />
                    </FieldGroup>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <button onClick={saveProfile} disabled={profileSaving} style={primaryBtn}>
                      {profileSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </SectionCard>

                {/* Change password */}
                <SectionCard title="Change Password">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <FieldGroup label="Current Password">
                      <input className="bs-dash-input" style={inputStyle} type="password"
                        value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} placeholder="••••••••" />
                    </FieldGroup>
                    <FieldGroup label="New Password">
                      <input className="bs-dash-input" style={inputStyle} type="password"
                        value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} placeholder="Min 8 characters" />
                    </FieldGroup>
                    <FieldGroup label="Confirm New Password">
                      <input className="bs-dash-input" style={inputStyle} type="password"
                        value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" />
                    </FieldGroup>
                    {pwError   && <div style={{ fontSize: 12, color: '#dc2626', padding: '8px 12px', background: 'rgba(220,38,38,0.08)', borderRadius: 8 }}>{pwError}</div>}
                    {pwSuccess && <div style={{ fontSize: 12, color: '#16a34a', padding: '8px 12px', background: 'rgba(22,163,74,0.08)', borderRadius: 8 }}>{pwSuccess}</div>}
                    <button onClick={changePassword} disabled={pwLoading} style={primaryBtn}>
                      {pwLoading ? 'Updating…' : 'Update Password'}
                    </button>
                  </div>
                </SectionCard>

                {/* Sign out */}
                <button onClick={signOut} style={{
                  width: '100%', height: 44, borderRadius: 12, background: 'transparent',
                  border: '1px solid var(--bs-border-default)', color: 'var(--bs-text-muted)',
                  fontSize: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}>Sign Out</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── shared style constants ────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  height: 42, padding: '0 14px', borderRadius: 10, fontSize: 13,
  width: '100%', background: 'var(--bs-bg-input)', border: '1px solid var(--bs-border-default)',
  color: 'var(--bs-text-primary)', boxSizing: 'border-box', outline: 'none',
  fontFamily: 'Inter, sans-serif',
}
const primaryBtn: React.CSSProperties = {
  height: 42, padding: '0 24px', borderRadius: 10, background: '#7C5CFF',
  border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
}

// ── micro components ─────────────────────────────────────────────
function LoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 72, borderRadius: 14, background: 'var(--bs-bg-card)',
          border: '1px solid var(--bs-border-subtle)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  )
}

function EmptyState({ icon, title, sub, cta, ctaHref }: { icon: string; title: string; sub: string; cta?: string; ctaHref?: string }) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--bs-text-primary)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--bs-text-muted)', marginBottom: 20 }}>{sub}</div>
      {cta && ctaHref && (
        <a href={ctaHref} style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 10, background: '#7C5CFF', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>{cta}</a>
      )}
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bs-bg-card)', border: '1px solid var(--bs-border-subtle)', borderRadius: 20, padding: '20px 24px' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--bs-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--bs-text-secondary)', marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  )
}