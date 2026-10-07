'use client'

// The admin list table: toolbar (search, filters, actions), optional row
// selection with a bulk-action bar, loading/empty/error states drawn in the
// table's own shape, and a pager. State (q, filters, page) is the caller's,
// normally from useAdminList so it lives in the URL.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Icon, IconButton } from '@/components/ui'
import s from './admin.module.css'

export type DTColumn<R> = {
  key: string
  header: ReactNode
  cell: (row: R) => ReactNode
  align?: 'left' | 'right' | 'center'
  width?: number | string
}

export type FilterOption = { value: string; label: string; count?: number | null }

export function SearchBox({ value, onChange, placeholder = 'Search', delay = 300 }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  delay?: number
}) {
  const [v, setV] = useState(value)
  const t = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => { setV(value) }, [value])
  useEffect(() => () => clearTimeout(t.current), [])
  return (
    <label className={s.search}>
      <Icon name="search" size={14} />
      <input
        className={s.searchInput}
        type="search"
        value={v}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={e => {
          const next = e.target.value
          setV(next)
          clearTimeout(t.current)
          t.current = setTimeout(() => onChange(next.trim()), delay)
        }}
        onKeyDown={e => { if (e.key === 'Enter') { clearTimeout(t.current); onChange(v.trim()) } }}
      />
    </label>
  )
}

export function Filters({ options, value, onChange, label }: {
  options: FilterOption[]
  value: string
  onChange: (v: string) => void
  label: string
}) {
  return (
    <div className={s.filters} role="group" aria-label={label}>
      {options.map(o => (
        <button key={o.value || 'all'} type="button" className={s.filter} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count != null && <span className={s.filterCount}>{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function TableState({ title, children, action, error }: { title: string; children?: ReactNode; action?: ReactNode; error?: boolean }) {
  return (
    <div className={`${s.state} ${error ? s.stateError : ''}`} role={error ? 'alert' : undefined}>
      <p className={s.stateTitle}>{title}</p>
      {children && <p className={s.stateText}>{children}</p>}
      {action}
    </div>
  )
}

export function Pager({ page, pages, total, limit, onPage }: { page: number; pages: number; total: number; limit: number; onPage: (p: number) => void }) {
  if (!total) return null
  const from = (page - 1) * limit + 1
  const to = Math.min(total, page * limit)
  return (
    <div className={s.foot}>
      <span>{from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}</span>
      {pages > 1 && (
        <div className={s.footBtns}>
          <IconButton icon="chevronLeft" label="Previous page" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} />
          <IconButton icon="chevronRight" label="Next page" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)} />
        </div>
      )}
    </div>
  )
}

export function DataTable<R>({
  columns, rows, rowKey, loading, error, onRetry, empty, onRowClick, rowHref,
  toolbar, selectable, bulkActions, pagination, onPage, caption,
}: {
  columns: DTColumn<R>[]
  rows: R[]
  rowKey: (r: R) => string
  loading?: boolean
  error?: string
  onRetry?: () => void
  /** Shown when there are no rows and nothing is loading. */
  empty?: ReactNode
  onRowClick?: (r: R) => void
  /** Makes the whole row navigate; put a real <Link> in one cell for keyboard users. */
  rowHref?: (r: R) => string
  toolbar?: ReactNode
  selectable?: boolean
  bulkActions?: (selected: R[], clear: () => void) => ReactNode
  pagination?: { page: number; pages: number; total: number; limit: number }
  onPage?: (p: number) => void
  caption?: string
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const keys = useMemo(() => rows.map(rowKey), [rows, rowKey])
  useEffect(() => { setSelected(prev => new Set(Array.from(prev).filter(k => keys.includes(k)))) }, [keys])
  const clear = () => setSelected(new Set())
  const allOn = keys.length > 0 && keys.every(k => selected.has(k))
  const selectedRows = rows.filter(r => selected.has(rowKey(r)))
  const colSpan = columns.length + (selectable ? 1 : 0)
  const showSkeleton = loading && rows.length === 0

  const toggle = (k: string) => setSelected(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })

  return (
    <div className={s.panel}>
      {toolbar && <div className={s.toolbar}>{toolbar}</div>}
      {selectable && selectedRows.length > 0 && bulkActions && (
        <div className={s.bulk} role="region" aria-label="Bulk actions">
          <span className={s.bulkCount}>{selectedRows.length} selected</span>
          <button type="button" className={s.panelLink} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }} onClick={clear}>Clear</button>
          <div className={s.bulkActions}>{bulkActions(selectedRows, clear)}</div>
        </div>
      )}
      {error && rows.length === 0 ? (
        <TableState error title="Couldn’t load this list" action={onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>Try again</Button>}>{error}</TableState>
      ) : !loading && rows.length === 0 ? (
        empty ?? <TableState title="Nothing here yet" />
      ) : (
        <div className={s.tableWrap} aria-busy={loading || undefined}>
          <table className={s.table} style={{ opacity: loading && !showSkeleton ? 0.6 : 1, transition: 'opacity var(--bs-dur-1) var(--bs-ease-out)' }}>
            {caption && <caption className="sr-only">{caption}</caption>}
            <thead>
              <tr>
                {selectable && (
                  <th className={s.checkCell}>
                    <input type="checkbox" className={s.check} aria-label="Select all rows" checked={allOn}
                      onChange={() => setSelected(allOn ? new Set() : new Set(keys))} />
                  </th>
                )}
                {columns.map(c => <th key={c.key} style={{ textAlign: c.align, width: c.width }}>{c.header}</th>)}
              </tr>
            </thead>
            <tbody>
              {showSkeleton
                ? Array.from({ length: 6 }, (_, i) => (
                  <tr key={i} className={s.skelRow}>
                    {Array.from({ length: colSpan }, (_, j) => (
                      <td key={j}><span className={s.skel} style={{ width: j === 0 ? '70%' : `${40 + ((i + j) % 3) * 15}%`, marginLeft: columns[j - (selectable ? 1 : 0)]?.align === 'right' ? 'auto' : undefined }} /></td>
                    ))}
                  </tr>
                ))
                : rows.map(r => {
                  const k = rowKey(r)
                  const href = rowHref?.(r)
                  const click = onRowClick ? () => onRowClick(r) : href ? () => router.push(href) : undefined
                  return (
                    <tr key={k} className={`${click ? s.rowClickable : ''} ${selected.has(k) ? s.rowSelected : ''}`}
                      onClick={click ? (e) => {
                        const t = e.target as HTMLElement
                        if (t.closest('a, button, input, select, textarea, label')) return
                        click()
                      } : undefined}>
                      {selectable && (
                        <td className={s.checkCell}>
                          <input type="checkbox" className={s.check} aria-label="Select row" checked={selected.has(k)} onChange={() => toggle(k)} />
                        </td>
                      )}
                      {columns.map(c => <td key={c.key} style={{ textAlign: c.align }}>{c.cell(r)}</td>)}
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}
      {pagination && onPage && rows.length > 0 && <Pager {...pagination} onPage={onPage} />}
    </div>
  )
}
