import { Suspense } from 'react'
import PartnerSupport from '@/components/partner/PartnerSupport'

export const metadata = { title: 'Support · Partner portal · BuySub' }

export default function Page() {
  return <Suspense fallback={null}><PartnerSupport /></Suspense>
}
