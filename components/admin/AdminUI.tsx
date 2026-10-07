// Admin page furniture: heading, panels, KPI strip, list rows, detail lists.
// Server-safe (no hooks); CSS in admin.module.css.

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import s from './admin.module.css'

export { s as adminStyles }

export function AdminPage({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function AdminHead({ title, lede, actions }: { title: string; lede?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={s.head}>
      <div style={{ minWidth: 0 }}>
        <h1 className={s.h1}>{title}</h1>
        {lede && <p className={s.lede}>{lede}</p>}
      </div>
      {actions && <div className={s.headActions}>{actions}</div>}
    </div>
  )
}

export function Panel({ title, action, children, pad, style, className }: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  pad?: boolean
  style?: CSSProperties
  className?: string
}) {
  return (
    <section className={`${s.panel} ${className || ''}`} style={style}>
      {(title || action) && (
        <div className={s.panelHead}>
          {title && <h2 className={s.panelTitle}>{title}</h2>}
          {action}
        </div>
      )}
      {pad ? <div className={s.panelBody}>{children}</div> : children}
    </section>
  )
}

export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className={s.panelLink}>{children}</Link>
}

export type StatItem = { label: string; value: ReactNode; sub?: ReactNode; href?: string; attention?: boolean }

export function Stats({ items }: { items: StatItem[] }) {
  return (
    <div className={s.stats}>
      {items.map(i => {
        const body = (
          <>
            <span className={s.statLabel}>{i.label}</span>
            <span className={s.statValue}>{i.value}</span>
            {i.sub && <span className={s.statSub}>{i.sub}</span>}
          </>
        )
        const cls = `${s.stat} ${i.attention ? s.statAttention : ''}`
        return i.href
          ? <Link key={i.label} href={i.href} className={cls}>{body}</Link>
          : <div key={i.label} className={cls}>{body}</div>
      })}
    </div>
  )
}

export function ListRow({ href, title, sub, end, lead }: { href?: string; title: ReactNode; sub?: ReactNode; end?: ReactNode; lead?: ReactNode }) {
  const body = (
    <>
      {lead}
      <span className={s.listMain}>
        <span className={s.listTitle}>{title}</span>
        {sub && <span className={s.listSub}>{sub}</span>}
      </span>
      {end && <span className={s.listEnd}>{end}</span>}
    </>
  )
  return <li>{href ? <Link href={href} className={s.listRow}>{body}</Link> : <div className={s.listRow}>{body}</div>}</li>
}

export function DL({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className={s.dl}>
      {rows.filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== false).map(([k, v], i) => (
        <div key={i} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v}</dd></div>
      ))}
    </dl>
  )
}

export function CellTitle({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return <div className={s.cellTitle}><span>{title}</span>{sub && <span>{sub}</span>}</div>
}
