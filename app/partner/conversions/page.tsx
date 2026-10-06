import { Suspense } from 'react'
import PartnerConversions from '@/components/partner/PartnerConversions'

export const metadata = { title: 'Conversions · BuySub partners' }

export default function Page() {
  return <Suspense fallback={null}><PartnerConversions /></Suspense>
}
