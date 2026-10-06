'use client'

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import s from './ui.module.css'
import { cx } from './Button'
import { Icon, type IconName } from './Icon'

type Size = 'sm' | 'md' | 'lg'

/** Label + control + hint/error. Pass a render function to get the wired id. */
export function Field({ label, hint, error, children, id: idProp }: {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  id?: string
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode
}) {
  const auto = useId()
  const id = idProp || auto
  const descId = error || hint ? `${id}-desc` : undefined
  return (
    <div className={s.field}>
      {label && <label htmlFor={id} className={s.label}>{label}</label>}
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': descId })}
      {error ? <p id={descId} className={s.errorText}>{error}</p> : hint ? <p id={descId} className={s.hint}>{hint}</p> : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { fieldSize?: Size; icon?: IconName }>(
  function Input({ fieldSize = 'lg', icon, className, ...rest }, ref) {
    const el = <input ref={ref} className={cx(s.input, fieldSize !== 'lg' && s[fieldSize], className)} {...rest} />
    if (!icon) return el
    return (
      <div className={s.inputWrap}>
        <Icon name={icon} size={16} className={s.inputIcon} />
        {el}
      </div>
    )
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cx(s.input, s.textarea, className)} {...rest} />
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { fieldSize?: Size }>(
  function Select({ fieldSize = 'lg', className, children, ...rest }, ref) {
    return <select ref={ref} className={cx(s.input, s.select, fieldSize !== 'lg' && s[fieldSize], className)} {...rest}>{children}</select>
  },
)

export function Checkbox({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={s.check}>
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  )
}

export function Switch({ checked, onChange, label, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={s.switch}
      onClick={() => onChange(!checked)}
    />
  )
}
