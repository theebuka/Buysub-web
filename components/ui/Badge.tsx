import type { ReactNode } from 'react'
import s from './ui.module.css'
import { commissionStatus, statusLabel, statusTone, toneColors, type Tone } from '@/lib/status'

/**
 * A quiet outlined tag. Status reads from the coloured dot; the label stays in
 * text colour, so a column of statuses doesn't turn into a column of coloured
 * pills.
 */
export function Badge({ tone = 'neutral', dot, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  const c = toneColors(tone)
  // Status tones always carry the dot; neutral and info tags only when asked.
  const showDot = dot ?? !(tone === 'neutral' || tone === 'info')
  return (
    <span className={s.badge}>
      {showDot && <span className={s.badgeDot} style={{ background: c.fg }} aria-hidden="true" />}
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
