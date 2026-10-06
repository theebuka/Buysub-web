import { Suspense } from 'react'
import Orders from '@/components/account/Orders'

export const metadata = { title: 'Orders · BuySub' }

export default function Page() {
  return <Suspense fallback={null}><Orders /></Suspense>
}
