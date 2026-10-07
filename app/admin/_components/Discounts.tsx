'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"
import { useTheme as useThemeController } from '@/lib/theme'
import { getAccessToken } from '@/lib/session'
import { API_BASE } from '@/lib/config'

import { Badge, ChevronIcon, DRow, DetailSection, Discount, EmptyState, Loading, Order, SmallBtn, T, apiFetch, fmt, fmtDate } from '../_lib/shared'
import { DiscountFormPanel } from './DiscountForm'

// ════════════════════ DISCOUNTS TAB (full CRUD) ════════════════════
export const EMPTY_DISCOUNT = (): any => ({ code: '', type: 'percentage', value: 0, active: true, min_order_ngn: 0, max_uses: null, expires_at: null, active_from: null, max_discount_ngn: null, included_products: null, excluded_products: null, included_categories: null, excluded_categories: null, auto_apply: false, scope: 'site_wide', exclusive: false })

export function DiscountsTab() {
  const [discounts, setDiscounts] = useState<Discount[]>([]); const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false); const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [newDiscount, setNewDiscount] = useState<any>(EMPTY_DISCOUNT())
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await apiFetch('/v2/admin/discounts?limit=100')
    if (r.ok) setDiscounts(r.data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [])

  const createDiscount = async () => {
    if (!newDiscount.code) { toast.error('Code is required'); return }
    setCreating(true)
    const r = await apiFetch('/v2/admin/discounts', { method: 'POST', body: JSON.stringify({ ...newDiscount, code: newDiscount.code.toUpperCase() }) })
    if (r.ok) { setNewDiscount(EMPTY_DISCOUNT()); setShowCreate(false); toast.success("Discount created"); await load() }
    else toast.error(r.error || r.data?.error || 'Failed to create discount')
    setCreating(false)
  }

  const startEdit = (d: Discount) => {
    setEditingId(d.id); setExpanded(null)
    setEditForm({ code: d.code, type: d.type, value: d.value, active: d.active, min_order_ngn: d.min_order_ngn || 0, max_uses: d.max_uses, expires_at: d.expires_at ? d.expires_at.slice(0, 10) : '', active_from: d.active_from ? d.active_from.slice(0, 10) : '', max_discount_ngn: d.max_discount_ngn, included_products: d.included_products || '', excluded_products: d.excluded_products || '', included_categories: d.included_categories || '', excluded_categories: d.excluded_categories || '', auto_apply: !!d.auto_apply, scope: d.scope || 'site_wide', exclusive: !!d.exclusive })
  }

  const saveEdit = async () => {
    if (!editingId) return
    const r = await apiFetch(`/v2/admin/discounts/${editingId}`, { method: 'PATCH', body: JSON.stringify(editForm) })
    if (r.ok) { setEditingId(null); toast.success("Changes saved"); await load() } else toast.error(r.error || r.data?.error || 'Failed to update')
  }

  const deleteDiscount = async (id: string) => {
    if (!confirm('Delete this discount code?')) return
    const r = await apiFetch(`/v2/admin/discounts/${id}`, { method: 'DELETE' })
    if (r.ok) {
      await load();
      toast.success('Discount code deleted successfully')
    }
    else toast.error(r.error || 'Failed to delete discount')
  }

  const toggleActive = async (d: Discount) => {
    const r = await apiFetch(`/v2/admin/discounts/${d.id}`, { method: 'PATCH', body: JSON.stringify({ active: !d.active }) })
    if (r.ok) setDiscounts(prev => prev.map(x => x.id === d.id ? { ...x, active: !d.active } : x))
  }

  return (
    <div>
      <button onClick={() => { setShowCreate(!showCreate); setEditingId(null) }} style={{ height: 'var(--bs-control-md)', padding: '0 20px', borderRadius: 10, background: T.accentFill, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 20 }}>+ New Discount</button>

      {showCreate && <DiscountFormPanel form={newDiscount} setForm={setNewDiscount} onSave={createDiscount} onCancel={() => setShowCreate(false)} saving={creating} title="Create Discount Code" />}
      {editingId && <DiscountFormPanel form={editForm} setForm={setEditForm} onSave={saveEdit} onCancel={() => setEditingId(null)} title="Edit Discount Code" />}

      {loading ? <Loading /> : discounts.length === 0 ? <EmptyState text="No discount codes" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {discounts.map(d => (
            <div key={d.id} style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 'var(--bs-radius-lg)', overflow: 'hidden', opacity: d.active ? 1 : 0.55 }}>
              <div onClick={() => setExpanded(expanded === d.id ? null : d.id)} style={{ padding: '14px 22px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 'var(--bs-text-sm)', fontWeight: 700, color: 'var(--bs-accent-on-surface)', background: 'rgba(var(--bs-accent-rgb), 0.09)', padding: '3px 10px', borderRadius: 6 }}>{d.code}</span>
                  <span style={{ fontSize: 13, color: T.text }}>{d.type === 'percentage' ? `${d.value}% off` : `₦${Number(d.value).toLocaleString()} off`}</span>
                  <Badge status={d.active ? 'active' : 'hidden'} />
                  {d.auto_apply && <span style={{ fontSize: 'var(--bs-text-2xs)', padding: '2px 8px', borderRadius: 'var(--bs-radius-sm)', background: 'rgba(var(--bs-accent-rgb), 0.08)', color: 'var(--bs-accent-on-surface)', fontWeight: 600 }}>Auto</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: T.textMuted }}>{d.times_used || 0} uses</span>
                  <span style={{ color: T.textMuted }}><ChevronIcon open={expanded === d.id} /></span>
                </div>
              </div>
              {expanded === d.id && (
                <div style={{ padding: '0 22px 18px', borderTop: `1px solid ${T.borderSubtle}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, padding: '14px 0' }}>
                    <DetailSection title="Rules">
                      <DRow label="Min Order" value={d.min_order_ngn ? fmt(d.min_order_ngn) : 'None'} />
                      <DRow label="Max Discount" value={d.max_discount_ngn ? fmt(d.max_discount_ngn) : 'No cap'} />
                      <DRow label="Max Uses" value={d.max_uses ? String(d.max_uses) : 'Unlimited'} />
                      <DRow label="Used" value={String(d.times_used || 0)} />
                    </DetailSection>
                    <DetailSection title="Dates">
                      <DRow label="Active From" value={d.active_from ? fmtDate(d.active_from) : 'Immediately'} />
                      <DRow label="Expires" value={d.expires_at ? fmtDate(d.expires_at) : 'Never'} />
                      <DRow label="Created" value={fmtDate(d.created_at)} />
                    </DetailSection>
                    <DetailSection title="Targeting">
                      <DRow label="Scope" value={d.scope || 'site_wide'} />
                      <DRow label="Incl. Products" value={d.included_products || 'All'} />
                      <DRow label="Excl. Products" value={d.excluded_products || 'None'} />
                    </DetailSection>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <SmallBtn color={T.accent} onClick={() => startEdit(d)}>Edit</SmallBtn>
                    <SmallBtn color={d.active ? T.warning : T.success} onClick={() => toggleActive(d)}>{d.active ? 'Deactivate' : 'Activate'}</SmallBtn>
                    <SmallBtn color={T.error} onClick={() => deleteDiscount(d.id)}>Delete</SmallBtn>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
