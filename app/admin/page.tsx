'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

// ── Config ──
const API = process.env.NEXT_PUBLIC_API_BASE || 'https://buysub-api-v2.ebuka-nwaju.workers.dev'

// ── Types ──
interface Stats {
  total_revenue: number; revenue_today: number; revenue_this_month: number
  orders_total: number; orders_today: number; orders_pending_manual: number
  orders_paid: number; orders_rejected_pending: number
  products_active: number; products_total: number; customers_total: number
  partners_pending: number
  top_products: { name: string; slug: string; order_count: number; revenue: number }[]
  recent_orders: any[]
  revenue_by_day: { day: string; revenue: number; orders: number }[]
}
interface Order {
  id: string; order_ref: string; status: string; total_ngn: number; subtotal_ngn: number
  discount_ngn: number; payment_method: string; currency: string; created_at: string
  updated_at: string; customer_name: string | null; customer_email: string | null
  customer_phone: string | null; notes: string | null
}
interface Product {
  id: string; name: string; slug: string; category: string; tags: string
  price_1m: number; price_3m: number; price_6m: number; price_1y: number
  billing_type: string; stock_status: string; status: string; domain: string
  short_description: string; featured: boolean; created_at: string; description: string
}
interface Customer {
  id: string; name: string; email: string; phone: string
  category: string; source: string; is_active: boolean; created_at: string
}
interface PartnerApp {
  id: string; legal_name: string; store_name: string; business_email: string
  owner_name: string; owner_phone: string; status: string; payout_method: string
  payout_frequency: string; state: string; lga: string; created_at: string
  reviewer_notes: string | null; business_phone: string; address: string
  cac_number: string | null; social_media: string | null; owner_email: string
  gender: string | null; contact_method: string | null
  bank_name: string | null; account_name: string | null; account_number: string | null
  crypto_token: string | null; crypto_chain: string | null; wallet_address: string | null
}
interface Pagination { page: number; limit: number; total: number; pages: number }

// ── Helpers ──
const fmt = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
const fmtFull = (iso: string) => `${fmtDate(iso)} ${fmtTime(iso)}`
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
const statusColor = (s: string, T: typeof light) => {
  if (s === 'paid' || s === 'approved' || s === 'in_stock' || s === 'active') return { bg: T.successBg, color: T.success }
  if (s === 'pending_manual' || s === 'pending_review' || s === 'pending') return { bg: T.warningBg, color: T.warning }
  if (s === 'cancelled' || s === 'rejected' || s === 'out_of_stock' || s === 'inactive' || s === 'suspended') return { bg: T.errorBg, color: T.error }
  if (s === 'rejected_pending') return { bg: '#fef3c7', color: '#92400e' }
  return { bg: T.muted + '20', color: T.muted }
}
const emptyPagination: Pagination = { page: 1, limit: 20, total: 0, pages: 0 }
const parsePagination = (r: any): Pagination => r?.meta?.pagination || r?.pagination || emptyPagination

// ── Theme ──
const light = {
  bg: '#f8f9fb', card: '#ffffff', elevated: '#f1f3f5', input: '#ffffff',
  border: '#e2e5e9', borderSubtle: '#eef0f3', text: '#1a1a2e', textSecondary: '#4a5568',
  muted: '#8896a6', accent: '#7C5CFF', accentHover: '#6B4EE6',
  success: '#059669', successBg: '#ecfdf5', warning: '#d97706', warningBg: '#fffbeb',
  error: '#dc2626', errorBg: '#fef2f2',
  shadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  shadowLg: '0 4px 12px rgba(0,0,0,0.08)',
}
const dark = {
  bg: '#0a0a0c', card: '#111114', elevated: '#18181c', input: '#111114',
  border: '#27272e', borderSubtle: '#1c1c22', text: '#e8e8ec', textSecondary: '#a0a0b0',
  muted: '#6b6b7e', accent: '#7C5CFF', accentHover: '#9B85FF',
  success: '#16a34a', successBg: 'rgba(34,197,94,0.12)', warning: '#d97706', warningBg: 'rgba(251,191,36,0.12)',
  error: '#dc2626', errorBg: 'rgba(239,68,68,0.12)',
  shadow: '0 1px 3px rgba(0,0,0,0.3)', shadowLg: '0 4px 12px rgba(0,0,0,0.4)',
}

const useTheme = () => {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const saved = localStorage.getItem('bs_admin_theme')
    setIsDark(saved === 'dark')
  }, [])
  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('bs_admin_theme', next ? 'dark' : 'light')
  }
  return { T: isDark ? dark : light, isDark, toggle }
}

// ── Auth ──
const getToken = (): string => {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const session = JSON.parse(localStorage.getItem(key) || '{}')
        if (session?.access_token) {
          // Check if token is expired
          if (session.expires_at && session.expires_at * 1000 < Date.now()) {
            localStorage.removeItem(key)
            return ''
          }
          return session.access_token
        }
      }
    }
  } catch { /* */ }
  return ''
}

const signOut = () => {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sb-') && key.endsWith('-auth-token')) localStorage.removeItem(key)
  })
  window.location.href = '/login'
}

const apiFetch = async (path: string, opts: RequestInit = {}) => {
  const token = getToken()
  if (!token) { signOut(); return { ok: false, error: 'Session expired' } }
  try {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(opts.headers || {}) },
    })
    const data = await res.json()
    if (res.status === 401 || res.status === 403) { signOut(); return { ok: false, error: 'Session expired' } }
    return data
  } catch (e: any) {
    return { ok: false, error: e.message || 'Network error' }
  }
}

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════

const TABS = ['Overview', 'Orders', 'Rejected', 'Products', 'Customers', 'Partners', 'Wallets', 'Affiliates', 'Links', 'Ads'] as const
type Tab = typeof TABS[number]

export default function AdminDashboard() {
  const { T, isDark, toggle } = useTheme()
  const [tab, setTab] = useState<Tab>('Overview')
  const [token, setToken] = useState('')

  useEffect(() => {
    const t = getToken()
    setToken(t)
    const interval = setInterval(() => {
      const current = getToken()
      if (!current) setToken('')
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  if (!token) {
    return (
      <Shell T={T} isDark={isDark} toggle={toggle}>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: T.text, marginBottom: 8 }}>Admin Access Required</div>
          <div style={{ fontSize: 14, color: T.muted, marginBottom: 24 }}>Your session has expired or you're not logged in.</div>
          <a href="/login" style={{
            display: 'inline-block', padding: '12px 32px', borderRadius: 10, background: T.accent,
            color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600,
          }}>Sign In</a>
        </div>
      </Shell>
    )
  }

  return (
    <Shell T={T} isDark={isDark} toggle={toggle}>
      <div style={{
        display: 'flex', gap: 2, borderBottom: `1px solid ${T.border}`,
        marginBottom: 24, overflowX: 'auto', paddingBottom: 0,
      }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 14px', fontSize: 13, border: 'none', cursor: 'pointer',
            background: 'transparent', color: tab === t ? T.accent : T.muted,
            borderBottom: tab === t ? `2px solid ${T.accent}` : '2px solid transparent',
            fontWeight: tab === t ? 600 : 400, whiteSpace: 'nowrap', transition: 'all 0.15s',
          }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab T={T} />}
      {tab === 'Orders' && <OrdersTab T={T} />}
      {tab === 'Rejected' && <RejectedTab T={T} />}
      {tab === 'Products' && <ProductsTab T={T} />}
      {tab === 'Customers' && <CustomersTab T={T} />}
      {tab === 'Partners' && <PartnersTab T={T} />}
      {tab === 'Wallets' && <WalletsTab T={T} />}
      {tab === 'Affiliates' && <AffiliatesTab T={T} />}
      {tab === 'Links' && <LinksTab T={T} />}
      {tab === 'Ads' && <AdsTab T={T} />}
    </Shell>
  )
}

// ════════════════════════════════════════════════════════════
// OVERVIEW
// ════════════════════════════════════════════════════════════

function OverviewTab({ T }: { T: typeof light }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/v2/admin/stats').then(r => {
      if (r.ok) setStats(r.data)
      else setError(r.error || 'Failed to load stats')
    }).catch(() => setError('Network error')).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading T={T} />
  if (error) return <ErrorMsg msg={error} T={T} />
  if (!stats) return null

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard T={T} label="Revenue Today" value={fmt(stats.revenue_today)} />
        <KpiCard T={T} label="Revenue (Month)" value={fmt(stats.revenue_this_month)} />
        <KpiCard T={T} label="Total Revenue" value={fmt(stats.total_revenue)} />
        <KpiCard T={T} label="Orders Today" value={String(stats.orders_today)} />
        <KpiCard T={T} label="Pending WhatsApp" value={String(stats.orders_pending_manual)} highlight={stats.orders_pending_manual > 0} />
        <KpiCard T={T} label="Active Products" value={`${stats.products_active} / ${stats.products_total}`} />
        <KpiCard T={T} label="Customers" value={String(stats.customers_total)} />
        <KpiCard T={T} label="Partners Pending" value={String(stats.partners_pending)} highlight={stats.partners_pending > 0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        <Card T={T} title="Top Products (by revenue)">
          {(!stats.top_products || stats.top_products.length === 0) && <EmptyState T={T} text="No sales data yet" />}
          {stats.top_products?.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < stats.top_products.length - 1 ? `1px solid ${T.borderSubtle}` : 'none' }}>
              <div>
                <div style={{ fontSize: 13, color: T.text }}>{p.name}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{p.order_count} orders</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{fmt(p.revenue)}</div>
            </div>
          ))}
        </Card>

        <Card T={T} title="Recent Orders">
          {(!stats.recent_orders || stats.recent_orders.length === 0) && <EmptyState T={T} text="No orders yet" />}
          {stats.recent_orders?.map((o: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < stats.recent_orders.length - 1 ? `1px solid ${T.borderSubtle}` : 'none', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: T.text, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{o.order_ref}</span>
                  <Badge status={o.status} T={T} />
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                  {o.customer_name || o.customer_email || '—'} · {fmtFull(o.created_at)}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, flexShrink: 0 }}>{fmt(o.total_ngn)}</div>
            </div>
          ))}
        </Card>
      </div>

      {stats.revenue_by_day && stats.revenue_by_day.length > 0 && (
        <Card T={T} title="Revenue (Last 30 Days)" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, paddingTop: 8 }}>
            {(() => {
              const max = Math.max(...stats.revenue_by_day.map(d => d.revenue), 1)
              return stats.revenue_by_day.map((d, i) => (
                <div key={i} title={`${fmtDate(d.day)}: ${fmt(d.revenue)} (${d.orders} orders)`} style={{
                  flex: 1, minWidth: 4, maxWidth: 20,
                  height: `${Math.max(2, (d.revenue / max) * 100)}%`,
                  background: T.accent, borderRadius: '3px 3px 0 0', cursor: 'help', opacity: 0.7,
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
                />
              ))
            })()}
          </div>
        </Card>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// ORDERS TAB (with day grouping, enhanced info)
// ════════════════════════════════════════════════════════════

function OrdersTab({ T }: { T: typeof light }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [pagination, setPagination] = useState<Pagination>(emptyPagination)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const searchTimer = useRef<any>(null)

  const load = useCallback(async (page = 1, status = statusFilter, q = search) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '30' })
    if (status) params.set('status', status)
    if (q) params.set('q', q)
    const r = await apiFetch(`/v2/admin/orders?${params}`)
    if (r.ok) { setOrders(r.data || []); setPagination(parsePagination(r)) }
    setLoading(false)
  }, [statusFilter, search])

  useEffect(() => { load() }, [])

  const onSearch = (q: string) => { setSearch(q); clearTimeout(searchTimer.current); searchTimer.current = setTimeout(() => load(1, statusFilter, q), 400) }
  const onStatusChange = (s: string) => { setStatusFilter(s); load(1, s, search) }

  const approveOrder = async (ref: string) => {
    if (!confirm(`Approve order ${ref}? This will mark it as paid.`)) return
    setActionLoading(ref)
    const r = await apiFetch(`/v2/admin/orders/${ref}/approve`, { method: 'POST', body: JSON.stringify({ payment_method: 'manual' }) })
    if (r.ok || r.data?.approved) await load(pagination.page)
    else alert(r.error || 'Failed to approve')
    setActionLoading(null)
  }

  const rejectOrder = async (ref: string) => {
    const reason = prompt('Reason for rejection (optional):')
    if (reason === null) return
    setActionLoading(ref)
    const r = await apiFetch(`/v2/admin/orders/${ref}/reject`, { method: 'POST', body: JSON.stringify({ reason }) })
    if (r.ok || r.data?.rejected) await load(pagination.page)
    else alert(r.error || 'Failed')
    setActionLoading(null)
  }

  const openReceipt = (ref: string) => { window.open(`/admin/receipt?ref=${ref}`, '_blank') }

  // Group orders by day
  const grouped: { day: string; orders: Order[] }[] = []
  let lastDay = ''
  for (const o of orders) {
    const d = dayKey(o.created_at)
    if (d !== lastDay) { grouped.push({ day: d, orders: [] }); lastDay = d }
    grouped[grouped.length - 1].orders.push(o)
  }

  const STATUSES = ['', 'pending', 'pending_manual', 'paid', 'cancelled', 'refunded']

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="Search by ref, name, or email…" value={search} onChange={e => onSearch(e.target.value)} style={inputStyle(T)} />
        <select value={statusFilter} onChange={e => onStatusChange(e.target.value)} style={{ ...inputStyle(T), width: 160, flex: 'none' }}>
          <option value="">All statuses</option>
          {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {loading ? <Loading T={T} /> : orders.length === 0 ? <EmptyState T={T} text="No orders found" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {grouped.map(group => (
            <div key={group.day}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 0 6px' }}>{group.day}</div>
              {group.orders.map(o => (
                <div key={o.id} style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 12, padding: '14px 18px', marginBottom: 8, boxShadow: T.shadow }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: T.text }}>{o.order_ref}</span>
                        <Badge status={o.status} T={T} />
                        <span style={{ fontSize: 11, color: T.muted }}>{o.currency}</span>
                      </div>
                      <div style={{ fontSize: 13, color: T.textSecondary }}>{o.customer_name || '—'}</div>
                      <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                        {[o.customer_email, o.customer_phone].filter(Boolean).join(' · ')} · {fmtTime(o.created_at)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{fmt(o.total_ngn)}</div>
                      <div style={{ fontSize: 11, color: T.muted }}>{o.payment_method || '—'}</div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {o.status === 'pending_manual' && (
                      <>
                        <SmallBtn T={T} color={T.success} onClick={() => approveOrder(o.order_ref)} disabled={actionLoading === o.order_ref}>
                          {actionLoading === o.order_ref ? '…' : '✓ Approve'}
                        </SmallBtn>
                        <SmallBtn T={T} color={T.error} onClick={() => rejectOrder(o.order_ref)} disabled={actionLoading === o.order_ref}>
                          ✕ Reject
                        </SmallBtn>
                      </>
                    )}
                    {o.status === 'paid' && (
                      <SmallBtn T={T} color={T.accent} onClick={() => openReceipt(o.order_ref)}>
                        📄 Receipt
                      </SmallBtn>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {pagination?.pages > 1 && <PaginationBar T={T} pagination={pagination} onPage={p => load(p)} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// REJECTED TAB (orders pending final rejection)
// ════════════════════════════════════════════════════════════

function RejectedTab({ T }: { T: typeof light }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await apiFetch('/v2/admin/orders?status=rejected_pending&limit=50')
    if (r.ok) setOrders(r.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [])

  const confirmReject = async (ref: string) => {
    if (!confirm(`Permanently reject order ${ref}? This cannot be undone.`)) return
    setActionLoading(ref)
    const r = await apiFetch(`/v2/admin/orders/${ref}/reject`, { method: 'POST', body: JSON.stringify({ confirm: true }) })
    if (r.ok || r.data?.rejected) await load()
    else alert(r.error || 'Failed')
    setActionLoading(null)
  }

  const undoReject = async (ref: string) => {
    setActionLoading(ref)
    const r = await apiFetch(`/v2/admin/orders/${ref}/undo-reject`, { method: 'POST' })
    if (r.ok || r.data?.undone) await load()
    else alert(r.error || 'Failed')
    setActionLoading(null)
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 16, padding: '10px 14px', background: T.warningBg, borderRadius: 10, border: `1px solid ${T.warning}30` }}>
        Orders here were rejected but need a second confirmation before being permanently cancelled. Use "Undo" to restore them to the pending queue.
      </div>

      {loading ? <Loading T={T} /> : orders.length === 0 ? <EmptyState T={T} text="No rejected orders pending confirmation" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.map(o => (
            <div key={o.id} style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 12, padding: '14px 18px', boxShadow: T.shadow }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: T.text }}>{o.order_ref}</span>
                    <Badge status="rejected_pending" T={T} />
                  </div>
                  <div style={{ fontSize: 13, color: T.textSecondary }}>{o.customer_name || o.customer_email || '—'}</div>
                  {o.notes && <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>Reason: {o.notes}</div>}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{fmt(o.total_ngn)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <SmallBtn T={T} color={T.success} onClick={() => undoReject(o.order_ref)} disabled={actionLoading === o.order_ref}>
                  ↩ Undo (Restore)
                </SmallBtn>
                <SmallBtn T={T} color={T.error} onClick={() => confirmReject(o.order_ref)} disabled={actionLoading === o.order_ref}>
                  ✕ Confirm Rejection
                </SmallBtn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// PRODUCTS TAB (card layout with actions)
// ════════════════════════════════════════════════════════════

function ProductsTab({ T }: { T: typeof light }) {
  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<Pagination>(emptyPagination)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const searchTimer = useRef<any>(null)

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '50' })
    if (statusFilter) params.set('status', statusFilter)
    if (search) params.set('q', search)
    const r = await apiFetch(`/v2/admin/products?${params}`)
    if (r.ok) { setProducts(r.data || []); setPagination(parsePagination(r)) }
    setLoading(false)
  }, [statusFilter, search])

  useEffect(() => { load() }, [])

  const onSearch = (q: string) => { setSearch(q); clearTimeout(searchTimer.current); searchTimer.current = setTimeout(() => load(1), 400) }

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))

  const filtered = categoryFilter ? products.filter(p => p.category?.toLowerCase().includes(categoryFilter.toLowerCase())) : products

  const toggleStatus = async (p: Product) => {
    const newStatus = p.status === 'active' ? 'inactive' : 'active'
    const r = await apiFetch(`/v2/admin/products/${p.id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) })
    if (r.ok) setProducts(prev => prev.map(x => x.id === p.id ? { ...x, status: newStatus } : x))
  }

  const toggleStock = async (p: Product) => {
    const newStock = p.stock_status === 'in_stock' ? 'out_of_stock' : 'in_stock'
    const r = await apiFetch(`/v2/admin/products/${p.id}`, { method: 'PATCH', body: JSON.stringify({ stock_status: newStock }) })
    if (r.ok) setProducts(prev => prev.map(x => x.id === p.id ? { ...x, stock_status: newStock } : x))
  }

  const deleteProduct = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    const r = await apiFetch(`/v2/admin/products/${p.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'archived' }) })
    if (r.ok) setProducts(prev => prev.filter(x => x.id !== p.id))
  }

  const startEdit = (p: Product) => {
    setEditingId(p.id)
    setEditForm({ name: p.name, price_1m: p.price_1m, price_3m: p.price_3m, price_6m: p.price_6m, price_1y: p.price_1y, category: p.category, tags: p.tags, short_description: p.short_description })
  }

  const saveEdit = async () => {
    if (!editingId) return
    const r = await apiFetch(`/v2/admin/products/${editingId}`, { method: 'PATCH', body: JSON.stringify(editForm) })
    if (r.ok) { setProducts(prev => prev.map(x => x.id === editingId ? { ...x, ...editForm } : x)); setEditingId(null) }
    else alert(r.error || 'Failed to save')
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="Search products…" value={search} onChange={e => onSearch(e.target.value)} style={inputStyle(T)} />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setTimeout(() => load(1), 0) }} style={{ ...inputStyle(T), width: 130, flex: 'none' }}>
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ ...inputStyle(T), width: 160, flex: 'none' }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <Loading T={T} /> : filtered.length === 0 ? <EmptyState T={T} text="No products found" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map(p => (
            <div key={p.id} style={{
              background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 14,
              padding: '18px 20px', boxShadow: T.shadow, opacity: p.status === 'inactive' ? 0.6 : 1,
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              {editingId === p.id ? (
                /* Edit mode */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Name" style={inputStyle(T)} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <input type="number" value={editForm.price_1m} onChange={e => setEditForm({ ...editForm, price_1m: Number(e.target.value) })} placeholder="1M" style={inputStyle(T)} />
                    <input type="number" value={editForm.price_3m} onChange={e => setEditForm({ ...editForm, price_3m: Number(e.target.value) })} placeholder="3M" style={inputStyle(T)} />
                    <input type="number" value={editForm.price_6m} onChange={e => setEditForm({ ...editForm, price_6m: Number(e.target.value) })} placeholder="6M" style={inputStyle(T)} />
                    <input type="number" value={editForm.price_1y} onChange={e => setEditForm({ ...editForm, price_1y: Number(e.target.value) })} placeholder="1Y" style={inputStyle(T)} />
                  </div>
                  <input value={editForm.category || ''} onChange={e => setEditForm({ ...editForm, category: e.target.value })} placeholder="Category" style={inputStyle(T)} />
                  <input value={editForm.tags || ''} onChange={e => setEditForm({ ...editForm, tags: e.target.value })} placeholder="Tags" style={inputStyle(T)} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <SmallBtn T={T} color={T.success} onClick={saveEdit}>Save</SmallBtn>
                    <SmallBtn T={T} color={T.muted} onClick={() => setEditingId(null)}>Cancel</SmallBtn>
                  </div>
                </div>
              ) : (
                /* View mode */
                <>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: T.text, lineHeight: 1.3 }}>{p.name}</div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <Badge status={p.status} T={T} />
                        <Badge status={p.stock_status} T={T} />
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: T.accent, marginTop: 2 }}>{p.category}</div>
                    {p.tags && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{p.tags}</div>}
                    {p.domain && <div style={{ fontSize: 11, color: T.muted }}>{p.domain}</div>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                    {[{ l: '1M', v: p.price_1m }, { l: '3M', v: p.price_3m }, { l: '6M', v: p.price_6m }, { l: '1Y', v: p.price_1y }].map(x => (
                      <div key={x.l} style={{ background: T.elevated, borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: T.muted }}>{x.l}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: 'monospace' }}>{x.v ? fmt(x.v) : '—'}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <SmallBtn T={T} color={T.accent} onClick={() => startEdit(p)}>Edit</SmallBtn>
                    <SmallBtn T={T} color={p.status === 'active' ? T.muted : T.success} onClick={() => toggleStatus(p)}>
                      {p.status === 'active' ? 'Deactivate' : 'Activate'}
                    </SmallBtn>
                    <SmallBtn T={T} color={p.stock_status === 'in_stock' ? T.warning : T.success} onClick={() => toggleStock(p)}>
                      {p.stock_status === 'in_stock' ? 'Mark OOS' : 'Mark In Stock'}
                    </SmallBtn>
                    <SmallBtn T={T} color={T.error} onClick={() => deleteProduct(p)}>Delete</SmallBtn>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {pagination?.pages > 1 && <PaginationBar T={T} pagination={pagination} onPage={p => load(p)} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// CUSTOMERS TAB (now queries 'customers' table)
// ════════════════════════════════════════════════════════════

function CustomersTab({ T }: { T: typeof light }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [pagination, setPagination] = useState<Pagination>(emptyPagination)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchTimer = useRef<any>(null)

  const load = useCallback(async (page = 1, q = search) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (q) params.set('q', q)
    const r = await apiFetch(`/v2/admin/customers?${params}`)
    if (r.ok) { setCustomers(r.data || []); setPagination(parsePagination(r)) }
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [])
  const onSearch = (q: string) => { setSearch(q); clearTimeout(searchTimer.current); searchTimer.current = setTimeout(() => load(1, q), 400) }

  return (
    <div>
      <input placeholder="Search by name, email, or phone…" value={search} onChange={e => onSearch(e.target.value)} style={{ ...inputStyle(T), marginBottom: 16, maxWidth: 400 }} />

      {loading ? <Loading T={T} /> : customers.length === 0 ? <EmptyState T={T} text="No customers found" /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                {['Name', 'Email', 'Phone', 'Category', 'Source', 'Active', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${T.borderSubtle}` }}>
                  <td style={{ padding: '10px', color: T.text, fontWeight: 500 }}>{c.name || '—'}</td>
                  <td style={{ padding: '10px', color: T.textSecondary }}>{c.email || '—'}</td>
                  <td style={{ padding: '10px', color: T.textSecondary }}>{c.phone || '—'}</td>
                  <td style={{ padding: '10px', color: T.muted }}>{c.category || '—'}</td>
                  <td style={{ padding: '10px', color: T.muted }}>{c.source || '—'}</td>
                  <td style={{ padding: '10px' }}><Badge status={c.is_active ? 'active' : 'inactive'} T={T} /></td>
                  <td style={{ padding: '10px', color: T.muted, whiteSpace: 'nowrap' }}>{fmtDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination?.pages > 1 && <PaginationBar T={T} pagination={pagination} onPage={p => load(p)} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// PARTNERS, WALLETS, AFFILIATES, LINKS, ADS TABS
// (same as before but with T prop for theming + safe pagination)
// ════════════════════════════════════════════════════════════

function PartnersTab({ T }: { T: typeof light }) {
  const [apps, setApps] = useState<PartnerApp[]>([])
  const [pagination, setPagination] = useState<Pagination>(emptyPagination)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(async (page = 1, status = statusFilter) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (status) params.set('status', status)
    const r = await apiFetch(`/v2/admin/partners?${params}`)
    if (r.ok) { setApps(r.data || []); setPagination(parsePagination(r)) }
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [])

  const approve = async (id: string) => {
    const notes = prompt('Approval notes (optional):')
    if (notes === null) return
    setActionLoading(id)
    const r = await apiFetch(`/v2/admin/partners/${id}/approve`, { method: 'POST', body: JSON.stringify({ notes }) })
    if (r.ok) await load(pagination.page)
    else alert(r.error || 'Failed')
    setActionLoading(null)
  }

  const reject = async (id: string) => {
    const reason = prompt('Rejection reason:')
    if (!reason) return
    setActionLoading(id)
    const r = await apiFetch(`/v2/admin/partners/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) })
    if (r.ok) await load(pagination.page)
    else alert(r.error || 'Failed')
    setActionLoading(null)
  }

  return (
    <div>
      <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); load(1, e.target.value) }} style={{ ...inputStyle(T), width: 180, marginBottom: 16 }}>
        <option value="">All applications</option>
        <option value="pending_review">Pending Review</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>

      {loading ? <Loading T={T} /> : apps.length === 0 ? <EmptyState T={T} text="No partner applications" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {apps.map(a => (
            <div key={a.id} style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 12, overflow: 'hidden', boxShadow: T.shadow }}>
              <div onClick={() => setExpanded(expanded === a.id ? null : a.id)} style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: T.text, fontWeight: 500 }}>{a.legal_name}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{a.owner_name} · {a.business_email} · {a.state}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <Badge status={a.status} T={T} />
                  <span style={{ fontSize: 11, color: T.muted }}>{fmtDate(a.created_at)}</span>
                  <span style={{ color: T.muted }}>{expanded === a.id ? '▾' : '▸'}</span>
                </div>
              </div>
              {expanded === a.id && (
                <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${T.borderSubtle}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, padding: '16px 0' }}>
                    <DetailSection T={T} title="Business">
                      <DRow T={T} label="Store" value={a.store_name} /><DRow T={T} label="Address" value={a.address} />
                      <DRow T={T} label="LGA/State" value={`${a.lga}, ${a.state}`} /><DRow T={T} label="Phone" value={a.business_phone} />
                      <DRow T={T} label="CAC" value={a.cac_number || '—'} />
                    </DetailSection>
                    <DetailSection T={T} title="Owner">
                      <DRow T={T} label="Name" value={a.owner_name} /><DRow T={T} label="Email" value={a.owner_email} />
                      <DRow T={T} label="Phone" value={a.owner_phone} /><DRow T={T} label="Gender" value={a.gender || '—'} />
                    </DetailSection>
                    <DetailSection T={T} title="Payout">
                      <DRow T={T} label="Frequency" value={a.payout_frequency} /><DRow T={T} label="Method" value={a.payout_method} />
                      {a.bank_name && <DRow T={T} label="Bank" value={`${a.bank_name} - ${a.account_name}`} />}
                    </DetailSection>
                  </div>
                  {a.status === 'pending_review' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <SmallBtn T={T} color={T.success} onClick={() => approve(a.id)} disabled={actionLoading === a.id}>{actionLoading === a.id ? '…' : '✓ Approve'}</SmallBtn>
                      <SmallBtn T={T} color={T.error} onClick={() => reject(a.id)} disabled={actionLoading === a.id}>✕ Reject</SmallBtn>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {pagination?.pages > 1 && <PaginationBar T={T} pagination={pagination} onPage={p => load(p)} />}
    </div>
  )
}

function WalletsTab({ T }: { T: typeof light }) {
  const [txns, setTxns] = useState<any[]>([])
  const [pagination, setPagination] = useState<Pagination>(emptyPagination)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/v2/admin/wallets?page=1&limit=20').then(r => {
      if (r.ok) { setTxns(r.data || []); setPagination(parsePagination(r)) }
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading T={T} />
  if (txns.length === 0) return <EmptyState T={T} text="No wallet transactions yet" />
  return <div style={{ fontSize: 13, color: T.muted }}>Wallet transactions will appear here once customers start using their wallets.</div>
}

function AffiliatesTab({ T }: { T: typeof light }) {
  const [affiliates, setAffiliates] = useState<any[]>([])
  const [pagination, setPagination] = useState<Pagination>(emptyPagination)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(async (page = 1, status = statusFilter) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (status) params.set('status', status)
    const r = await apiFetch(`/v2/admin/affiliates?${params}`)
    if (r.ok) { setAffiliates(r.data || []); setPagination(parsePagination(r)) }
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [])

  const approve = async (id: string) => {
    const rate = prompt('Commission rate (%, default 5):', '5')
    if (rate === null) return
    setActionLoading(id)
    const r = await apiFetch(`/v2/admin/affiliates/${id}/approve`, { method: 'POST', body: JSON.stringify({ commission_rate: parseFloat(rate) || 5 }) })
    if (r.ok) await load(pagination.page)
    setActionLoading(null)
  }

  const suspend = async (id: string) => {
    setActionLoading(id)
    const r = await apiFetch(`/v2/admin/affiliates/${id}/suspend`, { method: 'POST', body: JSON.stringify({ reason: 'Admin action' }) })
    if (r.ok) await load(pagination.page)
    setActionLoading(null)
  }

  return (
    <div>
      <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); load(1, e.target.value) }} style={{ ...inputStyle(T), width: 160, marginBottom: 16 }}>
        <option value="">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="suspended">Suspended</option>
      </select>
      {loading ? <Loading T={T} /> : affiliates.length === 0 ? <EmptyState T={T} text="No affiliates" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {affiliates.map((a: any) => (
            <div key={a.id} style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 12, padding: '14px 18px', boxShadow: T.shadow, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{a.business_name || a.store_name || '—'}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                  Code: <span style={{ fontFamily: 'monospace', background: T.elevated, padding: '1px 6px', borderRadius: 4 }}>{a.referral_code}</span> · {a.commission_rate}%
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Badge status={a.status} T={T} />
                {a.status === 'pending' && <SmallBtn T={T} color={T.success} onClick={() => approve(a.id)} disabled={actionLoading === a.id}>Approve</SmallBtn>}
                {a.status === 'approved' && <SmallBtn T={T} color={T.warning} onClick={() => suspend(a.id)} disabled={actionLoading === a.id}>Suspend</SmallBtn>}
              </div>
            </div>
          ))}
        </div>
      )}
      {pagination?.pages > 1 && <PaginationBar T={T} pagination={pagination} onPage={p => load(p)} />}
    </div>
  )
}

function LinksTab({ T }: { T: typeof light }) {
  const [links, setLinks] = useState<any[]>([])
  const [pagination, setPagination] = useState<Pagination>(emptyPagination)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newSlug, setNewSlug] = useState(''); const [newDest, setNewDest] = useState(''); const [newTags, setNewTags] = useState('')
  const [creating, setCreating] = useState(false)
  const searchTimer = useRef<any>(null)

  const load = useCallback(async (page = 1, q = search) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (q) params.set('q', q)
    const r = await apiFetch(`/v2/admin/links?${params}`)
    if (r.ok) { setLinks(r.data || []); setPagination(parsePagination(r)) }
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [])
  const onSearch = (q: string) => { setSearch(q); clearTimeout(searchTimer.current); searchTimer.current = setTimeout(() => load(1, q), 400) }

  const createLink = async () => {
    if (!newDest) return; setCreating(true)
    const r = await apiFetch('/v2/admin/links', { method: 'POST', body: JSON.stringify({ slug: newSlug || undefined, destination_url: newDest, tags: newTags || undefined }) })
    if (r.ok) { setNewSlug(''); setNewDest(''); setNewTags(''); setShowCreate(false); await load(1) } else alert(r.error || 'Failed')
    setCreating(false)
  }

  const toggleActive = async (l: any) => {
    const r = await apiFetch(`/v2/admin/links/${l.id}`, { method: 'PATCH', body: JSON.stringify({ active: !l.active }) })
    if (r.ok) setLinks(prev => prev.map(x => x.id === l.id ? { ...x, active: !l.active } : x))
  }

  const deleteLink = async (id: string) => {
    if (!confirm('Delete this link?')) return
    const r = await apiFetch(`/v2/admin/links/${id}`, { method: 'DELETE' })
    if (r.ok) await load(pagination.page)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="Search…" value={search} onChange={e => onSearch(e.target.value)} style={inputStyle(T)} />
        <button onClick={() => setShowCreate(!showCreate)} style={{ height: 38, padding: '0 16px', borderRadius: 8, background: T.accent, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13 }}>+ New Link</button>
      </div>
      {showCreate && (
        <div style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input placeholder="Destination URL *" value={newDest} onChange={e => setNewDest(e.target.value)} style={inputStyle(T)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Custom slug (optional)" value={newSlug} onChange={e => setNewSlug(e.target.value)} style={inputStyle(T)} />
            <input placeholder="Tags (optional)" value={newTags} onChange={e => setNewTags(e.target.value)} style={inputStyle(T)} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <SmallBtn T={T} color={T.accent} onClick={createLink}>{creating ? '…' : 'Create'}</SmallBtn>
            <SmallBtn T={T} color={T.muted} onClick={() => setShowCreate(false)}>Cancel</SmallBtn>
          </div>
        </div>
      )}
      {loading ? <Loading T={T} /> : links.length === 0 ? <EmptyState T={T} text="No short links" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {links.map((l: any) => (
            <div key={l.id} style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 12, padding: '12px 16px', boxShadow: T.shadow, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, opacity: l.active ? 1 : 0.5, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 13, color: T.accent }}>go.buysub.ng/{l.slug}</div>
                <div style={{ fontSize: 12, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{l.destination_url}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: T.muted, fontFamily: 'monospace' }}>{l.click_count || 0} clicks</span>
                <SmallBtn T={T} color={l.active ? T.warning : T.success} onClick={() => toggleActive(l)}>{l.active ? 'Pause' : 'Resume'}</SmallBtn>
                <SmallBtn T={T} color={T.error} onClick={() => deleteLink(l.id)}>Delete</SmallBtn>
              </div>
            </div>
          ))}
        </div>
      )}
      {pagination?.pages > 1 && <PaginationBar T={T} pagination={pagination} onPage={p => load(p)} />}
    </div>
  )
}

function AdsTab({ T }: { T: typeof light }) {
  const [ads, setAds] = useState<any[]>([])
  const [pagination, setPagination] = useState<Pagination>(emptyPagination)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newAd, setNewAd] = useState({ title: '', image_url: '', link: '', placement: 'shop_banner', ad_type: 'banner', weight: '100', card_name: '', card_category: '', card_price: '', card_badge: 'Sponsored' })

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    const r = await apiFetch(`/v2/admin/ads?page=${page}&limit=20`)
    if (r.ok) { setAds(r.data || []); setPagination(parsePagination(r)) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [])

  const createAd = async () => {
    if (!newAd.title || !newAd.image_url || !newAd.link) return; setCreating(true)
    const r = await apiFetch('/v2/admin/ads', { method: 'POST', body: JSON.stringify({ ...newAd, weight: parseInt(newAd.weight) || 100 }) })
    if (r.ok) { setNewAd({ title: '', image_url: '', link: '', placement: 'shop_banner', ad_type: 'banner', weight: '100', card_name: '', card_category: '', card_price: '', card_badge: 'Sponsored' }); setShowCreate(false); await load(1) }
    else alert(r.error || 'Failed'); setCreating(false)
  }

  const toggleActive = async (a: any) => {
    const r = await apiFetch(`/v2/admin/ads/${a.id}`, { method: 'PATCH', body: JSON.stringify({ active: !a.active }) })
    if (r.ok) setAds(prev => prev.map(x => x.id === a.id ? { ...x, active: !a.active } : x))
  }

  const deleteAd = async (id: string) => {
    if (!confirm('Delete this ad?')) return
    const r = await apiFetch(`/v2/admin/ads/${id}`, { method: 'DELETE' })
    if (r.ok) await load(pagination.page)
  }

  const PLACEMENTS = ['shop_banner', 'shop_sidebar', 'shop_product_card']

  return (
    <div>
      <button onClick={() => setShowCreate(!showCreate)} style={{ height: 38, padding: '0 16px', borderRadius: 8, background: T.accent, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>+ New Ad</button>

      {showCreate && (
        <div style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            <input placeholder="Title *" value={newAd.title} onChange={e => setNewAd({ ...newAd, title: e.target.value })} style={inputStyle(T)} />
            <input placeholder="Image URL *" value={newAd.image_url} onChange={e => setNewAd({ ...newAd, image_url: e.target.value })} style={inputStyle(T)} />
            <input placeholder="Link URL *" value={newAd.link} onChange={e => setNewAd({ ...newAd, link: e.target.value })} style={inputStyle(T)} />
            <select value={newAd.placement} onChange={e => setNewAd({ ...newAd, placement: e.target.value })} style={inputStyle(T)}>
              {PLACEMENTS.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <SmallBtn T={T} color={T.accent} onClick={createAd}>{creating ? '…' : 'Create'}</SmallBtn>
            <SmallBtn T={T} color={T.muted} onClick={() => setShowCreate(false)}>Cancel</SmallBtn>
          </div>
        </div>
      )}

      {loading ? <Loading T={T} /> : ads.length === 0 ? <EmptyState T={T} text="No ads" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ads.map((a: any) => (
            <div key={a.id} style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 12, padding: '12px 16px', boxShadow: T.shadow, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, opacity: a.active ? 1 : 0.5, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                <img src={a.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{a.placement?.replace(/_/g, ' ')} · {a.click_count || 0} clicks · {a.view_count || 0} views</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <SmallBtn T={T} color={a.active ? T.warning : T.success} onClick={() => toggleActive(a)}>{a.active ? 'Pause' : 'Resume'}</SmallBtn>
                <SmallBtn T={T} color={T.error} onClick={() => deleteAd(a.id)}>Delete</SmallBtn>
              </div>
            </div>
          ))}
        </div>
      )}
      {pagination?.pages > 1 && <PaginationBar T={T} pagination={pagination} onPage={p => load(p)} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ════════════════════════════════════════════════════════════

const inputStyle = (T: typeof light): React.CSSProperties => ({
  height: 38, padding: '0 12px', borderRadius: 8, fontSize: 13,
  width: '100%', flex: 1, background: T.input, border: `1px solid ${T.border}`,
  color: T.text, boxSizing: 'border-box', outline: 'none',
})

const Shell = ({ T, isDark, toggle, children }: { T: typeof light; isDark: boolean; toggle: () => void; children: React.ReactNode }) => (
  <div style={{
    background: T.bg, minHeight: '100vh', color: T.text,
    fontFamily: "'Inter', -apple-system, sans-serif",
    padding: '0 16px 60px', paddingTop: 'calc(6vh + 16px)', boxSizing: 'border-box',
    transition: 'background 0.2s, color 0.2s',
  }}>
    <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>Admin Dashboard</div>
          <div style={{ fontSize: 12, color: T.muted }}>BuySub Internal</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={toggle} style={{
            width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.border}`,
            background: T.card, color: T.text, cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isDark ? '☀️' : '🌙'}
          </button>
          <button onClick={signOut} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, background: 'transparent',
            border: `1px solid ${T.border}`, color: T.muted, cursor: 'pointer',
          }}>Sign Out</button>
        </div>
      </div>
      {children}
    </div>
  </div>
)

const Card = ({ T, title, children, style }: { T: typeof light; title: string; children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 14, padding: '16px 20px', boxShadow: T.shadow, ...style }}>
    <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontWeight: 600 }}>{title}</div>
    {children}
  </div>
)

const KpiCard = ({ T, label, value, highlight }: { T: typeof light; label: string; value: string; highlight?: boolean }) => (
  <div style={{
    background: T.card, border: `1px solid ${highlight ? T.warning : T.borderSubtle}`,
    borderRadius: 12, padding: '14px 16px', boxShadow: T.shadow,
  }}>
    <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: highlight ? T.warning : T.text }}>{value}</div>
  </div>
)

const Badge = ({ status, T }: { status: string; T: typeof light }) => {
  const c = statusColor(status, T)
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>{status.replace(/_/g, ' ')}</span>
}

const SmallBtn = ({ T, children, color, onClick, disabled }: { T: typeof light; children: React.ReactNode; color: string; onClick: () => void; disabled?: boolean }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
    border: `1px solid ${color}30`, background: `${color}12`, color,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap',
  }}>{children}</button>
)

const Loading = ({ T }: { T: typeof light }) => <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>Loading…</div>
const ErrorMsg = ({ msg, T }: { msg: string; T: typeof light }) => <div style={{ padding: 20, background: T.errorBg, border: `1px solid ${T.error}30`, borderRadius: 10, color: T.error, fontSize: 13 }}>{msg}</div>
const EmptyState = ({ text, T }: { text: string; T: typeof light }) => <div style={{ padding: '40px 0', textAlign: 'center', color: T.muted, fontSize: 13 }}>{text}</div>

const PaginationBar = ({ T, pagination, onPage }: { T: typeof light; pagination: Pagination; onPage: (p: number) => void }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 12, color: T.muted }}>
    <span>Page {pagination.page} of {pagination.pages} ({pagination.total} total)</span>
    <div style={{ display: 'flex', gap: 6 }}>
      <button disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.text, cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer', fontSize: 12, opacity: pagination.page <= 1 ? 0.4 : 1 }}>← Prev</button>
      <button disabled={pagination.page >= pagination.pages} onClick={() => onPage(pagination.page + 1)} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, color: T.text, cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer', fontSize: 12, opacity: pagination.page >= pagination.pages ? 0.4 : 1 }}>Next →</button>
    </div>
  </div>
)

const DetailSection = ({ T, title, children }: { T: typeof light; title: string; children: React.ReactNode }) => (
  <div><div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{title}</div>{children}</div>
)
const DRow = ({ T, label, value }: { T: typeof light; label: string; value: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '3px 0', fontSize: 12 }}>
    <span style={{ color: T.muted }}>{label}</span><span style={{ color: T.textSecondary, textAlign: 'right' }}>{value}</span>
  </div>
)