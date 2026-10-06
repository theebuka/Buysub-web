import { Suspense } from 'react'
import PartnerPayouts from '@/components/partner/PartnerPayouts'

export const metadata = { title: 'Payouts · BuySub partners' }

export default function Page() {
  return <Suspense fallback={null}><PartnerPayouts /></Suspense>
}
