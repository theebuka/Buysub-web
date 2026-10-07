'use client'

import { SupportInbox } from '@/components/support/SupportInbox'
import { useApi } from '@/lib/useApi'
import { useSupportThreads } from '@/lib/support'
import { fmtDate } from '@/lib/format'
import type { MyOrder } from '@/lib/subscriptions'
import { PageHead } from './AccountShell'
import { itemsSummary } from './orderBits'

export default function Support() {
  const threads = useSupportThreads('customer')
  const orders = useApi<MyOrder[]>('/v2/me/orders?limit=20')
  const options = (orders.data || []).map(o => ({ ref: o.order_ref, label: `${o.order_ref} · ${itemsSummary(o)} · ${fmtDate(o.created_at)}` }))
  return (
    <>
      <PageHead title="Support" lede="Message the BuySub team. Replies show up here and in your notifications." />
      <SupportInbox mode="user" audience="customer" threads={threads.data} loading={threads.loading} error={threads.error} onRetry={threads.reload} orders={options} />
    </>
  )
}
