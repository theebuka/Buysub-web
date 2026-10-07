'use client'

// Admin ⌘K: jump to any section, or search orders (ref, name, email),
// customers (name, email, phone) and products (name, category) in one box.
// Results come from the same list endpoints the sections use, five each.

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Icon, Kbd, Spinner, useFocusTrap, type IconName } from '@/components/ui'
import { authFetch } from '@/lib/apiAuth'
import { fmtNGN } from '@/lib/format'
import { statusLabel } from '@/lib/status'
import s from './admin.module.css'

export type PaletteSection = { label: string; href: string; icon: IconName; group: string }

type Item = { id: string; group: string; label: string; sub?: string; icon: IconName; href: string }

export function AdminPalette({ open, onClose, sections }: { open: boolean; onClose: () => void; sections: PaletteSection[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [hits, setHits] = useState<Item[]>([])
  const [busy, setBusy] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  useFocusTrap(open, panel, onClose, input)

  useEffect(() => { if (open) { setQ(''); setHits([]); setActive(0) } }, [open])

  useEffect(() => {
    const term = q.trim()
    if (!open || term.length < 2) { setHits([]); setBusy(false); return }
    let live = true
    setBusy(true)
    const t = setTimeout(async () => {
      const enc = encodeURIComponent(term)
      const [o, c, p] = await Promise.all([
        authFetch<any[]>(`/v2/admin/orders?q=${enc}&limit=5`),
        authFetch<any[]>(`/v2/admin/customers?q=${enc}&limit=5`),
        authFetch<any[]>(`/v2/admin/products?q=${enc}&limit=5`),
      ])
      if (!live) return
      const out: Item[] = []
      ;(o.ok && Array.isArray(o.data) ? o.data : []).forEach((r: any) => out.push({
        id: `o-${r.id}`, group: 'Orders', icon: 'receipt', href: `/admin/orders/${encodeURIComponent(r.order_ref)}`,
        label: r.order_ref, sub: [r.customer_name || r.customer_email, fmtNGN(r.total_ngn), statusLabel(r.status, 'admin')].filter(Boolean).join(' · '),
      }))
      ;(c.ok && Array.isArray(c.data) ? c.data : []).forEach((r: any) => out.push({
        id: `c-${r.id}`, group: 'Customers', icon: 'user', href: `/admin/customers?q=${encodeURIComponent(r.email || r.name || '')}`,
        label: r.name || r.email, sub: r.name ? r.email : r.phone,
      }))
      ;(p.ok && Array.isArray(p.data) ? p.data : []).forEach((r: any) => out.push({
        id: `p-${r.id}`, group: 'Products', icon: 'store', href: `/admin/products?q=${encodeURIComponent(r.name)}`,
        label: r.name, sub: r.category,
      }))
      setHits(out)
      setBusy(false)
    }, 250)
    return () => { live = false; clearTimeout(t) }
  }, [q, open])

  const items: Item[] = useMemo(() => {
    const term = q.trim().toLowerCase()
    const nav = sections
      .filter(sec => !term || sec.label.toLowerCase().includes(term))
      .map(sec => ({ id: `n-${sec.href}`, group: 'Go to', label: sec.label, sub: sec.group, icon: sec.icon, href: sec.href }))
    return term.length >= 2 ? [...hits, ...nav] : nav
  }, [q, hits, sections])

  useEffect(() => { setActive(0) }, [items.length])
  useEffect(() => { list.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' }) }, [active])

  if (!open) return null
  const go = (it: Item) => { onClose(); router.push(it.href) }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(items.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)) }
    else if (e.key === 'Enter' && items[active]) { e.preventDefault(); go(items[active]) }
  }

  let last = ''
  return createPortal(
    <>
      <div className={s.palScrim} onClick={onClose} aria-hidden="true" />
      <div className={s.palWrap} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
        <div ref={panel} role="dialog" aria-modal="true" aria-label="Search admin" className={s.pal}>
          <div className={s.palInputRow}>
            <Icon name="search" size={16} />
            <input ref={input} className={s.palInput} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey}
              placeholder="Search orders, customers, products or jump to a section"
              role="combobox" aria-expanded="true" aria-controls="bs-admin-pal" aria-autocomplete="list"
              aria-activedescendant={items[active] ? `bs-apal-${active}` : undefined} />
            {busy && <Spinner size={14} />}
          </div>
          <div ref={list} id="bs-admin-pal" role="listbox" aria-label="Results" className={s.palList}>
            {items.length === 0 && <p className={s.palEmpty}>{busy ? 'Searching…' : `Nothing matches “${q.trim()}”.`}</p>}
            {items.map((it, i) => {
              const head = it.group !== last ? it.group : null
              last = it.group
              return (
                <div key={it.id}>
                  {head && <div className={s.palGroup}>{head}</div>}
                  <div id={`bs-apal-${i}`} data-idx={i} role="option" aria-selected={i === active} className={s.palItem}
                    onMouseMove={() => setActive(i)} onClick={() => go(it)}>
                    <Icon name={it.icon} size={16} />
                    <span className={s.palLabel}>{it.label}</span>
                    {it.sub && <span className={s.palSub}>{it.sub}</span>}
                  </div>
                </div>
              )
            })}
          </div>
          <div className={s.palFoot}>
            <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> move</span>
            <span><Kbd>↵</Kbd> open</span>
            <span><Kbd>Esc</Kbd> close</span>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
