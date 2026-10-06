import { Suspense } from 'react'
import Messages from '@/components/account/Messages'

export const metadata = { title: 'Messages · BuySub' }

export default function Page() {
  return <Suspense fallback={null}><Messages /></Suspense>
}
