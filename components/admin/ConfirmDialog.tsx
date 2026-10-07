'use client'

// A small confirm step for admin actions that change money or status.
// With `reasonLabel` it also collects a reason, sent along with the action.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Field, Input, Modal, ModalBody, Textarea } from '@/components/ui'

export function ConfirmDialog({ open, title, children, confirmLabel, danger, reasonLabel, reasonRequired, reasonType = 'text', reasonDefault = '', reasonHint, onConfirm, onClose }: {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel: string
  danger?: boolean
  reasonLabel?: string
  reasonRequired?: boolean
  /** 'number' renders a one-line numeric input instead of a textarea. */
  reasonType?: 'text' | 'number'
  reasonDefault?: string
  reasonHint?: ReactNode
  onConfirm: (reason: string) => Promise<void> | void
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const num = useRef<HTMLInputElement>(null)
  useEffect(() => { if (open) { setReason(reasonDefault); setBusy(false) } }, [open, reasonDefault])
  const run = async () => {
    setBusy(true)
    try { await onConfirm(reason.trim()) } finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={title} initialFocus={reasonLabel ? (reasonType === 'number' ? num : area) : btn}>
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bs-space-4)', fontSize: 'var(--bs-text-sm)', color: 'var(--bs-text-secondary)' }}>
          {children}
          {reasonLabel && (
            <Field label={reasonLabel} hint={reasonHint}>
              {p => reasonType === 'number'
                ? <Input ref={num} {...p} fieldSize="md" type="number" inputMode="decimal" value={reason} onChange={e => setReason(e.target.value)} />
                : <Textarea ref={area} {...p} rows={3} value={reason} onChange={e => setReason(e.target.value)} />}
            </Field>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--bs-space-2)' }}>
            <Button variant="secondary" size="md" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button ref={btn} variant={danger ? 'danger' : 'primary'} size="md" loading={busy}
              disabled={reasonRequired && !reason.trim()} onClick={run}>{confirmLabel}</Button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  )
}
