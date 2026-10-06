import Link from 'next/link'
import { Fragment, type ReactNode } from 'react'
import s from './ui.module.css'
import { Icon } from './Icon'

export type Crumb = { label: string; href?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className={s.crumbs} style={{ listStyle: 'none' }}>
        {items.map((c, i) => {
          const last = i === items.length - 1
          return (
            <Fragment key={`${c.label}-${i}`}>
              <li>
                {c.href && !last
                  ? <Link href={c.href}>{c.label}</Link>
                  : <span aria-current={last ? 'page' : undefined}>{c.label}</span>}
              </li>
              {!last && <li aria-hidden="true"><Icon name="chevronRight" size={12} /></li>}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

export function PageHeader({ title, description, actions, crumbs }: {
  title: ReactNode; description?: ReactNode; actions?: ReactNode; crumbs?: Crumb[]
}) {
  return (
    <>
      {crumbs && <Breadcrumbs items={crumbs} />}
      <header className={s.pageHeader}>
        <div style={{ minWidth: 0 }}>
          <h1 className={s.pageTitle}>{title}</h1>
          {description && <p className={s.pageDesc}>{description}</p>}
        </div>
        {actions && <div className={s.pageActions}>{actions}</div>}
      </header>
    </>
  )
}
