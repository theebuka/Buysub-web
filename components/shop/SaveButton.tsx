'use client'

// Save for later (lib/saved.ts: this browser, and the account when signed in). Outline heart, filled when saved.

import { toast } from 'sonner'
import { Button, IconButton } from '@/components/ui'
import { useSavedIds, toggleSaved } from '@/lib/saved'
import type { Product } from '@/lib/constants'
import s from './shop.module.css'

export function SaveButton({ product, variant = 'icon' }: { product: Product; variant?: 'icon' | 'button' }) {
  const saved = useSavedIds().includes(product.id)
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    const on = toggleSaved(product.id)
    toast.success(on ? `${product.name} saved` : 'Removed from saved')
  }
  if (variant === 'button') {
    return (
      <Button variant="ghost" size="md" icon="heart" aria-pressed={saved} onClick={onClick}
        className={saved ? s.savedOn : undefined}>
        {saved ? 'Saved' : 'Save'}
      </Button>
    )
  }
  return (
    <IconButton icon="heart" size="md" label={saved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
      aria-pressed={saved} onClick={onClick} className={`${s.saveBtn} ${saved ? s.savedOn : ''}`} />
  )
}

