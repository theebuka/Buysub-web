// ============================================================
// PHASE 3 — Admin Dashboard
// File: apps/web/app/admin/page.tsx
//
// Full admin panel with tabbed navigation:
//   Overview | Orders | Products | Customers | Partners | Wallets
//
// Reads auth token from Supabase session, passes as Bearer
// to /v2/admin/* endpoints on the Workers API.
// ============================================================

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

// ── Config ──────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_BASE || 'https://buysub-api-v2.ebuka-nwaju.workers.dev'

// ── Types ───────────────────────────────────────────────────
interface Stats {
  total_revenue: number
  revenue_today: number
  revenue_this_month: number
  orders_total: number
  orders_today: number
  orders_pending_manual: number
  orders_paid: number
  products_active: number
  products_total: number
  customers_total: number
  partners_pending: number
  top_products: { name: string; slug: string; order_count: number; revenue: number }[]
  recent_orders: { id: string; order_ref: string; status: string; total_ngn: number; payment_method: string; created_at: string; customer_name: string; customer_email: string }[]
  revenue_by_day: { day: string; revenue: number; orders: number }[]
}

interface Order {
  id: string
  order_ref: string
  status: string
  total_ngn: number
  subtotal_ngn: number
  discount_ngn: number
  payment_method: string
  currency: string
  created_at: string
  updated_at: string
  profiles: { display_name: string; email: string; phone: string } | null
}

interface Product {
  id: string; name: string; slug: string; category: string; tags: string
  price_1m: number; price_3m: number; price_6m: number; price_1y: number
  billing_type: string; stock_status: string; status: string; domain: string
  short_description: string; featured: boolean; created_at: string
}

interface Customer {
  id: string; display_name: string; email: string; phone: string
  role: string; wallet_balance_ngn: number; created_at: string
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

interface WalletTx {
  id: string; user_id: string; type: string; amount_ngn: number
  balance_after_ngn: number; description: string; reference: string
  created_at: string; profiles: { display_name: string; email: string } | null
}

interface Pagination {
  page: number; limit: number; total: number; pages: number
}

// ── Helpers ─────────────────────────────────────────────────
const fmt = (n: number) => `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
const fmtFull = (iso: string) => `${fmtDate(iso)} ${fmtTime(iso)}`
const statusColor = (s: string) => {
  if (s === 'paid') return { bg: 'rgba(34,197,94,0.12)', color: '#16a34a' }
  if (s === 'pending_manual') return { bg: 'rgba(251,191,36,0.12)', color: '#d97706' }
  if (s === 'pending') return { bg: 'rgba(59,130,246,0.12)', color: '#2563eb' }
  if (s === 'cancelled' || s === 'rejected') return { bg: 'rgba(239,68,68,0.12)', color: '#dc2626' }
  if (s === 'approved') return { bg: 'rgba(34,197,94,0.12)', color: '#16a34a' }
  if (s === 'pending_review') return { bg: 'rgba(251,191,36,0.12)', color: '#d97706' }
  return { bg: 'rgba(148,163,184,0.12)', color: '#64748b' }
}

// ── Auth token (read from Supabase session in localStorage) ─
const getToken = (): string => {
  try {
    // Supabase stores session under sb-{ref}-auth-token
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const session = JSON.parse(localStorage.getItem(key) || '{}')
        return session?.access_token || ''
      }
    }
  } catch { /* */ }
  return ''
}

const apiFetch = async (path: string, opts: RequestInit = {}) => {
  const token = getToken()
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  })
  return res.json()
}

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════

const TABS = ['Overview', 'Orders', 'Products', 'Customers', 'Partners', 'Wallets'] as const
type Tab = typeof TABS[number]

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('Overview')
  const [token, setToken] = useState('')

  useEffect(() => {
    setToken(getToken())
  }, [])

  if (!token) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 18, color: V.textPrimary, marginBottom: 8 }}>Admin Access Required</div>
          <div style={{ fontSize: 13, color: V.textMuted }}>
            Please log in at <a href="/login" style={{ color: V.accent }}>app.buysub.ng/login</a> with an admin account.
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 2, borderBottom: `1px solid ${V.border}`,
        marginBottom: 24, overflowX: 'auto', paddingBottom: 0,
      }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 16px', fontSize: 13, border: 'none', cursor: 'pointer',
            background: 'transparent', color: tab === t ? V.accent : V.textMuted,
            borderBottom: tab === t ? `2px solid ${V.accent}` : '2px solid transparent',
            fontWeight: tab === t ? 600 : 400, whiteSpace: 'nowrap',
            transition: 'color 0.15s, border-color 0.15s',
          }}>
            {t}
            {t === 'Orders' && <PendingDot />}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab />}
      {tab === 'Orders' && <OrdersTab />}
      {tab === 'Products' && <ProductsTab />}
      {tab === 'Customers' && <CustomersTab />}
      {tab === 'Partners' && <PartnersTab />}
      {tab === 'Wallets' && <WalletsTab />}
    </Shell>
  )
}

// ── Pending dot indicator ───────────────────────────────────
const PendingDot = () => (
  <span style={{
    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
    background: '#f59e0b', marginLeft: 6, verticalAlign: 'middle',
  }} />
)

// ════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ════════════════════════════════════════════════════════════

function OverviewTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/v2/admin/stats')
      .then(r => {
        if (r.ok) setStats(r.data)
        else setError(r.error || 'Failed to load stats')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />
  if (error) return <ErrorMsg msg={error} />
  if (!stats) return null

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard label="Revenue Today" value={fmt(stats.revenue_today)} />
        <KpiCard label="Revenue (Month)" value={fmt(stats.revenue_this_month)} />
        <KpiCard label="Total Revenue" value={fmt(stats.total_revenue)} />
        <KpiCard label="Orders Today" value={String(stats.orders_today)} />
        <KpiCard label="Pending WhatsApp" value={String(stats.orders_pending_manual)} highlight={stats.orders_pending_manual > 0} />
        <KpiCard label="Active Products" value={`${stats.products_active} / ${stats.products_total}`} />
        <KpiCard label="Total Customers" value={String(stats.customers_total)} />
        <KpiCard label="Partners Pending" value={String(stats.partners_pending)} highlight={stats.partners_pending > 0} />
      </div>

      {/* Two column: Top Products + Recent Orders */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {/* Top Products */}
        <Card title="Top Products (by revenue)">
          {stats.top_products.length === 0 && <EmptyState text="No sales data yet" />}
          {stats.top_products.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < stats.top_products.length - 1 ? `1px solid ${V.borderSubtle}` : 'none' }}>
              <div>
                <div style={{ fontSize: 13, color: V.textPrimary }}>{p.name}</div>
                <div style={{ fontSize: 11, color: V.textMuted }}>{p.order_count} orders</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: V.textPrimary }}>{fmt(p.revenue)}</div>
            </div>
          ))}
        </Card>

        {/* Recent Orders */}
        <Card title="Recent Orders">
          {stats.recent_orders.length === 0 && <EmptyState text="No orders yet" />}
          {stats.recent_orders.map((o, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < stats.recent_orders.length - 1 ? `1px solid ${V.borderSubtle}` : 'none', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: V.textPrimary, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{o.order_ref}</span>
                  <Badge status={o.status} />
                </div>
                <div style={{ fontSize: 11, color: V.textMuted, marginTop: 2 }}>
                  {o.customer_name || o.customer_email || '—'} · {fmtFull(o.created_at)}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: V.textPrimary, flexShrink: 0 }}>{fmt(o.total_ngn)}</div>
            </div>
          ))}
        </Card>
      </div>

      {/* Revenue chart (simple bar) */}
      {stats.revenue_by_day.length > 0 && (
        <Card title="Revenue (Last 30 Days)" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, paddingTop: 8 }}>
            {(() => {
              const max = Math.max(...stats.revenue_by_day.map(d => d.revenue), 1)
              return stats.revenue_by_day.map((d, i) => (
                <div key={i} title={`${fmtDate(d.day)}: ${fmt(d.revenue)} (${d.orders} orders)`} style={{
                  flex: 1, minWidth: 4, maxWidth: 20,
                  height: `${Math.max(2, (d.revenue / max) * 100)}%`,
                  background: V.accent, borderRadius: '3px 3px 0 0', cursor: 'help',
                  opacity: 0.7, transition: 'opacity 0.15s',
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
// ORDERS TAB
// ════════════════════════════════════════════════════════════

function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const searchTimer = useRef<any>(null)

  const load = useCallback(async (page = 1, status = statusFilter, q = search) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (status) params.set('status', status)
    if (q) params.set('q', q)
    const r = await apiFetch(`/v2/admin/orders?${params}`)
    if (r.ok) { setOrders(r.data); setPagination(r.pagination) }
    setLoading(false)
  }, [statusFilter, search])

  useEffect(() => { load() }, [])

  const onSearch = (q: string) => {
    setSearch(q)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => load(1, statusFilter, q), 400)
  }

  const onStatusChange = (s: string) => {
    setStatusFilter(s)
    load(1, s, search)
  }

  const approveOrder = async (ref: string) => {
    if (!confirm(`Approve order ${ref}? This will mark it as paid and trigger the confirmation email.`)) return
    setActionLoading(ref)
    const r = await apiFetch(`/v2/admin/orders/${ref}/approve`, { method: 'POST', body: JSON.stringify({ payment_method: 'manual' }) })
    if (r.ok) await load(pagination.page)
    else alert(r.error || 'Failed to approve')
    setActionLoading(null)
  }

  const rejectOrder = async (ref: string) => {
    const reason = prompt('Reason for rejection (optional):')
    if (reason === null) return
    setActionLoading(ref)
    const r = await apiFetch(`/v2/admin/orders/${ref}/reject`, { method: 'POST', body: JSON.stringify({ reason }) })
    if (r.ok) await load(pagination.page)
    else alert(r.error || 'Failed to reject')
    setActionLoading(null)
  }

  const ORDER_STATUSES = ['', 'pending', 'pending_manual', 'paid', 'cancelled', 'refunded']

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="Search by ref, name, or email…" value={search} onChange={e => onSearch(e.target.value)} style={{ ...IS, flex: 1, minWidth: 200 }} />
        <select value={statusFilter} onChange={e => onStatusChange(e.target.value)} style={{ ...IS, width: 160 }}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading ? <Loading /> : orders.length === 0 ? <EmptyState text="No orders found" /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${V.border}` }}>
                {['Ref', 'Customer', 'Status', 'Total', 'Payment', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: V.textMuted, fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom: `1px solid ${V.borderSubtle}` }}>
                  <td style={TD}><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{o.order_ref}</span></td>
                  <td style={TD}>
                    <div style={{ fontSize: 13 }}>{o.profiles?.display_name || '—'}</div>
                    <div style={{ fontSize: 11, color: V.textMuted }}>{o.profiles?.email || ''}</div>
                  </td>
                  <td style={TD}><Badge status={o.status} /></td>
                  <td style={TD}>{fmt(o.total_ngn)}</td>
                  <td style={TD}>{o.payment_method || '—'}</td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtFull(o.created_at)}</td>
                  <td style={TD}>
                    {o.status === 'pending_manual' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <SmallBtn color="#16a34a" onClick={() => approveOrder(o.order_ref)} disabled={actionLoading === o.order_ref}>
                          {actionLoading === o.order_ref ? '…' : '✓ Approve'}
                        </SmallBtn>
                        <SmallBtn color="#dc2626" onClick={() => rejectOrder(o.order_ref)} disabled={actionLoading === o.order_ref}>
                          ✕ Reject
                        </SmallBtn>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && (
        <PaginationBar pagination={pagination} onPage={p => load(p)} />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// PRODUCTS TAB
// ════════════════════════════════════════════════════════════

function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const searchTimer = useRef<any>(null)

  const load = useCallback(async (page = 1, status = statusFilter, q = search) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '50' })
    if (status) params.set('status', status)
    if (q) params.set('q', q)
    const r = await apiFetch(`/v2/admin/products?${params}`)
    if (r.ok) { setProducts(r.data); setPagination(r.pagination) }
    setLoading(false)
  }, [statusFilter, search])

  useEffect(() => { load() }, [])

  const onSearch = (q: string) => {
    setSearch(q)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => load(1, statusFilter, q), 400)
  }

  const toggleStatus = async (p: Product) => {
    const newStatus = p.status === 'active' ? 'inactive' : 'active'
    const r = await apiFetch(`/v2/admin/products/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    })
    if (r.ok) {
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, status: newStatus } : x))
    }
  }

  const toggleStock = async (p: Product) => {
    const newStock = p.stock_status === 'in_stock' ? 'out_of_stock' : 'in_stock'
    const r = await apiFetch(`/v2/admin/products/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ stock_status: newStock }),
    })
    if (r.ok) {
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, stock_status: newStock } : x))
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="Search products…" value={search} onChange={e => onSearch(e.target.value)} style={{ ...IS, flex: 1, minWidth: 200 }} />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); load(1, e.target.value, search) }} style={{ ...IS, width: 140 }}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? <Loading /> : products.length === 0 ? <EmptyState text="No products found" /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${V.border}` }}>
                {['Product', 'Category', 'Billing', '1M', '3M', '6M', '1Y', 'Stock', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '8px 8px', textAlign: 'left', fontSize: 11, color: V.textMuted, fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${V.borderSubtle}`, opacity: p.status === 'inactive' ? 0.5 : 1 }}>
                  <td style={TD}>
                    <div style={{ fontSize: 13 }}>{p.name}</div>
                    {p.domain && <div style={{ fontSize: 11, color: V.textMuted }}>{p.domain}</div>}
                  </td>
                  <td style={TD}>{p.category}</td>
                  <td style={TD}>{p.billing_type}</td>
                  <td style={{ ...TD, fontFamily: 'monospace', fontSize: 12 }}>{fmt(p.price_1m)}</td>
                  <td style={{ ...TD, fontFamily: 'monospace', fontSize: 12 }}>{fmt(p.price_3m)}</td>
                  <td style={{ ...TD, fontFamily: 'monospace', fontSize: 12 }}>{fmt(p.price_6m)}</td>
                  <td style={{ ...TD, fontFamily: 'monospace', fontSize: 12 }}>{fmt(p.price_1y)}</td>
                  <td style={TD}>
                    <SmallBtn color={p.stock_status === 'in_stock' ? '#16a34a' : '#dc2626'} onClick={() => toggleStock(p)}>
                      {p.stock_status === 'in_stock' ? 'In Stock' : 'OOS'}
                    </SmallBtn>
                  </td>
                  <td style={TD}><Badge status={p.status} /></td>
                  <td style={TD}>
                    <SmallBtn color={p.status === 'active' ? '#64748b' : '#16a34a'} onClick={() => toggleStatus(p)}>
                      {p.status === 'active' ? 'Deactivate' : 'Activate'}
                    </SmallBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && <PaginationBar pagination={pagination} onPage={p => load(p)} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// CUSTOMERS TAB
// ════════════════════════════════════════════════════════════

function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchTimer = useRef<any>(null)

  const load = useCallback(async (page = 1, q = search) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (q) params.set('q', q)
    const r = await apiFetch(`/v2/admin/customers?${params}`)
    if (r.ok) { setCustomers(r.data); setPagination(r.pagination) }
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [])

  const onSearch = (q: string) => {
    setSearch(q)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => load(1, q), 400)
  }

  return (
    <div>
      <input placeholder="Search by name, email, or phone…" value={search} onChange={e => onSearch(e.target.value)} style={{ ...IS, marginBottom: 16, maxWidth: 400 }} />

      {loading ? <Loading /> : customers.length === 0 ? <EmptyState text="No customers found" /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${V.border}` }}>
                {['Name', 'Email', 'Phone', 'Role', 'Wallet', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: V.textMuted, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${V.borderSubtle}` }}>
                  <td style={TD}>{c.display_name || '—'}</td>
                  <td style={TD}>{c.email}</td>
                  <td style={TD}>{c.phone || '—'}</td>
                  <td style={TD}><Badge status={c.role} /></td>
                  <td style={{ ...TD, fontFamily: 'monospace' }}>{fmt(c.wallet_balance_ngn)}</td>
                  <td style={TD}>{fmtDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && <PaginationBar pagination={pagination} onPage={p => load(p)} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// PARTNERS TAB
// ════════════════════════════════════════════════════════════

function PartnersTab() {
  const [apps, setApps] = useState<PartnerApp[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(async (page = 1, status = statusFilter) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (status) params.set('status', status)
    const r = await apiFetch(`/v2/admin/partners?${params}`)
    if (r.ok) { setApps(r.data); setPagination(r.pagination) }
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
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); load(1, e.target.value) }} style={{ ...IS, width: 180 }}>
          <option value="">All applications</option>
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? <Loading /> : apps.length === 0 ? <EmptyState text="No partner applications" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {apps.map(a => (
            <div key={a.id} style={{ background: V.bgCard, border: `1px solid ${V.borderSubtle}`, borderRadius: 12, overflow: 'hidden' }}>
              {/* Summary row */}
              <div onClick={() => setExpanded(expanded === a.id ? null : a.id)} style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: V.textPrimary, fontWeight: 500 }}>{a.legal_name}</div>
                  <div style={{ fontSize: 12, color: V.textMuted, marginTop: 2 }}>
                    {a.owner_name} · {a.business_email} · {a.state}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <Badge status={a.status} />
                  <span style={{ fontSize: 11, color: V.textMuted }}>{fmtDate(a.created_at)}</span>
                  <span style={{ fontSize: 16, color: V.textMuted }}>{expanded === a.id ? '▾' : '▸'}</span>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === a.id && (
                <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${V.borderSubtle}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, padding: '16px 0' }}>
                    <DetailSection title="Business">
                      <DRow label="Store Name" value={a.store_name} />
                      <DRow label="Address" value={a.address} />
                      <DRow label="LGA / State" value={`${a.lga}, ${a.state}`} />
                      <DRow label="Phone" value={a.business_phone} />
                      <DRow label="CAC" value={a.cac_number || '—'} />
                      <DRow label="Social" value={a.social_media || '—'} />
                    </DetailSection>
                    <DetailSection title="Owner">
                      <DRow label="Name" value={a.owner_name} />
                      <DRow label="Email" value={a.owner_email} />
                      <DRow label="Phone" value={a.owner_phone} />
                      <DRow label="Gender" value={a.gender || '—'} />
                      <DRow label="Contact Method" value={a.contact_method || '—'} />
                    </DetailSection>
                    <DetailSection title="Payout">
                      <DRow label="Frequency" value={a.payout_frequency} />
                      <DRow label="Method" value={a.payout_method} />
                      {a.bank_name && <DRow label="Bank" value={`${a.bank_name} - ${a.account_name} (${a.account_number})`} />}
                      {a.crypto_token && <DRow label="Crypto" value={`${a.crypto_token} on ${a.crypto_chain}: ${a.wallet_address}`} />}
                    </DetailSection>
                  </div>

                  {a.reviewer_notes && (
                    <div style={{ padding: '10px 14px', background: V.bgElevated, borderRadius: 8, marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: V.textMuted, marginBottom: 4 }}>Reviewer Notes</div>
                      <div style={{ fontSize: 13, color: V.textSecondary }}>{a.reviewer_notes}</div>
                    </div>
                  )}

                  {a.status === 'pending_review' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <SmallBtn color="#16a34a" onClick={() => approve(a.id)} disabled={actionLoading === a.id}>
                        {actionLoading === a.id ? '…' : '✓ Approve'}
                      </SmallBtn>
                      <SmallBtn color="#dc2626" onClick={() => reject(a.id)} disabled={actionLoading === a.id}>
                        ✕ Reject
                      </SmallBtn>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pagination.pages > 1 && <PaginationBar pagination={pagination} onPage={p => load(p)} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// WALLETS TAB
// ════════════════════════════════════════════════════════════

function WalletsTab() {
  const [txns, setTxns] = useState<WalletTx[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    const r = await apiFetch(`/v2/admin/wallets?page=${page}&limit=20`)
    if (r.ok) { setTxns(r.data); setPagination(r.pagination) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [])

  return (
    <div>
      {loading ? <Loading /> : txns.length === 0 ? <EmptyState text="No wallet transactions yet" /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${V.border}` }}>
                {['User', 'Type', 'Amount', 'Balance After', 'Description', 'Date'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: V.textMuted, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.map(t => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${V.borderSubtle}` }}>
                  <td style={TD}>
                    <div>{t.profiles?.display_name || '—'}</div>
                    <div style={{ fontSize: 11, color: V.textMuted }}>{t.profiles?.email || ''}</div>
                  </td>
                  <td style={TD}><Badge status={t.type} /></td>
                  <td style={{ ...TD, fontFamily: 'monospace', color: t.type === 'credit' ? '#16a34a' : '#dc2626' }}>
                    {t.type === 'credit' ? '+' : '-'}{fmt(t.amount_ngn)}
                  </td>
                  <td style={{ ...TD, fontFamily: 'monospace' }}>{fmt(t.balance_after_ngn)}</td>
                  <td style={TD}>{t.description || '—'}</td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtFull(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && <PaginationBar pagination={pagination} onPage={p => load(p)} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ════════════════════════════════════════════════════════════

// ── Design tokens ───────────────────────────────────────────
const V = {
  bgBase: '#0a0a0c',
  bgCard: '#111114',
  bgElevated: '#18181c',
  bgInput: '#111114',
  border: '#27272e',
  borderSubtle: '#1c1c22',
  textPrimary: '#e8e8ec',
  textSecondary: '#a0a0b0',
  textMuted: '#6b6b7e',
  accent: '#7C5CFF',
  success: '#16a34a',
  error: '#dc2626',
  warning: '#d97706',
}

const IS: React.CSSProperties = {
  height: 38, padding: '0 12px', borderRadius: 8, fontSize: 13,
  width: '100%', background: V.bgInput, border: `1px solid ${V.border}`,
  color: V.textPrimary, boxSizing: 'border-box', outline: 'none',
}

const TD: React.CSSProperties = { padding: '10px 10px', verticalAlign: 'top' }

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    background: V.bgBase, minHeight: '100vh', color: V.textPrimary,
    fontFamily: "'Inter', -apple-system, sans-serif",
    padding: '0 16px 60px', paddingTop: 'calc(8vh + 16px)', boxSizing: 'border-box',
  }}>
    <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Admin Dashboard</div>
      <div style={{ fontSize: 12, color: V.textMuted, marginBottom: 20 }}>BuySub Internal</div>
      {children}
    </div>
  </div>
)

const Card = ({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: V.bgCard, border: `1px solid ${V.borderSubtle}`,
    borderRadius: 14, padding: '16px 20px', ...style,
  }}>
    <div style={{ fontSize: 11, color: V.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{title}</div>
    {children}
  </div>
)

const KpiCard = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div style={{
    background: V.bgCard, border: `1px solid ${highlight ? V.warning : V.borderSubtle}`,
    borderRadius: 12, padding: '14px 16px',
  }}>
    <div style={{ fontSize: 11, color: V.textMuted, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 600, color: highlight ? V.warning : V.textPrimary }}>{value}</div>
  </div>
)

const Badge = ({ status }: { status: string }) => {
  const c = statusColor(status)
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 500, background: c.bg, color: c.color,
      whiteSpace: 'nowrap',
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

const SmallBtn = ({ children, color, onClick, disabled }: { children: React.ReactNode; color: string; onClick: () => void; disabled?: boolean }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
    border: `1px solid ${color}30`, background: `${color}15`, color,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
    whiteSpace: 'nowrap',
  }}>
    {children}
  </button>
)

const Loading = () => (
  <div style={{ padding: '40px 0', textAlign: 'center', color: V.textMuted, fontSize: 13 }}>Loading…</div>
)

const ErrorMsg = ({ msg }: { msg: string }) => (
  <div style={{ padding: '20px', background: '#dc262615', border: '1px solid #dc262630', borderRadius: 10, color: '#dc2626', fontSize: 13 }}>{msg}</div>
)

const EmptyState = ({ text }: { text: string }) => (
  <div style={{ padding: '40px 0', textAlign: 'center', color: V.textMuted, fontSize: 13 }}>{text}</div>
)

const PaginationBar = ({ pagination, onPage }: { pagination: Pagination; onPage: (p: number) => void }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 12, color: V.textMuted }}>
    <span>Page {pagination.page} of {pagination.pages} ({pagination.total} total)</span>
    <div style={{ display: 'flex', gap: 6 }}>
      <button disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}
        style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${V.border}`, background: V.bgCard, color: V.textPrimary, cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer', fontSize: 12, opacity: pagination.page <= 1 ? 0.4 : 1 }}>
        ← Prev
      </button>
      <button disabled={pagination.page >= pagination.pages} onClick={() => onPage(pagination.page + 1)}
        style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${V.border}`, background: V.bgCard, color: V.textPrimary, cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer', fontSize: 12, opacity: pagination.page >= pagination.pages ? 0.4 : 1 }}>
        Next →
      </button>
    </div>
  </div>
)

const DetailSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 600, color: V.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{title}</div>
    {children}
  </div>
)

const DRow = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '3px 0', fontSize: 12 }}>
    <span style={{ color: V.textMuted }}>{label}</span>
    <span style={{ color: V.textSecondary, textAlign: 'right' }}>{value}</span>
  </div>
)
