'use client'

// /partners/dashboard was the partner dashboard. It now forwards to the
// /partner portal, keeping the query and hash (#access_token=...). Kept for
// old bookmarks. Partner verification links now go straight to /partner, which
// is on the Supabase Auth redirect allow-list; this path never was.

import { useEffect } from 'react'

export default function PartnerDashboardRedirect() {
  useEffect(() => {
    window.location.replace(`/partner${window.location.search}${window.location.hash}`)
  }, [])
  return null
}
