'use client'

import Link from 'next/link'
import { useRef, type KeyboardEvent } from 'react'
import s from './ui.module.css'

export type TabItem = { value: string; label: string; count?: number; href?: string }

/**
 * Two modes. With `href` on each item they are route tabs (links, aria-current);
 * otherwise a tablist driven by value/onChange, with arrow-key navigation.
 */
export function Tabs({ items, value, onChange, label }: {
  items: TabItem[]; value: string; onChange?: (v: string) => void; label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isRoute = items.every(i => i.href)

  if (isRoute) {
    return (
      <nav aria-label={label} className={s.tabs}>
        {items.map(i => (
          <Link key={i.value} href={i.href!} className={s.tab} aria-current={i.value === value ? 'page' : undefined}>
            {i.label}{i.count !== undefined && <span className={s.tabCount}>{i.count}</span>}
          </Link>
        ))}
      </nav>
    )
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const idx = items.findIndex(i => i.value === value)
    const next = items[(idx + (e.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length]
    onChange?.(next.value)
    requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus())
  }

  return (
    <div ref={ref} role="tablist" aria-label={label} className={s.tabs} onKeyDown={onKey}>
      {items.map(i => (
        <button key={i.value} type="button" role="tab" aria-selected={i.value === value}
          tabIndex={i.value === value ? 0 : -1} className={s.tab} onClick={() => onChange?.(i.value)}>
          {i.label}{i.count !== undefined && <span className={s.tabCount}>{i.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function SegmentedControl<V extends string>({ options, value, onChange, label }: {
  options: { value: V; label: string }[]; value: V; onChange: (v: V) => void; label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={s.seg}>
      {options.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value}
          className={s.segBtn} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
