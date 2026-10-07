import { Suspense } from 'react'
import Support from '@/components/account/Support'

export const metadata = { title: 'Support · BuySub' }

export default function Page() {
  return <Suspense fallback={null}><Support /></Suspense>
}
