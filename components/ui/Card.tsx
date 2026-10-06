import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import s from './ui.module.css'
import { cx } from './Button'
import { Icon, type IconName } from './Icon'

export function Card({ flush, interactive, className, style, children, ...rest }: {
  flush?: boolean; interactive?: boolean; className?: string; style?: CSSProperties; children: ReactNode
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx(s.card, flush && s.cardFlush, interactive && s.cardInteractive, className)} style={style} {...rest}>
      {children}
    </div>
  )
}

export function StatCard({ label, value, icon, delta }: {
  label: string; value: ReactNode; icon?: IconName; delta?: ReactNode
}) {
  return (
    <div className={cx(s.card, s.statCard)}>
      <span className={s.statLabel}>{icon && <Icon name={icon} size={14} />}{label}</span>
      <span className={s.statValue}>{value}</span>
      {delta && <span className={s.statDelta}>{delta}</span>}
    </div>
  )
}
