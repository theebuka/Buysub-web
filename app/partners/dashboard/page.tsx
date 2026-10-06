'use client'

// /partners/dashboard was the partner dashboard. It now forwards to the
// /partner portal, keeping the query and hash: partner sign-up confirmation
// emails land here with #access_token=..., and this is the address on the
// Supabase Auth redirect allow-list.

import { useEffect } from 'react'

export default function PartnerDashboardRedirect() {
  useEffect(() => {
    window.location.replace(`/partner${window.location.search}${window.location.hash}`)
  }, [])
  return null
}
