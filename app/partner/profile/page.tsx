import { Suspense } from 'react'
import PartnerProfile from '@/components/partner/PartnerProfile'

export const metadata = { title: 'Profile · BuySub partners' }

export default function Page() {
  return <Suspense fallback={null}><PartnerProfile /></Suspense>
}
