'use client'

// Modal and Drawer share one focus trap, lifted from AppShell's notification
// dialog: focus moves in on open, Tab cycles inside, Escape closes, and focus
// returns to whatever had it before. Body scroll is locked while open.

import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import s from './ui.module.css'
import { cx } from './Button'
import { IconButton } from './Button'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

let lockCount = 0
function lockScroll() {
  if (lockCount++ === 0) document.body.style.overflow = 'hidden'
}
function unlockScroll() {
  if (--lockCount <= 0) { lockCount = 0; document.body.style.overflow = '' }
}

export function useFocusTrap(open: boolean, ref: RefObject<HTMLElement>, onClose: () => void, initialFocus?: RefObject<HTMLElement>) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    lockScroll()
    const t = window.setTimeout(() => (initialFocus?.current ?? ref.current)?.focus(), 0)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); return }
      if (e.key !== 'Tab' || !ref.current) return
      const els = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null)
      if (!els.length) { e.preventDefault(); return }
      const first = els[0], last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      unlockScroll()
      prev?.focus?.()
    }
  }, [open, ref, initialFocus])
}

function Portal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

export function Modal({ open, onClose, title, wide, children, initialFocus, hideHeader, labelledBy }: {
  open: boolean
  onClose: () => void
  title?: string
  wide?: boolean
  children: ReactNode
  initialFocus?: RefObject<HTMLElement>
  /** For layouts that draw their own header; pass labelledBy or title for a name. */
  hideHeader?: boolean
  labelledBy?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(open, ref, onClose, initialFocus)
  if (!open) return null
  return (
    <Portal>
      <div className={s.scrim} onClick={onClose} aria-hidden="true" />
      <div className={s.modalWrap} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label={labelledBy ? undefined : title}
          aria-labelledby={labelledBy}
          tabIndex={-1}
          className={cx(s.modal, wide && s.modalWide)}
        >
          {!hideHeader && (
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>{title}</h2>
              <IconButton icon="close" label="Close" size="md" onClick={onClose} />
            </div>
          )}
          {children}
        </div>
      </div>
    </Portal>
  )
}

export function ModalBody({ children }: { children: ReactNode }) {
  return <div className={s.modalBody}>{children}</div>
}

export function Drawer({ open, onClose, side = 'left', label, children }: {
  open: boolean; onClose: () => void; side?: 'left' | 'right'; label: string; children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(open, ref, onClose)
  if (!open) return null
  return (
    <Portal>
      <div className={s.scrim} onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
        className={cx(s.drawer, side === 'left' ? s.drawerLeft : s.drawerRight)}>
        {children}
      </div>
    </Portal>
  )
}

export function DrawerBody({ children }: { children: ReactNode }) {
  return <div className={s.drawerBody}>{children}</div>
}
