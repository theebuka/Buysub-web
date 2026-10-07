'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { OverviewTab } from '../_components/Overview'
import { sectionForTab } from '../_lib/sections'

// /admin?tab=orders → /admin/orders, for links from before sections had routes.
function TabRedirect() {
  const params = useSearchParams()
  const router = useRouter()
  const target = sectionForTab(params.get('tab'))
  useEffect(() => {
    if (target && target.slug !== 'overview') router.replace(target.href + window.location.hash)
  }, [target, router])
  if (target && target.slug !== 'overview') return null
  return <OverviewTab />
}

export default function Page() {
  return <Suspense fallback={null}><TabRedirect /></Suspense>
}
