import Link from 'next/link'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import s from './ui.module.css'
import { Icon, type IconName } from './Icon'
import { Spinner } from './Feedback'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger'
export type ControlSize = 'sm' | 'md' | 'lg' | 'xl'

type Common = {
  variant?: ButtonVariant
  size?: ControlSize
  full?: boolean
  icon?: IconName
  iconRight?: IconName
  loading?: boolean
  children?: ReactNode
}

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

function inner({ icon, iconRight, loading, children, size }: Common) {
  const px = size === 'sm' ? 14 : 16
  return (
    <>
      {loading ? <Spinner size={px} /> : icon && <Icon name={icon} size={px} />}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={px} />}
    </>
  )
}

export const Button = forwardRef<HTMLButtonElement, Common & ButtonHTMLAttributes<HTMLButtonElement>>(
  function Button({ variant = 'primary', size = 'lg', full, icon, iconRight, loading, className, children, disabled, type = 'button', ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cx(s.btn, s[variant], s[size], full && s.full, className)}
        {...rest}
      >
        {inner({ icon, iconRight, loading, children, size })}
      </button>
    )
  },
)

/** A link styled as a button. Internal hrefs use next/link. */
export function ButtonLink({
  href, variant = 'primary', size = 'lg', full, icon, iconRight, className, children, external, ...rest
}: Common & { href: string; className?: string; external?: boolean; onClick?: () => void; 'aria-label'?: string }) {
  const cls = cx(s.btn, s[variant], s[size], full && s.full, className)
  const body = inner({ icon, iconRight, children, size })
  if (external || /^https?:/.test(href)) {
    return <a href={href} className={cls} target="_blank" rel="noopener noreferrer" {...rest}>{body}</a>
  }
  return <Link href={href} className={cls} {...rest}>{body}</Link>
}

export const IconButton = forwardRef<HTMLButtonElement, {
  icon: IconName
  label: string
  size?: 'sm' | 'md' | 'lg'
  outline?: boolean
  count?: number
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>>(
  function IconButton({ icon, label, size = 'lg', outline, count, className, type = 'button', ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={count ? `${label} (${count})` : label}
        title={label}
        className={cx(s.iconBtn, size !== 'lg' && s[size], outline && s.iconBtnOutline, className)}
        {...rest}
      >
        <Icon name={icon} size={size === 'sm' ? 16 : 20} />
        {!!count && <span className={s.countDot} aria-hidden="true">{count > 99 ? '99+' : count}</span>}
      </button>
    )
  },
)
