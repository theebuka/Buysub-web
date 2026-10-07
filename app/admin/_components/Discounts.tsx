'use client'

// /admin/discounts: promo codes. One table; create and edit in a side panel.
// Eligibility rules live in buysub-api-deploy/src/shared/discount.ts
// (mirrored in lib/constants.ts): product and category lists are
// comma-separated names, matched case-insensitively, exclusions first.

import { useState } from 'react'
import { toast } from 'sonner'
import { Badge, Button } from '@/components/ui'
import { DataTable, Filters, TableState, type DTColumn } from '@/components/admin/DataTable'
import { AdminHead, CellTitle, adminStyles as s } from '@/components/admin/AdminUI'
import { FormSection, SelectField, SidePanel, SwitchRow, TextField } from '@/components/admin/AdminForm'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { authFetch } from '@/lib/apiAuth'
import { fmtDate, fmtNGN } from '@/lib/format'
import { useAdminList } from '../_lib/useAdminList'
import type { Discount } from '../_lib/shared'

type Form = Record<string, any>

export const EMPTY_DISCOUNT = (): Form => ({
  code: '', type: 'percentage', value: '', active: true, min_order_ngn: '', max_uses: '', expires_at: '', active_from: '',
  max_discount_ngn: '', included_products: '', excluded_products: '', included_categories: '', excluded_categories: '',
  auto_apply: false, scope: 'site_wide', exclusive: false,
})

const toForm = (d: Discount): Form => ({
  ...EMPTY_DISCOUNT(), ...d,
  value: d.value ?? '', min_order_ngn: d.min_order_ngn || '', max_uses: d.max_uses ?? '', max_discount_ngn: d.max_discount_ngn ?? '',
  expires_at: d.expires_at ? d.expires_at.slice(0, 10) : '', active_from: d.active_from ? d.active_from.slice(0, 10) : '',
  included_products: d.included_products || '', excluded_products: d.excluded_products || '',
  included_categories: d.included_categories || '', excluded_categories: d.excluded_categories || '',
})

const num = (v: any) => v === '' || v == null ? null : Number(v)
const toBody = (f: Form) => ({
  code: String(f.code || '').trim().toUpperCase(), type: f.type, value: Number(f.value) || 0, active: !!f.active,
  min_order_ngn: Number(f.min_order_ngn) || 0, max_uses: num(f.max_uses), max_discount_ngn: num(f.max_discount_ngn),
  expires_at: f.expires_at || null, active_from: f.active_from || null,
  included_products: f.included_products || null, excluded_products: f.excluded_products || null,
  included_categories: f.included_categories || null, excluded_categories: f.excluded_categories || null,
  auto_apply: !!f.auto_apply, exclusive: !!f.exclusive, scope: f.scope || 'site_wide',
})

const offLabel = (d: { type: string; value: number }) => d.type === 'percentage' ? `${Number(d.value)}% off` : `${fmtNGN(d.value)} off`

function state(d: Discount): { label: string; tone: 'success' | 'neutral' | 'warning' | 'error' } {
  const now = Date.now()
  if (!d.active) return { label: 'Off', tone: 'neutral' }
  if (d.expires_at && new Date(d.expires_at).getTime() < now) return { label: 'Expired', tone: 'neutral' }
  if (d.max_uses && d.times_used >= d.max_uses) return { label: 'Used up', tone: 'neutral' }
  if (d.active_from && new Date(d.active_from).getTime() > now) return { label: 'Scheduled', tone: 'warning' }
  return { label: 'Live', tone: 'success' }
}

function Editor({ editing, setEditing, onSaved, onDeleted }: {
  editing: { id: string | null; form: Form } | null
  setEditing: (fn: (e: { id: string | null; form: Form } | null) => { id: string | null; form: Form } | null) => void
  onSaved: () => void
  onDeleted: (id: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [del, setDel] = useState(false)
  const f = editing?.form || {}
  const set = (k: string) => (v: any) => setEditing(e => e ? { ...e, form: { ...e.form, [k]: v } } : e)
  const pct = f.type === 'percentage'
  const valueError = pct && Number(f.value) > 100 ? 'Can’t be more than 100%' : undefined
  const save = async () => {
    if (!editing) return
    setSaving(true)
    const r = editing.id
      ? await authFetch(`/v2/admin/discounts/${editing.id}`, { method: 'PATCH', body: toBody(f) })
      : await authFetch('/v2/admin/discounts', { method: 'POST', body: toBody(f) })
    setSaving(false)
    if (!r.ok) { toast.error(r.error || 'Couldn’t save the code'); return }
    toast.success(editing.id ? 'Code saved' : `${toBody(f).code} created`)
    onSaved()
  }
  const remove = async () => {
    if (!editing?.id) return
    const r = await authFetch(`/v2/admin/discounts/${editing.id}`, { method: 'DELETE' })
    if (!r.ok) { toast.error(r.error || 'Couldn’t delete the code'); return }
    toast.success('Code deleted')
    setDel(false)
    onDeleted(editing.id)
  }
  return (
    <SidePanel open={!!editing} onClose={() => !saving && setEditing(() => null)} width={600}
      title={editing?.id ? f.code : 'New discount code'}
      footer={<>
        {editing?.id && <Button size="md" variant="ghost" onClick={() => setDel(true)} style={{ marginRight: 'auto', color: 'var(--bs-error)' } as any}>Delete</Button>}
        <Button size="md" variant="secondary" onClick={() => setEditing(() => null)} disabled={saving}>Cancel</Button>
        <Button size="md" loading={saving} disabled={!String(f.code || '').trim() || !(Number(f.value) > 0) || !!valueError} onClick={save}>{editing?.id ? 'Save changes' : 'Create code'}</Button>
      </>}>
      <form onSubmit={e => { e.preventDefault(); save() }}>
        <FormSection title="Code">
          <div className={s.cols2}>
            <TextField label="Code" value={f.code} onChange={v => set('code')(v.toUpperCase().replace(/\s+/g, ''))} placeholder="SAVE10" autoFocus={!editing?.id} />
            <SelectField label="Type" value={f.type || 'percentage'} onChange={set('type')} options={[{ value: 'percentage', label: 'Percentage' }, { value: 'fixed', label: 'Fixed amount (₦)' }]} />
            <TextField label={pct ? 'Percent off' : 'Amount off (₦)'} type="number" min={0} value={f.value} onChange={set('value')} error={valueError} />
            {pct && <TextField label="Cap (₦)" type="number" min={0} value={f.max_discount_ngn} onChange={set('max_discount_ngn')} placeholder="No cap" hint="Most a single order can save." />}
          </div>
        </FormSection>
        <FormSection title="Limits">
          <div className={s.cols2}>
            <TextField label="Minimum order (₦)" type="number" min={0} value={f.min_order_ngn} onChange={set('min_order_ngn')} placeholder="None" hint="Counted on eligible items only." />
            <TextField label="Total uses" type="number" min={0} value={f.max_uses} onChange={set('max_uses')} placeholder="Unlimited" />
            <TextField label="Starts" type="date" value={f.active_from} onChange={set('active_from')} hint="Blank starts now." />
            <TextField label="Ends" type="date" value={f.expires_at} onChange={set('expires_at')} hint="Blank never ends." />
          </div>
        </FormSection>
        <FormSection title="Applies to" hint="Comma-separated product or category names. Leave blank for everything. Exclusions win.">
          <div className={s.cols2}>
            <TextField label="Only these products" value={f.included_products} onChange={set('included_products')} placeholder="All products" />
            <TextField label="Except these products" value={f.excluded_products} onChange={set('excluded_products')} />
            <TextField label="Only these categories" value={f.included_categories} onChange={set('included_categories')} placeholder="All categories" />
            <TextField label="Except these categories" value={f.excluded_categories} onChange={set('excluded_categories')} />
          </div>
        </FormSection>
        <FormSection title="Behaviour">
          <SwitchRow label="Active" hint="Off codes can’t be used." checked={!!f.active} onChange={set('active')} />
          <SwitchRow label="Apply automatically" hint="Added to eligible carts without typing the code." checked={!!f.auto_apply} onChange={set('auto_apply')} />
          <SwitchRow label="Exclusive" hint="Can’t be combined: an automatic exclusive code hides the promo code box." checked={!!f.exclusive} onChange={set('exclusive')} />
        </FormSection>
        <button type="submit" hidden />
      </form>
      <ConfirmDialog open={del} title={`Delete ${f.code}?`} confirmLabel="Delete" danger onConfirm={remove} onClose={() => setDel(false)}>
        <p>Customers can no longer use this code. Orders that already used it keep their discount. To pause a code instead, switch it off.</p>
      </ConfirmDialog>
    </SidePanel>
  )
}

export function DiscountsTab() {
  const list = useAdminList<Discount>('/v2/admin/discounts', { limit: 100 })
  const [editing, setEditing] = useState<{ id: string | null; form: Form } | null>(null)
  const [view, setView] = useState('')

  const rows = list.rows.filter(d => !view || (view === 'live' ? state(d).label === 'Live' : state(d).label !== 'Live'))
  const columns: DTColumn<Discount>[] = [
    {
      key: 'code', header: 'Code',
      cell: d => <CellTitle title={<button type="button" className={`${s.textLink} ${s.mono}`} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--bs-text-sm)', fontWeight: 600 }} onClick={() => setEditing({ id: d.id, form: toForm(d) })}>{d.code}</button>}
        sub={[d.auto_apply && 'Automatic', d.exclusive && 'Exclusive'].filter(Boolean).join(' · ')} />,
    },
    { key: 'off', header: 'Discount', cell: d => <CellTitle title={offLabel(d)} sub={[d.max_discount_ngn ? `up to ${fmtNGN(d.max_discount_ngn)}` : '', d.min_order_ngn ? `min ${fmtNGN(d.min_order_ngn)}` : ''].filter(Boolean).join(', ')} /> },
    { key: 'applies', header: 'Applies to', cell: d => <span className={`${s.secondary} ${s.clip}`} style={{ display: 'block' }}>{d.included_products || d.included_categories || 'Everything'}{d.excluded_products || d.excluded_categories ? ' (with exclusions)' : ''}</span> },
    { key: 'used', header: 'Used', align: 'right', cell: d => <span>{(d.times_used || 0).toLocaleString()}{d.max_uses ? <span className={s.muted}> / {d.max_uses.toLocaleString()}</span> : ''}</span> },
    { key: 'window', header: 'Runs', cell: d => <span className={s.secondary}>{d.active_from || d.expires_at ? `${d.active_from ? fmtDate(d.active_from) : 'Now'} to ${d.expires_at ? fmtDate(d.expires_at) : 'no end'}` : 'Always'}</span> },
    { key: 'state', header: 'Status', cell: d => { const st = state(d); return <Badge tone={st.tone} dot>{st.label}</Badge> } },
  ]

  return (
    <>
      <AdminHead title="Discounts" actions={<Button size="md" icon="plus" onClick={() => setEditing({ id: null, form: EMPTY_DISCOUNT() })}>New code</Button>} />
      <DataTable
        caption="Discount codes"
        columns={columns}
        rows={rows}
        rowKey={d => d.id}
        onRowClick={d => setEditing({ id: d.id, form: toForm(d) })}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        toolbar={<Filters label="Show" value={view} onChange={setView} options={[{ value: '', label: 'All' }, { value: 'live', label: 'Live' }, { value: 'other', label: 'Off, expired or scheduled' }]} />}
        empty={<TableState title={view ? 'No codes here' : 'No discount codes yet'} action={!view ? <Button size="sm" icon="plus" onClick={() => setEditing({ id: null, form: EMPTY_DISCOUNT() })}>New code</Button> : undefined} />}
      />
      <Editor editing={editing} setEditing={setEditing}
        onSaved={() => { setEditing(null); list.reload() }}
        onDeleted={id => { setEditing(null); list.setRows(rs => rs.filter(r => r.id !== id)) }} />
    </>
  )
}
