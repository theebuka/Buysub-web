import { Suspense } from 'react'
import PartnerLinks from '@/components/partner/PartnerLinks'

export const metadata = { title: 'Referral links · BuySub partners' }

export default function Page() {
  return <Suspense fallback={null}><PartnerLinks /></Suspense>
}
