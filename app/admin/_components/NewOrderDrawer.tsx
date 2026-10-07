'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"
import { useTheme as useThemeController } from '@/lib/theme'
import { getAccessToken } from '@/lib/session'
import { API_BASE } from '@/lib/config'

import { Customer, Discount, Order, Product, T, XIcon, apiFetch, fmt, sentenceCase } from '../_lib/shared'

export const BILLING_PERIODS = ['Monthly', 'Quarterly', 'Biannual', 'Annual', 'One-time']
export const PAYMENT_METHODS_MANUAL: { label: string; value: string }[] = [
  { label: 'Bank transfer', value: 'bank_transfer' },
  { label: 'Cash',          value: 'cash' },
  { label: 'WhatsApp',      value: 'whatsapp' },
  { label: 'Coupon',        value: 'coupon' },
  { label: 'Cashback',      value: 'cashback' },
  { label: 'POS',           value: 'pos' },
  { label: 'Manual',        value: 'manual' },
]

export type NewOrderItem = {
  _key: string          // local only
  product_id: string
  product_name: string
  billing_period: string
  duration_months: number
  unit_price_ngn: number | ''
  quantity: number
  is_overridden: boolean
}

export const BILLING_MONTHS: Record<string, number> = {
  Monthly: 1, Quarterly: 3, Biannual: 6, Annual: 12, 'One-time': 1,
}

export const PRICE_FIELD: Record<string, keyof Product> = {
  Monthly: 'price_1m', Quarterly: 'price_3m', Biannual: 'price_6m', Annual: 'price_1y', 'One-time': 'price_1m',
}

export function newItemRow(): NewOrderItem {
  return {
    _key: Math.random().toString(36).slice(2),
    product_id: '',
    product_name: '',
    billing_period: 'Quarterly',
    duration_months: 3,
    unit_price_ngn: '',
    quantity: 1,
    is_overridden: false,
  }
}

// ── Inline product search combobox (stable, module-level) ──
export function ProductSearchBox({
  allProducts, value, onChange,
}: {
  allProducts: Product[]
  value: NewOrderItem
  onChange: (patch: Partial<NewOrderItem>) => void
}) {
  const [query, setQuery] = useState(value.product_name)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value.product_name) }, [value.product_name])

  const filtered = query.length > 0
    ? allProducts
        .filter(p =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.category || '').toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 8)
    : []

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectProduct = (p: Product) => {
    const priceField = PRICE_FIELD[value.billing_period] || 'price_3m'
    const price = (p[priceField] as number) || 0
    setQuery(p.name)
    setOpen(false)
    setActiveIdx(-1)
    onChange({
      product_id: p.id,
      product_name: p.name,
      unit_price_ngn: price,
      is_overridden: false,
    })
  }

  const IS: React.CSSProperties = {
    height: 'var(--bs-control-md)', padding: '0 var(--bs-space-3)', borderRadius: 'var(--bs-radius-md)', fontSize: 'var(--bs-text-sm)',
    width: '100%', background: T.input, border: `1px solid ${T.border}`,
    color: T.text, boxSizing: 'border-box', outline: 'none',
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1 }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIdx(-1) }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (!open || !filtered.length) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)) }
          if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
          if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); selectProduct(filtered[activeIdx]) }
          if (e.key === 'Escape') setOpen(false)
        }}
        placeholder="Search product…"
        style={IS}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: T.elevated, border: `1px solid ${T.border}`,
          borderRadius: 'var(--bs-radius-md)', zIndex: 300, boxShadow: 'var(--bs-elev-2)',
          maxHeight: 260, overflowY: 'auto',
        }}>
          {filtered.map((p, i) => (
            <div
              key={p.id}
              onMouseDown={() => selectProduct(p)}
              style={{
                padding: '9px 13px',
                cursor: 'pointer',
                background: i === activeIdx ? T.muted : 'transparent',
                borderBottom: `1px solid ${T.borderSubtle}`,
              }}
            >
              <div style={{ fontSize: 13, color: T.text }}>{p.name}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                <span>{sentenceCase(p.category || '')}</span>
                <span style={{ fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  {fmt((p[PRICE_FIELD['Quarterly']] as number) || 0)} /qtr
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main drawer ──
export function NewOrderDrawer({
  allProducts, onClose, onCreated,
}: {
  allProducts: Product[]
  onClose: () => void
  onCreated: () => void
}) {
  const [custName,    setCustName]    = useState('')
  const [custEmail,   setCustEmail]   = useState('')
  const [custPhone,   setCustPhone]   = useState('')
  const [payMethod,   setPayMethod]   = useState('bank_transfer')
  const [orderStatus, setOrderStatus] = useState('pending_manual')
  const [notes,       setNotes]       = useState('')
  const [items,       setItems]       = useState<NewOrderItem[]>([newItemRow()])
  const [saving,      setSaving]      = useState(false)
  const [errors,      setErrors]      = useState<Record<string, string>>({})

  // Discount state
  const [discountMode,  setDiscountMode]  = useState<'code' | 'manual'>('code')
  const [discountCode,  setDiscountCode]  = useState('')
  const [discountType,  setDiscountType]  = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  // The code's rule, not a fixed amount, so the discount follows item changes.
  const [discountValid, setDiscountValid] = useState<{ display: string; type: string; value: number; max: number; min: number } | null>(null)
  const [discountError, setDiscountError] = useState('')
  const [discountChecking, setDiscountChecking] = useState(false)

  const setItem = (key: string, patch: Partial<NewOrderItem>) =>
    setItems(prev => prev.map(i => i._key === key ? { ...i, ...patch } : i))

  const onPeriodChange = (item: NewOrderItem, period: string) => {
    const product = allProducts.find(p => p.id === item.product_id)
    const priceField = PRICE_FIELD[period] || 'price_3m'
    const price = product ? ((product[priceField] as number) || 0) : 0
    setItem(item._key, {
      billing_period: period,
      duration_months: BILLING_MONTHS[period] || 3,
      unit_price_ngn: price,
      is_overridden: false,
    })
  }

  const subtotal = items.reduce((s, i) => {
    const price = typeof i.unit_price_ngn === 'number' ? i.unit_price_ngn : 0
    return s + price * i.quantity
  }, 0)
  
  // Compute discount NGN from whichever mode is active
  const codeDiscountNGN = (() => {
    if (!discountValid || subtotal < discountValid.min) return 0
    let ngn = discountValid.type === 'percentage' ? Math.round(subtotal * discountValid.value / 100) : discountValid.value
    if (discountValid.max > 0) ngn = Math.min(ngn, discountValid.max)
    return Math.max(0, Math.min(ngn, subtotal))
  })()

  const discNGN = (() => {
    if (discountMode === 'code') return codeDiscountNGN
    if (!discountValue) return 0
    const v = parseFloat(discountValue) || 0
    if (discountType === 'percentage') return Math.round(subtotal * v / 100)
    return v
  })()
  
  const total = Math.max(0, subtotal - discNGN)

  const applyDiscountCode = async () => {
    const code = discountCode.trim().toUpperCase()
    if (!code) return
    setDiscountChecking(true)
    setDiscountError('')
    setDiscountValid(null)
    const r = await apiFetch(`/v2/admin/discounts?code=${encodeURIComponent(code)}`)
    if (!r.ok || !r.data?.length) {
      setDiscountError('Code not found or inactive.')
      setDiscountChecking(false)
      return
    }
    // ?code= filters server-side; the exact-match check guards against an API
    // that ignores it (it used to, so this applied the newest code instead).
    const d = r.data.find((x: any) => String(x.code).toUpperCase() === code)
    if (!d) { setDiscountError('Code not found or inactive.'); setDiscountChecking(false); return }
    if (!d.active) { setDiscountError('Code is inactive.'); setDiscountChecking(false); return }
    if (d.active_from && new Date(d.active_from) > new Date()) { setDiscountError('Code is not active yet.'); setDiscountChecking(false); return }
    if (d.expires_at && new Date(d.expires_at) < new Date()) { setDiscountError('Code has expired.'); setDiscountChecking(false); return }
    if (d.max_uses != null && d.times_used >= d.max_uses) { setDiscountError('Usage limit reached.'); setDiscountChecking(false); return }
    const minNGN = Number(d.min_order_ngn) || 0
    if (minNGN > 0 && subtotal < minNGN) {
      setDiscountError(`Minimum order of ${fmt(minNGN)} required.`)
      setDiscountChecking(false)
      return
    }
    const v = Number(d.value) || 0
    const display = d.type === 'percentage'
      ? `${v}% off${d.max_discount_ngn ? ` (max ${fmt(d.max_discount_ngn)})` : ''}`
      : `${fmt(v)} off`
    setDiscountValid({ display, type: d.type, value: v, max: Number(d.max_discount_ngn) || 0, min: minNGN })
    setDiscountChecking(false)
  }
  
  const validate = () => {
    const e: Record<string, string> = {}
    if (!custEmail.trim()) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(custEmail)) e.email = 'Invalid email'
    if (items.some(i => !i.product_id)) e.items = 'All items must have a product selected'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    const payload = {
      customer_name:  custName  || null,
      customer_email: custEmail.trim(),
      customer_phone: custPhone || null,
      payment_method: payMethod,
      status:         orderStatus,
      notes:          notes || null,
      discount_ngn:   discNGN,
      discount_code:  discountMode === 'code' && discountValid ? discountCode.trim().toUpperCase() : null,
      items: items.map(i => ({
        product_id:      i.product_id,
        billing_period:  i.billing_period,
        duration_months: i.duration_months,
        unit_price_ngn:  typeof i.unit_price_ngn === 'number' ? i.unit_price_ngn : 0,
        quantity:        i.quantity,
      })),
    }
    const r = await apiFetch('/v2/admin/orders', { method: 'POST', body: JSON.stringify(payload) })
    setSaving(false)
    if (r.ok) {
      toast.success(`Order ${r.data?.order_ref} created`)
      onCreated()
      onClose()
    } else {
      toast.error(r.error || 'Failed to create order')
    }
  }

  const IS: React.CSSProperties = {
    height: 'var(--bs-control-md)', padding: '0 var(--bs-space-3)', borderRadius: 'var(--bs-radius-md)', fontSize: 'var(--bs-text-sm)',
    width: '100%', background: T.input, border: `1px solid ${T.border}`,
    color: T.text, boxSizing: 'border-box', outline: 'none'
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:150, animation:'bsFadeIn .2s ease' }}
      />

      {/* Drawer */}
      <div style={{
        position:'fixed', top:0, right:0, bottom:0,
        width:'min(560px,100vw)',
        background: T.card,
        borderLeft:`1px solid ${T.border}`,
        zIndex:200,
        display:'flex', flexDirection:'column',
        animation:'bsSlideIn .25s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:'var(--bs-text-lg)', fontWeight:700, color:T.text }}>New manual order</div>
              <div style={{ fontSize:11, color:T.textMuted, marginTop:3 }}>
                Recorded as placed by staff. No Paystack payment is taken.
              </div>
            </div>
            <button onClick={onClose} style={{
              width:32, height:32, borderRadius:'var(--bs-radius-md)', background:'transparent',
              border:`1px solid ${T.border}`, color:T.textSecondary, cursor:'pointer', fontSize:'var(--bs-text-lg)',
            }}><XIcon /></button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:20 }}>

          {/* ── Customer ── */}
          <section>
            <div style={{ fontSize:'var(--bs-text-sm)', color:T.text, fontWeight:600, marginBottom:12 }}>
              Customer
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div>
                <div style={{ fontSize:11, color:T.textSecondary, marginBottom:4 }}>Email *</div>
                <input
                  style={{ ...IS, borderColor: errors.email ? T.error : T.border }}
                  type="email"
                  placeholder="customer@email.com"
                  value={custEmail}
                  onChange={e => { setCustEmail(e.target.value); setErrors(p => ({...p, email:''})) }}
                />
                {errors.email && <div style={{ fontSize:11, color:T.error, marginTop:3 }}>{errors.email}</div>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:T.textSecondary, marginBottom:4 }}>Full name</div>
                  <input style={IS} placeholder="Optional" value={custName} onChange={e => setCustName(e.target.value)} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:T.textSecondary, marginBottom:4 }}>Phone</div>
                  <input style={IS} placeholder="080…" value={custPhone} onChange={e => setCustPhone(e.target.value)} />
                </div>
              </div>
            </div>
          </section>

          {/* ── Items ── */}
          <section>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ fontSize:'var(--bs-text-sm)', color:T.text, fontWeight:600 }}>
                Items
              </div>
              <button
                onClick={() => setItems(p => [...p, newItemRow()])}
                style={{
                  height:'var(--bs-control-sm)', padding:'0 12px', borderRadius:'var(--bs-radius-md)', background:'transparent',
                  border:`1px solid ${T.border}`, color:T.accent, fontSize:12,
                  fontWeight:600, cursor:'pointer',
                }}
              >Add item</button>
            </div>

            {errors.items && (
              <div style={{ fontSize:11, color:T.error, marginBottom:8 }}>{errors.items}</div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {items.map((item, idx) => (
                <div key={item._key} style={{
                  background:T.elevated, border:`1px solid ${T.border}`,
                  borderRadius:'var(--bs-radius-lg)', padding:14,
                }}>
                  {/* Row 1: product search + remove */}
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
                    <ProductSearchBox
                     
                      allProducts={allProducts}
                      value={item}
                      onChange={patch => setItem(item._key, patch)}
                    />
                    <button
                      onClick={() => setItems(p => p.filter(i => i._key !== item._key))}
                      disabled={items.length === 1}
                      style={{
                        width:32, height:32, borderRadius:'var(--bs-radius-md)', flexShrink:0,
                        background:'transparent', border:`1px solid ${T.border}`,
                        color:T.textMuted, cursor:items.length===1?'not-allowed':'pointer',
                        fontSize:'var(--bs-text-lg)', opacity:items.length===1?0.3:1,
                      }}
                    ><XIcon /></button>
                  </div>

                  {/* Row 2: period / price / qty */}
                  <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1.4fr 0.7fr', gap:8 }}>
                    <div>
                      <div style={{ fontSize:'var(--bs-text-2xs)', color:T.textMuted, marginBottom:4 }}>Period</div>
                      <select
                        style={{ ...IS, height:'var(--bs-control-md)' }}
                        value={item.billing_period}
                        onChange={e => onPeriodChange(item, e.target.value)}
                      >
                        {BILLING_PERIODS.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize:'var(--bs-text-2xs)', color:T.textMuted, marginBottom:4 }}>
                        Unit Price (₦){item.is_overridden && <span style={{ color:T.warning, marginLeft:4 }}>override</span>}
                      </div>
                      <input
                        style={{ ...IS, height:'var(--bs-control-md)' }}
                        type="number"
                        min={0}
                        value={item.unit_price_ngn}
                        onChange={e => setItem(item._key, {
                          unit_price_ngn: e.target.value === '' ? '' : Number(e.target.value),
                          is_overridden: true,
                        })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <div style={{ fontSize:'var(--bs-text-2xs)', color:T.textMuted, marginBottom:4 }}>Qty</div>
                      <input
                        style={{ ...IS, height:'var(--bs-control-md)', textAlign:'center' }}
                        type="number" min={1}
                        value={item.quantity}
                        onChange={e => setItem(item._key, { quantity: Math.max(1, parseInt(e.target.value)||1) })}
                      />
                    </div>
                  </div>

                  {/* Line total */}
                  {item.product_id && (
                    <div style={{ marginTop:8, textAlign:'right', fontSize:12, color:T.textSecondary }}>
                      Line total:{' '}
                      <span style={{ color:T.text, fontWeight:600 }}>
                        {fmt((typeof item.unit_price_ngn==='number' ? item.unit_price_ngn : 0) * item.quantity)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── Order details ── */}
          <section>
            <div style={{ fontSize:'var(--bs-text-sm)', color:T.text, fontWeight:600, marginBottom:12 }}>
              Order details
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <div style={{ fontSize:11, color:T.textSecondary, marginBottom:4 }}>Payment method</div>
                <select style={IS} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  {PAYMENT_METHODS_MANUAL.map(m => (<option key={m.value} value={m.value}>{m.label}</option>))}
                </select>
              </div>
              <div>
                <div style={{ fontSize:11, color:T.textSecondary, marginBottom:4 }}>Initial status</div>
                <select style={IS} value={orderStatus} onChange={e => setOrderStatus(e.target.value)}>
                  <option value="pending_manual">Pending (needs approval)</option>
                  <option value="paid">Paid (mark as done)</option>
                </select>
              </div>
            </div>
            <div>
              <div style={{ fontSize:11, color:T.textSecondary, marginBottom:8 }}>Discount</div>

              {/* Mode toggle */}
              <div style={{
                display:'flex', gap:4, background:T.elevated, border:`1px solid ${T.border}`,
                borderRadius:999, padding:3, marginBottom:10, width:'fit-content',
              }}>
                {(['code','manual'] as const).map(m => (
                  <button key={m} onClick={() => {
                    setDiscountMode(m)
                    setDiscountValid(null)
                    setDiscountError('')
                    setDiscountCode('')
                    setDiscountValue('')
                  }} style={{
                    height:'var(--bs-control-sm)', padding:'0 14px', borderRadius:999, border:'none',
                    background: discountMode===m ? T.accentFill : 'transparent',
                    color: discountMode===m ? '#fff' : T.text,
                    fontSize:12, fontWeight:600, cursor:'pointer',
                  }}>
                    {m === 'code' ? 'Promo code' : 'Manual'}
                  </button>
                ))}
              </div>

              {discountMode === 'code' ? (
                <>
                  {discountValid ? (
                    <div style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'10px 14px', borderRadius:10,
                      background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.2)',
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{
                          fontSize:11, background:'rgba(22,163,74,0.18)', borderRadius:4,
                          padding:'2px 8px', color:T.success, fontWeight:700, letterSpacing:'0.05em',
                        }}>{discountCode.toUpperCase()}</span>
                        <span style={{ fontSize:13, color:T.success }}>{discountValid.display} · saves {fmt(codeDiscountNGN)}</span>
                      </div>
                      <button onClick={() => { setDiscountValid(null); setDiscountCode('') }}
                        style={{ background:'transparent', border:'none', color:T.textFaint, cursor:'pointer', fontSize:18, lineHeight:1 }}><XIcon /></button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display:'flex', gap:8 }}>
                        <input
                          style={{ ...IS, flex:1, letterSpacing:'0.05em' }}
                          placeholder="PROMO CODE"
                          value={discountCode}
                          onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setDiscountError('') }}
                          onKeyDown={e => e.key === 'Enter' && applyDiscountCode()}
                        />
                        <button
                          onClick={applyDiscountCode}
                          disabled={discountChecking || !discountCode.trim()}
                          style={{
                            height:40, padding:'0 16px', borderRadius:10, border:'none', flexShrink:0,
                            background: discountCode.trim() ? T.accentFill : T.muted,
                            color: discountCode.trim() ? '#fff' : T.textFaint,
                            cursor: discountCode.trim() ? 'pointer' : 'not-allowed',
                            fontSize:13, fontWeight:600,
                          }}
                        >{discountChecking ? '…' : 'Apply'}</button>
                      </div>
                      {discountError && <div style={{ fontSize:11, color:T.error, marginTop:5 }}>{discountError}</div>}
                    </>
                  )}
                </>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:8 }}>
                  <select style={IS} value={discountType} onChange={e => setDiscountType(e.target.value as any)}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed amount (₦)</option>
                  </select>
                  <div style={{ position:'relative' }}>
                    <input
                      style={IS}
                      type="number" min={0}
                      placeholder={discountType === 'percentage' ? 'e.g. 10' : 'e.g. 5000'}
                      value={discountValue}
                      onChange={e => setDiscountValue(e.target.value)}
                    />
                    {discountValue && (
                      <div style={{
                        position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                        fontSize:11, color:T.textMuted, pointerEvents:'none',
                      }}>
                        {discountType === 'percentage'
                          ? `= ${fmt(Math.round(subtotal * (parseFloat(discountValue)||0) / 100))}`
                          : ''}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize:11, color:T.textSecondary, marginBottom:4 }}>Notes (internal)</div>
              <textarea
                style={{ ...IS, height:72, padding:'8px 12px', resize:'vertical', lineHeight:1.6 } as any}
                placeholder="e.g. Paid via transfer on 01/06, receipt sent"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </section>

          {/* ── Totals ── */}
          <section style={{
            background:T.elevated, border:`1px solid ${T.border}`,
            borderRadius:12, padding:'14px 16px',
          }}>
            {discNGN > 0 && (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:T.textSecondary, marginBottom:6 }}>
                  <span>Subtotal</span><span>{fmt(subtotal)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:T.success, marginBottom:8 }}>
                  <span>Discount</span><span>−{fmt(discNGN)}</span>
                </div>
                <div style={{ height:1, background:T.border, marginBottom:8 }} />
              </>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <span style={{ fontSize:13, color:T.textSecondary }}>Total</span>
              <span style={{ fontSize:20, fontWeight:700, color:T.text }}>{fmt(total)}</span>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 24px', borderTop:`1px solid ${T.border}`, display:'flex', gap:10, flexShrink:0 }}>
          <button
            onClick={onClose}
            style={{
              flex:'0 0 auto', height:44, padding:'0 22px', borderRadius:10,
              background:'transparent', border:`1px solid ${T.border}`,
              color:T.textSecondary, fontSize:14, fontWeight:600,
              cursor:'pointer',
            }}
          >Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex:1, height:44, borderRadius:10, background:T.accentFill, border:'none',
              color:'#fff', fontSize:14, fontWeight:600, cursor:saving?'not-allowed':'pointer',
              opacity:saving?0.6:1, transition:'opacity .15s',
            }}
          >
            {saving ? 'Creating…' : 'Create order'}
          </button>
        </div>
      </div>
    </>
  )
}
