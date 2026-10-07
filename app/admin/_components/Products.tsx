'use client'

// /admin/products: the whole catalogue in one table, filtered client-side
// (a few hundred rows) with the filters in the URL. Editing opens a side
// panel; visibility and stock can be changed in bulk.

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Badge, Button, Icon, ProductLogo, StatusBadge } from '@/components/ui'
import { DataTable, Filters, SearchBox, TableState, type DTColumn } from '@/components/admin/DataTable'
import { AdminHead, CellTitle, adminStyles as s } from '@/components/admin/AdminUI'
import { authFetch } from '@/lib/apiAuth'
import { invalidate } from '@/lib/useApi'
import { fmtNGN, categoryLabel } from '@/lib/format'
import { availablePeriods, fromPrice } from '@/lib/pricing'
import { ALL_CATEGORIES, type Product } from '../_lib/shared'
import { ProductEditor, slugify, type ProductFormState } from './ProductForm'
import { loadAllProducts } from './productsCache'

export const EMPTY_PRODUCT = (): ProductFormState => ({
  name: '', slug: '', category: '', tags: '', description: '', short_description: '', category_tagline: '',
  domain: '', billing_type: 'subscription', billing_period: '',
  price_1m: 0, price_3m: 0, price_6m: 0, price_1y: 0,
  stock_status: 'in_stock', status: 'active', featured: false, sort_order: 100, image_url: '',
  whatsapp_group_url: '',
  badge: '', delivery_time: '', delivery_method: '', region: '',
  features: [], how_it_works: [], faqs: [], seo_title: '', seo_description: '',
})

const EDIT_KEYS = Object.keys(EMPTY_PRODUCT())

function toForm(p: Product): ProductFormState {
  const f: ProductFormState = {}
  const src = p as any
  for (const k of EDIT_KEYS) {
    const empty = EMPTY_PRODUCT()[k]
    f[k] = src[k] ?? empty
  }
  return f
}

const PAGE = 50
type View = '' | 'active' | 'hidden' | 'out_of_stock' | 'unpriced'

export function ProductsTab() {
  const search = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const q = search.get('q') || ''
  const view = (search.get('view') || '') as View
  const category = search.get('category') || ''
  const page = Math.max(1, Number(search.get('page')) || 1)

  const setParams = useCallback((patch: Record<string, string>) => {
    const next = new URLSearchParams(search.toString())
    for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k)
    if (!('page' in patch)) next.delete('page')
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [search, router, pathname])

  const [all, setAll] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<{ id: string | null; form: ProductFormState } | null>(null)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (fresh = false) => {
    setLoading(true)
    setError('')
    const rows = await loadAllProducts(fresh)
    if (!rows.length) {
      const probe = await authFetch('/v2/admin/products?limit=1')
      if (!probe.ok) setError(probe.error || 'Could not load products.')
    }
    setAll(rows)
    setLoading(false)
  }, [])
  useEffect(() => { load(true) }, [load])

  const priced = (p: Product) => availablePeriods(p as any).length > 0
  const counts = useMemo(() => ({
    all: all.length,
    active: all.filter(p => p.status === 'active').length,
    hidden: all.filter(p => p.status !== 'active').length,
    out_of_stock: all.filter(p => p.stock_status === 'out_of_stock').length,
    unpriced: all.filter(p => !priced(p)).length,
  }), [all])

  const filtered = useMemo(() => {
    let list = all
    if (view === 'active') list = list.filter(p => p.status === 'active')
    else if (view === 'hidden') list = list.filter(p => p.status !== 'active')
    else if (view === 'out_of_stock') list = list.filter(p => p.stock_status === 'out_of_stock')
    else if (view === 'unpriced') list = list.filter(p => !priced(p))
    if (category) list = list.filter(p => String(p.category || '').toLowerCase().split(',').map(x => x.trim()).includes(category))
    if (q) {
      const t = q.toLowerCase()
      list = list.filter(p => `${p.name} ${p.slug} ${p.category} ${p.tags} ${p.domain}`.toLowerCase().includes(t))
    }
    return [...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
  }, [all, view, category, q])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const rows = filtered.slice((Math.min(page, pages) - 1) * PAGE, Math.min(page, pages) * PAGE)

  const patch = async (items: Product[], body: Record<string, any>, done: string) => {
    setBusy(true)
    let ok = 0
    for (const p of items) {
      const r = await authFetch(`/v2/admin/products/${p.id}`, { method: 'PATCH', body })
      if (r.ok) { ok++; setAll(prev => prev.map(x => x.id === p.id ? { ...x, ...body, ...(r.data && typeof r.data === 'object' ? r.data : {}) } : x)) }
      else toast.error(`${p.name}: ${r.error || 'Could not update'}`)
    }
    setBusy(false)
    if (ok) { toast.success(ok === 1 ? done : `${ok} products updated`); invalidate('/v2/admin/stats'); loadAllProducts(true) }
  }

  const save = async () => {
    if (!editing) return
    const body = { ...editing.form, slug: editing.form.slug || slugify(editing.form.name || '') }
    setSaving(true)
    const r = editing.id
      ? await authFetch(`/v2/admin/products/${editing.id}`, { method: 'PATCH', body })
      : await authFetch('/v2/admin/products', { method: 'POST', body })
    setSaving(false)
    if (!r.ok) { toast.error(r.error || 'Couldn’t save. Check the fields and try again.'); return }
    toast.success(editing.id ? 'Product saved' : 'Product created')
    if (editing.id && r.data && typeof r.data === 'object') setAll(prev => prev.map(x => x.id === editing.id ? { ...x, ...(r.data as any) } : x))
    else load(true)
    invalidate('/v2/admin/stats')
    setEditing(null)
  }

  const columns: DTColumn<Product>[] = [
    {
      key: 'product', header: 'Product',
      cell: p => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bs-space-3)', minWidth: 0, maxWidth: 380 }}>
          <ProductLogo product={p} size={32} radius="var(--bs-radius-sm)" />
          <CellTitle
            title={<button type="button" className={s.textLink} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', textAlign: 'left' }} onClick={() => setEditing({ id: p.id, form: toForm(p) })}>{p.name}</button>}
            sub={[p.slug, p.featured ? 'Featured' : ''].filter(Boolean).join(' · ')} />
        </div>
      ),
    },
    { key: 'category', header: 'Category', cell: p => <span className={s.secondary}>{p.category ? p.category.split(',').map(c => categoryLabel(c.trim())).join(', ') : '-'}</span> },
    {
      key: 'price', header: 'Price', align: 'right',
      cell: p => {
        const fp = fromPrice(p as any)
        const n = availablePeriods(p as any).length
        return fp
          ? <span className={s.cellTitle} style={{ alignItems: 'flex-end' }}><span>{n > 1 ? 'From ' : ''}{fmtNGN(fp.price)}</span><span>{p.billing_type === 'one_time' ? 'One-time' : `${n} ${n === 1 ? 'period' : 'periods'}`}</span></span>
          : <Badge tone="warning">No price</Badge>
      },
    },
    { key: 'stock', header: 'Stock', cell: p => <StatusBadge status={p.stock_status} audience="admin" /> },
    { key: 'status', header: 'Visibility', cell: p => <StatusBadge status={p.status === 'active' ? 'active' : 'hidden'} audience="admin" /> },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', width: 150,
      cell: p => (
        <span style={{ display: 'inline-flex', gap: 'var(--bs-space-1)' }}>
          <Link href={`/shop/${p.slug}`} target="_blank" className={s.panelLink} style={{ alignSelf: 'center', marginRight: 'var(--bs-space-2)' }}>View</Link>
          <Button size="sm" variant="secondary" onClick={() => setEditing({ id: p.id, form: toForm(p) })}>Edit</Button>
        </span>
      ),
    },
  ]

  const categories = useMemo(() => ALL_CATEGORIES.filter(c => c !== 'all'), [])
  const layout = search.get('layout') === 'table' ? 'table' : 'grid'

  // The product as it looks in the shop, with the admin's state and actions.
  const card = (p: Product, sel: { checked: boolean; toggle: () => void }) => {
    const fp = fromPrice(p as any)
    const n = availablePeriods(p as any).length
    const cat = String(p.category || '').split(',')[0].trim()
    const hidden = p.status !== 'active'
    const out = p.stock_status === 'out_of_stock'
    return (
      <article className={`${s.pcard} ${sel.checked ? s.pcardOn : ''} ${hidden ? s.pcardDim : ''}`}>
        <input type="checkbox" className={s.pcardCheck} aria-label={`Select ${p.name}`} checked={sel.checked} onChange={sel.toggle} />
        <div className={s.pcardTop}>
          <ProductLogo product={p} size={40} />
          <div className={s.pcardHead}>
            <button type="button" className={s.pcardName} title={p.name} onClick={() => setEditing({ id: p.id, form: toForm(p) })}>{p.name}</button>
            <span className={s.pcardCat}>{cat ? categoryLabel(cat) : 'No category'}</span>
          </div>
        </div>
        <p className={s.pcardDesc}>{p.short_description || p.category_tagline || p.description || <span className={s.muted}>No description</span>}</p>
        <div className={s.pcardTags}>
          {hidden && <Badge dot tone="neutral">Hidden</Badge>}
          {out && <Badge dot tone="error">Out of stock</Badge>}
          {!fp && <Badge dot tone="warning">No price</Badge>}
          {p.featured && <Badge>Featured</Badge>}
          {(p as any).badge && <Badge>{(p as any).badge}</Badge>}
          {!hidden && !out && fp && !p.featured && !(p as any).badge && <Badge dot tone="success">Live</Badge>}
        </div>
        <div className={s.pcardFoot}>
          {fp
            ? <span className={s.pcardPrice}><b>{fmtNGN(fp.price)}</b><span>{p.billing_type === 'one_time' ? 'one-time' : `${n} ${n === 1 ? 'plan' : 'plans'}`}</span></span>
            : <span className={s.muted}>Not priced</span>}
          <span className={s.pcardActions}>
            <Link href={`/shop/${p.slug}`} target="_blank" className={s.panelLink}>View</Link>
            <Button size="sm" variant="secondary" onClick={() => setEditing({ id: p.id, form: toForm(p) })}>Edit</Button>
          </span>
        </div>
      </article>
    )
  }

  return (
    <>
      <AdminHead title="Products"
        lede={`${counts.all.toLocaleString()} products, ${counts.active.toLocaleString()} live in the shop.`}
        actions={<Button size="sm" icon="plus" onClick={() => setEditing({ id: null, form: EMPTY_PRODUCT() })}>New product</Button>} />
      <DataTable
        caption="Products"
        columns={columns}
        rows={rows}
        rowKey={p => p.id}
        loading={loading}
        error={error}
        onRetry={() => load(true)}
        selectable
        card={layout === 'grid' ? card : undefined}
        bulkActions={(sel, clear) => (
          <>
            <Button size="sm" variant="secondary" disabled={busy} onClick={async () => { await patch(sel, { status: 'hidden' }, 'Product hidden'); clear() }}>Hide</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={async () => { await patch(sel, { status: 'active' }, 'Product shown'); clear() }}>Show</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={async () => { await patch(sel, { stock_status: 'out_of_stock' }, 'Marked out of stock'); clear() }}>Out of stock</Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={async () => { await patch(sel, { stock_status: 'in_stock' }, 'Marked in stock'); clear() }}>In stock</Button>
          </>
        )}
        pagination={{ page: Math.min(page, pages), pages, total: filtered.length, limit: PAGE }}
        onPage={p => setParams({ page: String(p) })}
        toolbar={
          <>
            <SearchBox value={q} onChange={v => setParams({ q: v })} placeholder="Search name, slug, tag or domain" delay={150} />
            <Filters label="Show" value={view} onChange={v => setParams({ view: v })} options={[
              { value: '', label: 'All', count: counts.all },
              { value: 'active', label: 'Active', count: counts.active },
              { value: 'hidden', label: 'Hidden', count: counts.hidden },
              { value: 'out_of_stock', label: 'Out of stock', count: counts.out_of_stock },
              { value: 'unpriced', label: 'No price', count: counts.unpriced },
            ]} />
            <div className={s.toolbarEnd}>
              <select className={s.select} aria-label="Category" value={category} onChange={e => setParams({ category: e.target.value })}>
                <option value="">All categories</option>
                {categories.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
              </select>
              <span className={s.viewToggle} role="group" aria-label="Layout">
                <button type="button" aria-pressed={layout === 'grid'} aria-label="Cards" onClick={() => setParams({ layout: '' })}><Icon name="grid" size={14} /></button>
                <button type="button" aria-pressed={layout === 'table'} aria-label="Table" onClick={() => setParams({ layout: 'table' })}><Icon name="menu" size={14} /></button>
              </span>
            </div>
          </>
        }
        empty={q || view || category
          ? <TableState title="No products match" action={<Button size="sm" variant="secondary" onClick={() => router.replace(pathname)}>Clear filters</Button>}>Try a different search or filter.</TableState>
          : <TableState title="No products yet" action={<Button size="sm" icon="plus" onClick={() => setEditing({ id: null, form: EMPTY_PRODUCT() })}>New product</Button>} />}
      />
      <ProductEditor
        open={!!editing}
        isNew={!editing?.id}
        form={editing?.form || {}}
        setForm={fn => setEditing(e => e ? { ...e, form: fn(e.form) } : e)}
        onSave={save}
        onClose={() => !saving && setEditing(null)}
        saving={saving}
      />
    </>
  )
}
