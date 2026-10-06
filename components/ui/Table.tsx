'use client'

// A data table that turns into a stack of cards below 768px, so customer and
// partner lists stay readable on a phone. Columns marked `hideOnCard` are left
// off the card (e.g. a row-actions column already shown as the card title).

import type { ReactNode } from 'react'
import s from './ui.module.css'
import { cx, Button } from './Button'

export type Column<R> = {
  key: string
  header: ReactNode
  cell: (row: R) => ReactNode
  align?: 'left' | 'right' | 'center'
  width?: number | string
  hideOnCard?: boolean
}

export function Table<R>({ columns, rows, rowKey, onRowClick, cardTitle, responsive = true, caption }: {
  columns: Column<R>[]
  rows: R[]
  rowKey: (r: R) => string
  onRowClick?: (r: R) => void
  /** Rendered as the first line of each mobile card. */
  cardTitle?: (r: R) => ReactNode
  responsive?: boolean
  caption?: string
}) {
  return (
    <div className={cx(responsive && s.tableResponsive)}>
      <div className={s.tableWrap}>
        <table className={s.table}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>{columns.map(c => <th key={c.key} style={{ textAlign: c.align, width: c.width }}>{c.header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={rowKey(r)} className={cx(onRowClick && s.tableRowLink)} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                {columns.map(c => <td key={c.key} style={{ textAlign: c.align }}>{c.cell(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {responsive && (
        <div className={s.cards}>
          {rows.map(r => (
            <div key={rowKey(r)} className={cx(s.rowCard, onRowClick && s.tableRowLink)} onClick={onRowClick ? () => onRowClick(r) : undefined}>
              {cardTitle && <div style={{ fontWeight: 'var(--bs-weight-semibold)' as any }}>{cardTitle(r)}</div>}
              {columns.filter(c => !c.hideOnCard).map(c => (
                <div key={c.key} className={s.rowCardLine}>
                  <span className={s.rowCardKey}>{c.header}</span>
                  <span style={{ textAlign: 'right', minWidth: 0 }}>{c.cell(r)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Pagination({ page, pages, total, onPage, size = 'lg' }: {
  page: number; pages: number; total?: number; onPage: (p: number) => void; size?: 'sm' | 'md' | 'lg'
}) {
  if (pages <= 1) return null
  return (
    <nav className={s.pager} aria-label="Pagination">
      <span>Page {page} of {pages}{total !== undefined ? ` · ${total.toLocaleString()} total` : ''}</span>
      <div className={s.pagerBtns}>
        <Button variant="secondary" size={size} icon="chevronLeft" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button variant="secondary" size={size} iconRight="chevronRight" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </nav>
  )
}
