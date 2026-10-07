'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"
import { useTheme as useThemeController } from '@/lib/theme'
import { getAccessToken } from '@/lib/session'
import { API_BASE } from '@/lib/config'

import { Badge, BtnLabel, CardIcon, ChevronIcon, Customer, DRow, DetailSection, EmptyState, FieldLabel, KeyIcon, Loading, MailIcon, Pagination, PaginationBar, SmallBtn, T, XIcon, apiFetch, emptyPagination, fmtDate, inputStyle, parsePagination, LOGO_DEV_TOKEN } from '../_lib/shared'

// ════════════════════ CUSTOMERS TAB ════════════════════
/* function CustomersTab() {
  const [customers,setCustomers]=useState<Customer[]>([]); const [pagination,setPagination]=useState<Pagination>(emptyPagination)
  const [loading,setLoading]=useState(true); const [search,setSearch]=useState(''); const searchTimer=useRef<any>(null)
  const load=useCallback(async(page=1,q=search)=>{setLoading(true);const params=new URLSearchParams({page:String(page),limit:'30'});if(q)params.set('q',q);const r=await apiFetch(`/v2/admin/customers?${params}`);if(r.ok){setCustomers(r.data||[]);setPagination(parsePagination(r))}setLoading(false)},[search])
  useEffect(()=>{load()},[])
  const onSearch=(q:string)=>{setSearch(q);clearTimeout(searchTimer.current);searchTimer.current=setTimeout(()=>load(1,q),400)}
  return (
    <div>
      <input placeholder="Search customers…" value={search} onChange={e=>onSearch(e.target.value)} style={{...inputStyle(),marginBottom:20}}/>
      {loading?<Loading/>:customers.length===0?<EmptyState text="No customers found"/>:(
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{borderBottom:`2px solid ${T.border}`}}>
              {['Name','Email','Phone','Category','Source','Active','Joined'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:11,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
            </tr></thead>
            <tbody>{customers.map(c=>(
              <tr key={c.id} style={{borderBottom:`1px solid ${T.borderSubtle}`}}>
                <td style={{padding:12,color:T.text,fontWeight:500}}>{c.name||'—'}</td>
                <td style={{padding:12,color:T.textSecondary}}>{c.email||'—'}</td>
                <td style={{padding:12,color:T.textSecondary}}>{c.phone||'—'}</td>
                <td style={{padding:12,color:T.textMuted}}>{c.category||'—'}</td>
                <td style={{padding:12,color:T.textMuted}}>{c.source||'—'}</td>
                <td style={{padding:12}}><Badge status={c.is_active?'active':'hidden'}/></td>
                <td style={{padding:12,color:T.textMuted,whiteSpace:'nowrap'}}>{fmtDate(c.created_at)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {pagination?.pages>1&&<PaginationBar pagination={pagination} onPage={p=>load(p)}/>}
    </div>
  )
} */

  export function CustomersTab() {
    const [customers, setCustomers]         = useState<Customer[]>([])
    const [pagination, setPagination]       = useState<Pagination>(emptyPagination)
    const [loading, setLoading]             = useState(true)
    const [search, setSearch]               = useState('')
    const [expanded, setExpanded]           = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const searchTimer = useRef<any>(null)
   
    // panel state
    const [msgPanel,     setMsgPanel]     = useState<Customer | null>(null)
    const [walletPanel,  setWalletPanel]  = useState<Customer | null>(null)
    const [resetResult,  setResetResult]  = useState<{ email: string; temp_password: string } | null>(null)
    const [debitCustomer, setDebitCustomer] = useState<Customer | null>(null)
   
    const load = useCallback(async (page = 1, q = search) => {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), limit: '30' })
      if (q) params.set('q', q)
      const r = await apiFetch(`/v2/admin/customers?${params}`)
      if (r.ok) { setCustomers(r.data || []); setPagination(parsePagination(r)) }
      setLoading(false)
    }, [search])
   
    useEffect(() => { load() }, [])
   
    const onSearch = (q: string) => {
      setSearch(q)
      clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(() => load(1, q), 400)
    }
   
    const forceReset = async (c: Customer) => {
      if (!confirm(`Force-reset password for ${c.name || c.email}?\nA temporary password will be shown once.`)) return
      setActionLoading(c.id)
      const r = await apiFetch(`/v2/admin/customers/${c.id}/reset-password`, { method: 'POST' })
      setActionLoading(null)
      if (r.ok && r.data?.temp_password) {
        setResetResult({ email: r.data.email, temp_password: r.data.temp_password })
      } else {
        toast.error(r.error || 'Reset failed — customer may not have an auth account yet')
      }
    }
   
    return (
      <div>
        {/* Force-reset result modal */}
        {resetResult && (
          <>
            <div onClick={() => setResetResult(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300 }} />
            <div style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              width: 'min(440px,calc(100vw - 32px))', zIndex: 301,
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 20, padding: '28px 28px 24px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>Password Reset</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 18, lineHeight: 1.6 }}>
                Temporary password for <strong style={{ color: T.text }}>{resetResult.email}</strong>.<br />
                Share this with the customer securely. It will only be shown once.
              </div>
              <div style={{
                background: T.elevated, border: `1px solid ${T.border}`,
                borderRadius: 10, padding: '12px 16px',
                fontFamily: "'SF Mono', Menlo, monospace", fontSize: 'var(--bs-text-lg)',
                fontWeight: 700, color: T.accent, letterSpacing: '0.06em',
                textAlign: 'center', marginBottom: 18,
              }}>
                {resetResult.temp_password}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { navigator.clipboard.writeText(resetResult.temp_password); toast.success('Copied') }}
                  style={{ flex: 1, height: 40, borderRadius: 10, background: T.elevated, border: `1px solid ${T.border}`, color: T.text, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  Copy
                </button>
                <button
                  onClick={() => setResetResult(null)}
                  style={{ flex: 1, height: 40, borderRadius: 10, background: T.accentFill, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  Done
                </button>
              </div>
            </div>
          </>
        )}
   
        {/* Send message panel */}
        {msgPanel && (
          <SendMessagePanel
           
            customer={msgPanel}
            onClose={() => setMsgPanel(null)}
            onSent={() => { setMsgPanel(null); toast.success('Message sent') }}
          />
        )}
   
        {/* Wallet top-up panel */}
        {walletPanel && (
          <WalletTopupPanel
           
            customer={walletPanel}
            onClose={() => setWalletPanel(null)}
            onDone={() => { setWalletPanel(null); toast.success('Wallet topped up') }}
          />
        )}

          {debitCustomer && (
            <WalletDebitPanel
             
              customer={debitCustomer}
              onClose={() => setDebitCustomer(null)}
              onDone={() => {
                setDebitCustomer(null)
                toast.success('Wallet debited')
              }}
            />
          )}
   
        {/* Search */}
        <input
          placeholder="Search customers…"
          value={search}
          onChange={e => onSearch(e.target.value)}
          style={{ ...inputStyle(), marginBottom: 20 }}
        />
   
        {loading ? <Loading /> : customers.length === 0 ? <EmptyState text="No customers found" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {customers.map(c => {
              const isExp = expanded === c.id
              return (
                <div key={c.id} style={{
                  background: T.card, border: `1px solid ${T.borderSubtle}`,
                  borderRadius: 'var(--bs-radius-lg)', overflow: 'hidden',
                }}>
                  {/* Compact row */}
                  <div
                    onClick={() => setExpanded(isExp ? null : c.id)}
                    style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
                  >
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0, flex: 1 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 36, height: 'var(--bs-control-md)', borderRadius: 999, background: 'rgba(var(--bs-accent-rgb), 0.12)',
                        border: `1px solid rgba(var(--bs-accent-rgb), 0.2)`, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: T.accent,
                      }}>
                        {(c.name || c.email || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{c.name || '—'}</div>
                        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{c.email}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      <Badge status={c.is_active ? 'active' : 'hidden'} />
                      <span style={{ color: T.textMuted, fontSize: 12 }}><ChevronIcon open={isExp} /></span>
                    </div>
                  </div>
   
                  {/* Expanded */}
                  {isExp && (
                    <div style={{ borderTop: `1px solid ${T.borderSubtle}`, padding: '14px 20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 16 }}>
                        <DetailSection title="Contact">
                          <DRow label="Email"    value={c.email   || '—'} />
                          <DRow label="Phone"    value={c.phone   || '—'} />
                          <DRow label="Category" value={c.category|| '—'} />
                          <DRow label="Source"   value={c.source  || '—'} />
                          <DRow label="Joined"   value={fmtDate(c.created_at)} />
                        </DetailSection>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <SmallBtn color={T.accent}   onClick={() => setMsgPanel(c)}>
                          <BtnLabel icon={<MailIcon/>}>Send Message</BtnLabel>
                        </SmallBtn>
                        <SmallBtn color={T.success}  onClick={() => setWalletPanel(c)}>
                          <BtnLabel icon={<CardIcon/>}>Top Up Wallet</BtnLabel>
                        </SmallBtn>
                        <SmallBtn color={T.warning}  onClick={() => setDebitCustomer(c)}>
                          <BtnLabel icon={<CardIcon/>}>Debit Wallet</BtnLabel>
                        </SmallBtn>
                        <SmallBtn
                         
                          color={T.warning}
                          onClick={() => forceReset(c)}
                          disabled={actionLoading === c.id}
                        >
                          {actionLoading === c.id ? '…' : <BtnLabel icon={<KeyIcon/>}>Force Reset</BtnLabel>}
                        </SmallBtn>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {pagination?.pages > 1 && <PaginationBar pagination={pagination} onPage={p => load(p)} />}
      </div>
    )
  }
   
  // ── MODULE-LEVEL: Send Message Panel ─────────────────────────────
  export function SendMessagePanel({
    customer, onClose, onSent,
  }: {
    customer: { id: string; name: string; email: string }
    onClose: () => void
    onSent: () => void
  }) {
    const [form, setForm] = useState({
      subject:        '',
      product_name:   '',
      product_domain: '',
      body:           '',
      expires_at:     '',
    })
    const [saving, setSaving] = useState(false)
    const IS = inputStyle()
   
    const send = async () => {
      if (!form.subject.trim()) { toast.error('Subject is required'); return }
      if (!form.body.trim())    { toast.error('Message body is required'); return }
      setSaving(true)
      const r = await apiFetch(`/v2/admin/customers/${customer.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          subject:        form.subject.trim(),
          product_name:   form.product_name   || null,
          product_domain: form.product_domain || null,
          body:           form.body.trim(),
          expires_at:     form.expires_at || null,
        }),
      })
      setSaving(false)
      if (r.ok) onSent()
      else toast.error(r.error || 'Failed to send message')
    }
   
    return (
      <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300 }} />
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(520px,100vw)',
          background: T.card, border: `1px solid ${T.border}`,
          zIndex: 301, display: 'flex', flexDirection: 'column',
          animation: 'bsSlideIn .25s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {/* Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Send Message</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                  To: {customer.name || customer.email}
                </div>
              </div>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 'var(--bs-radius-md)', background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary, cursor: 'pointer', fontSize: 'var(--bs-text-lg)' }}><XIcon /></button>
            </div>
          </div>
   
          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
   
            <FieldLabel label="Subject *">
              <input style={IS} value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. Your Netflix credentials" />
            </FieldLabel>
   
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FieldLabel label="Product Name">
                <input style={IS} value={form.product_name}
                  onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
                  placeholder="e.g. Netflix" />
              </FieldLabel>
              <FieldLabel label="Product Domain">
                <input style={IS} value={form.product_domain}
                  onChange={e => setForm(f => ({ ...f, product_domain: e.target.value }))}
                  placeholder="e.g. netflix.com" />
              </FieldLabel>
            </div>
   
            {/* Preview product logo */}
            {form.product_domain && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: T.elevated, borderRadius: 10, border: `1px solid ${T.border}` }}>
                <img
                  src={`https://img.logo.dev/${form.product_domain}?token=${LOGO_DEV_TOKEN}&size=64&theme=dark`}
                  alt="" style={{ width: 32, height: 32, borderRadius: 'var(--bs-radius-md)', objectFit: 'contain' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <span style={{ fontSize: 12, color: T.textSecondary }}>Logo preview · shown in customer inbox</span>
              </div>
            )}
   
            <FieldLabel label="Message Body *">
              <textarea
                style={{ ...IS, height: 200, padding: '10px 14px', resize: 'vertical', lineHeight: 1.7, fontFamily: "'SF Mono', Menlo, monospace", fontSize: 12 } as any}
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder={`Email: example@email.com\nPassword: abc123\n\nYour subscription is active until 31 Dec 2025.\n\nFor support, reply here.`}
              />
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 5 }}>
                Plain text — line breaks are preserved. Safe to include credentials, links, instructions.
              </div>
            </FieldLabel>
   
            <FieldLabel label="Expires (optional)">
              <input style={{ ...IS, colorScheme: 'dark' }} type="date"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                After this date the message is marked expired in the customer's inbox.
              </div>
            </FieldLabel>
          </div>
   
          {/* Footer */}
          <div style={{ padding: '16px 24px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={onClose} style={{ flex: '0 0 auto', height: 44, padding: '0 22px', borderRadius: 10, background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary, fontSize: 'var(--bs-text-sm)', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={send} disabled={saving} style={{ flex: 1, height: 44, borderRadius: 10, background: T.accentFill, border: 'none', color: '#fff', fontSize: 'var(--bs-text-sm)', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Sending…' : 'Send Message'}
            </button>
          </div>
        </div>
      </>
    )
  }
   
  // ── MODULE-LEVEL: Wallet Top-Up Panel ────────────────────────────
  function WalletTopupPanel({
    customer, onClose, onDone,
  }: {
    customer: { id: string; name: string; email: string }
    onClose: () => void
    onDone: () => void
  }) {
    const [amount,    setAmount]    = useState('')
    const [source,    setSource]    = useState('admin_topup')
    const [reference, setReference] = useState('')
    const [note,      setNote]      = useState('')
    const [saving,    setSaving]    = useState(false)
    const [balance,   setBalance]   = useState<number | null>(null)
    const IS = inputStyle()
   
    // Load current balance
    useEffect(() => {
      apiFetch(`/v2/admin/customers/${customer.id}/wallet`).then(r => {
        if (r.ok) setBalance(r.data?.balance_ngn ?? null)
      })
    }, [customer.id])
   
    const topup = async () => {
      const amt = parseFloat(amount)
      if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return }
      setSaving(true)
      const r = await apiFetch(`/v2/admin/customers/${customer.id}/wallet/topup`, {
        method: 'POST',
        body: JSON.stringify({
          amount_ngn: amt,
          source:     source || 'admin_topup',
          reference:  reference || null,
          note:       note || null,
        }),
      })
      setSaving(false)
      if (r.ok) {
        setBalance(r.data?.balance_ngn ?? null)
        onDone()
      } else {
        toast.error(r.error || 'Top-up failed')
      }
    }
   
    const TOPUP_SOURCES = [
      { value: 'admin_topup',      label: 'Manual Top-up'    },
      { value: 'refund',           label: 'Order Refund'     },
      { value: 'promotion',        label: 'Promotion/Bonus'  },
      { value: 'compensation',     label: 'Compensation'     },
    ]
   
    return (
      <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300 }} />
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 'min(420px,calc(100vw - 32px))',
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 20, zIndex: 301, display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          animation: 'bsFadeIn .2s ease',
        }}>
          {/* Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Top Up Wallet</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{customer.name || customer.email}</div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 'var(--bs-radius-md)', background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary, cursor: 'pointer', fontSize: 'var(--bs-text-lg)' }}><XIcon /></button>
          </div>
   
          {/* Body */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Current balance */}
            <div style={{
              padding: '14px 16px', borderRadius: 'var(--bs-radius-lg)',
              // #5B3FD4 is the LIGHT value of --bs-accent-on-surface. Phase 2
              // hit this exact thing on the dashboard wallet gradient and ruled
              // that reusing it as a gradient stop puts a second meaning on
              // that token. Same fix as Phase 2: accent -> accent-hover.
              background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentHover} 100%)`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>Current Balance</span>
              <span style={{ fontSize: 'var(--bs-text-lg)', fontWeight: 700, color: '#fff' }}>
                {balance != null ? `₦${Number(balance).toLocaleString('en-NG')}` : '…'}
              </span>
            </div>
   
            <FieldLabel label="Amount (₦) *">
              <input style={IS} type="number" min={1} value={amount}
                onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000" autoFocus />
            </FieldLabel>
   
            <FieldLabel label="Source">
              <select style={IS} value={source} onChange={e => setSource(e.target.value)}>
                {TOPUP_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </FieldLabel>
   
            <FieldLabel label="Reference (optional)">
              <input style={IS} value={reference}
                onChange={e => setReference(e.target.value)} placeholder="e.g. order ref, transaction ID" />
            </FieldLabel>
   
            <FieldLabel label="Internal Note (optional)">
              <input style={IS} value={note}
                onChange={e => setNote(e.target.value)} placeholder="Reason for top-up" />
            </FieldLabel>
   
            {amount && parseFloat(amount) > 0 && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: T.elevated, border: `1px solid ${T.border}`, fontSize: 12, color: T.textSecondary }}>
                New balance after top-up:{' '}
                <strong style={{ color: T.text }}>
                  ₦{((balance || 0) + parseFloat(amount)).toLocaleString('en-NG')}
                </strong>
              </div>
            )}
          </div>
   
          {/* Footer */}
          <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: '0 0 auto', height: 44, padding: '0 22px', borderRadius: 10, background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary, fontSize: 'var(--bs-text-sm)', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={topup} disabled={saving} style={{ flex: 1, height: 44, borderRadius: 10, background: T.success, border: 'none', color: '#fff', fontSize: 'var(--bs-text-sm)', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Processing…' : `Top Up ${amount ? `₦${parseFloat(amount).toLocaleString('en-NG')}` : ''}`}
            </button>
          </div>
        </div>
      </>
    )
  }

function WalletDebitPanel({
  customer, onClose, onDone,
}: {
  customer: { id: string; name: string; email: string } | null
  onClose: () => void
  onDone: () => void
}) {
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)

  const IS = inputStyle()

  // hooks must come before any early return
  useEffect(() => {
    if (!customer?.id) return
    apiFetch(`/v2/admin/customers/${customer.id}/wallet`).then(r => {
      if (r.ok) setBalance(r.data?.balance_ngn ?? null)
    })
  }, [customer?.id])

  if (!customer) return null

  const debit = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return }
    if (balance != null && amt > balance) { toast.error('Amount exceeds wallet balance'); return }
    setSaving(true)
    const r = await apiFetch(`/v2/admin/wallet/debit`, {
      method: 'POST',
      body: JSON.stringify({ customer_id: customer.id, amount: amt, reference: reference || 'Admin debit' }),
    })
    setSaving(false)
    if (r.ok) { onDone() } else { toast.error(r.error || 'Debit failed') }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(420px,calc(100vw - 32px))',
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 20, zIndex: 301, display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)', animation: 'bsFadeIn .2s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Debit Wallet</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{customer.name || customer.email}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 'var(--bs-radius-md)', background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary, cursor: 'pointer', fontSize: 'var(--bs-text-lg)' }}><XIcon /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Balance */}
          <div style={{
            padding: '14px 16px', borderRadius: 'var(--bs-radius-lg)',
            // Pre-token error colours; #dc2626 is the old palette's error and
            // #991b1b has no token at all. Darkening the second stop keeps the
            // gradient reading as a gradient rather than a flat fill.
            background: `linear-gradient(135deg, ${T.error} 0%, color-mix(in srgb, ${T.error}, #000 32%) 100%)`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>Current Balance</span>
            <span style={{ fontSize: 'var(--bs-text-lg)', fontWeight: 700, color: '#fff' }}>
              {balance != null ? `₦${Number(balance).toLocaleString('en-NG')}` : '…'}
            </span>
          </div>

          <FieldLabel label="Amount to Deduct (₦) *">
            <input style={IS} type="number" min={1} value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="e.g. 2000" autoFocus />
          </FieldLabel>

          <FieldLabel label="Reason (optional)">
            <input style={IS} value={reference}
              onChange={e => setReference(e.target.value)} placeholder="e.g. subscription charge, correction" />
          </FieldLabel>

          {amount && parseFloat(amount) > 0 && balance != null && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: T.elevated, border: `1px solid ${T.border}`, fontSize: 12, color: T.textSecondary }}>
              Balance after debit:{' '}
              <strong style={{ color: parseFloat(amount) > balance ? T.error : T.text }}>
                ₦{Math.max(0, balance - parseFloat(amount)).toLocaleString('en-NG')}
              </strong>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: '0 0 auto', height: 44, padding: '0 22px', borderRadius: 10, background: 'transparent', border: `1px solid ${T.border}`, color: T.textSecondary, fontSize: 'var(--bs-text-sm)', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={debit} disabled={saving} style={{ flex: 1, height: 44, borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontSize: 'var(--bs-text-sm)', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Processing…' : `Debit${amount && parseFloat(amount) > 0 ? ` ₦${parseFloat(amount).toLocaleString('en-NG')}` : ''}`}
          </button>
        </div>
      </div>
    </>
  )
}
