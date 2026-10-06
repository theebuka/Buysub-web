'use client'

// A disclosure popover anchored under its trigger. Closes on outside click,
// Escape (focus returns to the trigger) and on choosing an item. Arrow keys
// move between items. Used for the header's account, browse and help menus.

import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import s from './ui.module.css'
import { cx } from './Button'
import { Icon, type IconName } from './Icon'

export function Popover({ trigger, children, align = 'end', width, onOpenChange, panelLabel, panelClassName }: {
  trigger: (p: { open: boolean; toggle: () => void; props: Record<string, any> }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'start' | 'end'
  width?: number | string
  onOpenChange?: (open: boolean) => void
  panelLabel?: string
  /** Extra class for the panel, e.g. to position a full-width mega menu. */
  panelClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const id = useId()

  const set = useCallback((v: boolean) => { setOpen(v); onOpenChange?.(v) }, [onOpenChange])
  const close = useCallback(() => set(false), [set])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) close() }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        wrap.current?.querySelector<HTMLElement>('[aria-controls]')?.focus()
        return
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('[data-menu-item]') ?? [])
      if (!items.length) return
      e.preventDefault()
      const i = items.indexOf(document.activeElement as HTMLElement)
      const n = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length
      items[n].focus()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open, close])

  return (
    <div ref={wrap} style={{ position: 'relative' }}>
      {trigger({ open, toggle: () => set(!open), props: { 'aria-expanded': open, 'aria-controls': id, 'aria-haspopup': true } })}
      {open && (
        <div id={id} ref={panel} aria-label={panelLabel} className={cx(s.popover, align === 'end' ? s.popoverEnd : s.popoverStart, panelClassName)} style={{ width }}>
          {children(close)}
        </div>
      )}
    </div>
  )
}

export function MenuItem({ href, onClick, icon, children, danger, external, trailing }: {
  href?: string; onClick?: () => void; icon?: IconName; children: ReactNode; danger?: boolean; external?: boolean; trailing?: ReactNode
}) {
  const cls = cx(s.menuItem, danger && s.menuItemDanger)
  const body = (
    <>
      {icon && <Icon name={icon} size={16} />}
      <span style={{ flex: 1 }}>{children}</span>
      {trailing}
      {external && <Icon name="external" size={14} />}
    </>
  )
  if (href) {
    if (external || /^https?:/.test(href)) {
      return <a data-menu-item href={href} className={cls} onClick={onClick} target="_blank" rel="noopener noreferrer">{body}</a>
    }
    return <Link data-menu-item href={href} className={cls} onClick={onClick}>{body}</Link>
  }
  return <button data-menu-item type="button" className={cls} onClick={onClick}>{body}</button>
}

export function MenuSeparator() { return <div className={s.menuSep} role="separator" /> }
export function MenuLabel({ children }: { children: ReactNode }) { return <div className={s.menuLabel}>{children}</div> }
