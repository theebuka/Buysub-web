import type { ReactNode } from 'react'
import s from './ui.module.css'
import { commissionStatus, statusLabel, statusTone, toneColors, type Tone } from '@/lib/status'

export function Badge({ tone = 'neutral', dot, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  const c = toneColors(tone)
  return (
    <span className={s.badge} style={{ background: c.bg, color: c.fg }}>
      {dot && <span className={s.badgeDot} aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Any API status string → the right label and opaque tone. rejected_pending is a warning. */
export function StatusBadge({ status, audience = 'customer' }: { status: string | null | undefined; audience?: 'customer' | 'admin' }) {
  return <Badge tone={statusTone(status)} dot>{statusLabel(status, audience)}</Badge>
}

/** A partner commission's status (pending reads "Pending review"). */
export function CommissionBadge({ status }: { status: string | null | undefined }) {
  const c = commissionStatus(status)
  return <Badge tone={c.tone} dot>{c.label}</Badge>
}
