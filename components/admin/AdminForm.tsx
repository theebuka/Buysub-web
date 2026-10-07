'use client'

// Terse form fields for admin editors (labels, hints, 32/40px controls) and
// a wide right-hand side panel for editing a record without leaving its list.

import { useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Field, IconButton, Input, Select, Switch, Textarea, useFocusTrap } from '@/components/ui'
import s from './admin.module.css'

type Common = { label: ReactNode; hint?: ReactNode; error?: ReactNode }

export function TextField({ label, hint, error, value, onChange, ...rest }: Common & {
  value: string | number | null | undefined
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  disabled?: boolean
  inputMode?: 'numeric' | 'decimal' | 'text' | 'email' | 'url' | 'tel'
  autoFocus?: boolean
  min?: number
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      {p => <Input {...p} {...rest} fieldSize="md" value={value ?? ''} onChange={e => onChange(e.target.value)} />}
    </Field>
  )
}

export function AreaField({ label, hint, error, value, onChange, rows = 3, placeholder }: Common & {
  value: string | null | undefined; onChange: (v: string) => void; rows?: number; placeholder?: string
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      {p => <Textarea {...p} rows={rows} style={{ minHeight: 0 }} placeholder={placeholder} value={value ?? ''} onChange={e => onChange(e.target.value)} />}
    </Field>
  )
}

export function SelectField({ label, hint, value, onChange, options }: Common & {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <Field label={label} hint={hint}>
      {p => (
        <Select {...p} fieldSize="md" value={value} onChange={e => onChange(e.target.value)}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      )}
    </Field>
  )
}

/** A labelled on/off row: label and hint on the left, switch on the right. */
export function SwitchRow({ label, hint, checked, onChange, disabled }: {
  label: string; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--bs-space-4)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 'var(--bs-text-sm)', fontWeight: 'var(--bs-weight-medium)' as any, color: 'var(--bs-text-primary)' }}>{label}</div>
        {hint && <div className={s.hint}>{hint}</div>}
      </div>
      <Switch label={label} checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  )
}

export function FormSection({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className={s.formSection}>
      <div className={s.formSectionHead}>
        <h3 className={s.sectionTitle} style={{ marginBottom: 0 }}>{title}</h3>
        {hint && <p className={s.hint}>{hint}</p>}
      </div>
      <div className={s.formSectionBody}>{children}</div>
    </section>
  )
}

export function SidePanel({ open, onClose, title, subtitle, footer, children, width = 640 }: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  footer?: ReactNode
  children: ReactNode
  width?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(open, ref, onClose)
  if (!open) return null
  return createPortal(
    <>
      <div className={s.palScrim} onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Editor'} tabIndex={-1}
        className={s.sheet} style={{ width: `min(${width}px, 100vw)` }}>
        <div className={s.sheetHead}>
          <div style={{ minWidth: 0 }}>
            <h2 className={s.sheetTitle}>{title}</h2>
            {subtitle && <p className={s.hint} style={{ marginTop: 2 }}>{subtitle}</p>}
          </div>
          <IconButton icon="close" label="Close" size="sm" onClick={onClose} />
        </div>
        <div className={s.sheetBody}>{children}</div>
        {footer && <div className={s.sheetFoot}>{footer}</div>}
      </div>
    </>,
    document.body,
  )
}
