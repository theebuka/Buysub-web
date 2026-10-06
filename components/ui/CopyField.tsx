'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import s from './ui.module.css'
import { IconButton } from './Button'

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}

export function CopyField({ value, label = 'Copy', display }: { value: string; label?: string; display?: string }) {
  const [done, setDone] = useState(false)
  const onCopy = async () => {
    if (await copyText(value)) {
      setDone(true)
      toast.success('Copied')
      window.setTimeout(() => setDone(false), 1500)
    } else {
      toast.error('Couldn’t copy. Select the text and copy it manually.')
    }
  }
  return (
    <div className={s.copy}>
      <span className={s.copyValue} title={value}>{display ?? value}</span>
      <IconButton icon={done ? 'check' : 'copy'} label={label} size="md" onClick={onCopy} />
    </div>
  )
}
