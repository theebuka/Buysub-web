'use client'

import { SupportInbox } from '@/components/support/SupportInbox'
import { useSupportThreads } from '@/lib/support'
import { PageHead } from '@/components/account/AccountShell'

export default function PartnerSupport() {
  const threads = useSupportThreads('partner')
  return (
    <>
      <PageHead title="Support" lede="Questions about commissions, payouts or your links. Replies show up here and in your notifications." />
      <SupportInbox mode="user" audience="partner" threads={threads.data} loading={threads.loading} error={threads.error} onRetry={threads.reload} />
    </>
  )
}
