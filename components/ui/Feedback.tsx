import type { CSSProperties, ReactNode } from 'react'
import s from './ui.module.css'
import { Icon, type IconName } from './Icon'

export function Spinner({ size = 18, label }: { size?: number; label?: string }) {
  return (
    <span
      className={s.spinner}
      style={{ width: size, height: size }}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  )
}

export function Skeleton({ width = '100%', height = 16, radius, style }: {
  width?: number | string; height?: number | string; radius?: string; style?: CSSProperties
}) {
  return <span className={s.skeleton} aria-hidden="true" style={{ width, height, borderRadius: radius, ...style }} />
}

export function EmptyState({ icon = 'sparkles', title, children, action }: {
  icon?: IconName; title: string; children?: ReactNode; action?: ReactNode
}) {
  return (
    <div className={s.empty}>
      <div className={s.emptyIcon}><Icon name={icon} size={24} /></div>
      <h2 className={s.emptyTitle}>{title}</h2>
      {children && <p className={s.emptyText}>{children}</p>}
      {action && <div style={{ marginTop: 'var(--bs-space-2)' }}>{action}</div>}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={s.kbd}>{children}</kbd>
}
