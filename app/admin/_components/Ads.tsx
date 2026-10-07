'use client'

// /admin/ads: shop banners, sidebar tiles and sponsored product cards
// (components/ShopAds.tsx reads the first three placements).

import { useState } from 'react'
import { toast } from 'sonner'
import { Badge, Button } from '@/components/ui'
import { DataTable, TableState, type DTColumn } from '@/components/admin/DataTable'
import { AdminHead, CellTitle, adminStyles as s } from '@/components/admin/AdminUI'
import { FormSection, SelectField, SidePanel, TextField } from '@/components/admin/AdminForm'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { authFetch } from '@/lib/apiAuth'
import { fmtDate } from '@/lib/format'
import { useAdminList } from '../_lib/useAdminList'

type Ad = { id: string; title: string; image_url: string; link?: string; placement: string; active: boolean; view_count?: number; click_count?: number; starts_at?: string | null; ends_at?: string | null }

const PLACEMENTS = [
  { value: 'shop_banner', label: 'Shop banner' },
  { value: 'shop_sidebar', label: 'Shop sidebar' },
  { value: 'shop_product_card', label: 'Sponsored product card' },
  { value: 'cart_drawer', label: 'Cart drawer (not shown yet)' },
  { value: 'receipt_footer', label: 'Receipt footer (not shown yet)' },
]
const placementLabel = (p: string) => PLACEMENTS.find(x => x.value === p)?.label.replace(/ \(not shown yet\)$/, '') || p.replace(/_/g, ' ')

const BLANK = { title: '', image_url: '', link: '', placement: 'shop_banner', starts_at: '', ends_at: '' }

export function AdsTab() {
  const list = useAdminList<Ad>('/v2/admin/ads', { limit: 25 })
  const [form, setForm] = useState<typeof BLANK | null>(null)
  const [saving, setSaving] = useState(false)
  const [del, setDel] = useState<Ad | null>(null)
  const set = (k: keyof typeof BLANK) => (v: string) => setForm(f => f ? { ...f, [k]: v } : f)

  const create = async () => {
    if (!form) return
    setSaving(true)
    const r = await authFetch('/v2/admin/ads', { method: 'POST', body: { ...form, starts_at: form.starts_at || null, ends_at: form.ends_at || null } })
    setSaving(false)
    if (!r.ok) { toast.error(r.error || 'Couldn’t create the ad'); return }
    toast.success('Ad created')
    setForm(null)
    list.reload()
  }
  const toggle = async (a: Ad) => {
    const r = await authFetch(`/v2/admin/ads/${a.id}`, { method: 'PATCH', body: { active: !a.active } })
    if (r.ok) list.patchRow(x => x.id === a.id, { active: !a.active }); else toast.error(r.error || 'Couldn’t update the ad')
  }
  const remove = async () => {
    if (!del) return
    const r = await authFetch(`/v2/admin/ads/${del.id}`, { method: 'DELETE' })
    if (!r.ok) { toast.error(r.error || 'Couldn’t delete the ad'); return }
    list.setRows(rs => rs.filter(x => x.id !== del.id))
    toast.success('Ad deleted')
    setDel(null)
  }

  const columns: DTColumn<Ad>[] = [
    {
      key: 'ad', header: 'Ad',
      cell: a => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bs-space-3)', minWidth: 0, maxWidth: 420 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.image_url} alt="" width={64} height={36} style={{ width: 64, height: 36, objectFit: 'cover', borderRadius: 'var(--bs-radius-sm)', background: 'var(--bs-bg-elevated)', flexShrink: 0 }} />
          <CellTitle title={a.title} sub={a.link} />
        </div>
      ),
    },
    { key: 'placement', header: 'Placement', cell: a => <span className={s.secondary}>{placementLabel(a.placement)}</span> },
    { key: 'views', header: 'Views', align: 'right', cell: a => (a.view_count || 0).toLocaleString() },
    { key: 'clicks', header: 'Clicks', align: 'right', cell: a => (a.click_count || 0).toLocaleString() },
    { key: 'ctr', header: 'Click rate', align: 'right', cell: a => <span className={s.secondary}>{a.view_count ? `${((100 * (a.click_count || 0)) / a.view_count).toFixed(1)}%` : '-'}</span> },
    { key: 'runs', header: 'Runs', cell: a => <span className={s.secondary}>{a.starts_at || a.ends_at ? `${a.starts_at ? fmtDate(a.starts_at) : 'Now'} to ${a.ends_at ? fmtDate(a.ends_at) : 'no end'}` : 'Always'}</span> },
    { key: 'status', header: 'Status', cell: a => a.active ? <Badge tone="success" dot>Live</Badge> : <Badge tone="neutral" dot>Paused</Badge> },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', width: 170,
      cell: a => (
        <span style={{ display: 'inline-flex', gap: 'var(--bs-space-1)' }}>
          <Button size="sm" variant="secondary" onClick={() => toggle(a)}>{a.active ? 'Pause' : 'Resume'}</Button>
          <Button size="sm" variant="ghost" onClick={() => setDel(a)}>Delete</Button>
        </span>
      ),
    },
  ]

  return (
    <>
      <AdminHead title="Ads" lede="Banners and sponsored cards in the shop." actions={<Button size="md" icon="plus" onClick={() => setForm({ ...BLANK })}>New ad</Button>} />
      <DataTable caption="Ads" columns={columns} rows={list.rows} rowKey={a => a.id}
        loading={list.loading} error={list.error} onRetry={list.reload}
        pagination={list.pagination} onPage={p => list.setParams({ page: String(p) })}
        empty={<TableState title="No ads yet" action={<Button size="sm" icon="plus" onClick={() => setForm({ ...BLANK })}>New ad</Button>} />} />
      <SidePanel open={!!form} onClose={() => !saving && setForm(null)} title="New ad" width={560}
        footer={<>
          <Button size="md" variant="secondary" onClick={() => setForm(null)} disabled={saving}>Cancel</Button>
          <Button size="md" loading={saving} disabled={!form?.title || !form?.image_url || !form?.link} onClick={create}>Create ad</Button>
        </>}>
        {form && (
          <form onSubmit={e => { e.preventDefault(); create() }}>
            <FormSection title="Content">
              <TextField label="Title" value={form.title} onChange={set('title')} autoFocus />
              <TextField label="Image URL" value={form.image_url} onChange={v => set('image_url')(v.trim())} placeholder="https://…" hint="Banners look best at 4:1." />
              {/^https?:\/\//.test(form.image_url) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.image_url} alt="Preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 'var(--bs-radius-md)', border: '1px solid var(--bs-border-subtle)' }} />
              )}
              <TextField label="Link" value={form.link} onChange={v => set('link')(v.trim())} placeholder="/shop/c/ai or https://…" />
            </FormSection>
            <FormSection title="Where and when">
              <SelectField label="Placement" value={form.placement} onChange={set('placement')} options={PLACEMENTS} />
              <div className={s.cols2}>
                <TextField label="Starts" type="date" value={form.starts_at} onChange={set('starts_at')} hint="Blank starts now." />
                <TextField label="Ends" type="date" value={form.ends_at} onChange={set('ends_at')} hint="Blank runs until paused." />
              </div>
            </FormSection>
            <button type="submit" hidden />
          </form>
        )}
      </SidePanel>
      <ConfirmDialog open={!!del} title={`Delete “${del?.title}”?`} confirmLabel="Delete" danger onConfirm={remove} onClose={() => setDel(null)}>
        <p>Its view and click counts go with it. Pause it instead to keep the numbers.</p>
      </ConfirmDialog>
    </>
  )
}
