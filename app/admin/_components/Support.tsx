'use client'

// /admin/support: conversations customers and partners start from their
// account (Support). Filter by state, search by person, subject or order;
// replying notifies the user and a reply from either side reopens a
// resolved conversation.

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Input, SegmentedControl } from '@/components/ui'
import { AdminHead } from '@/components/admin/AdminUI'
import { SupportInbox } from '@/components/support/SupportInbox'
import { useApi } from '@/lib/useApi'
import type { SupportThread } from '@/lib/support'

type View = 'open' | 'closed' | 'all'

export function SupportTab() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [view, setView] = useState<View>('open')
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(t) }, [q])
  const qs = new URLSearchParams({ status: view })
  if (debounced) qs.set('q', debounced)
  const list = useApi<SupportThread[]>(`/v2/admin/support?${qs}`)
  const { reload } = list
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') reload() }, 30_000)
    return () => clearInterval(t)
  }, [reload])

  const setFilter = (v: View) => {
    setView(v)
    if (params.get('t')) router.replace(pathname, { scroll: false })
  }

  return (
    <>
      <AdminHead title="Support" lede="Conversations from customers and partners. Your replies reach them in their notifications." />
      <div style={{ display: 'flex', gap: 'var(--bs-space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
        <SegmentedControl label="Show" value={view} onChange={setFilter}
          options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Resolved' }, { value: 'all', label: 'All' }]} />
        <div style={{ width: 280, maxWidth: '100%' }}>
          <Input icon="search" fieldSize="md" placeholder="Name, email, subject or order" aria-label="Search conversations" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>
      <SupportInbox mode="admin" threads={list.data} loading={list.loading} error={list.error} onRetry={list.reload} />
    </>
  )
}
