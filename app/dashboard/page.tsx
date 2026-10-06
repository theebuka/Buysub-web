'use client'

// /dashboard was the customer dashboard. It now forwards to /account,
// mapping the old ?tab= to its page and keeping the hash: Supabase sign-up
// confirmation links land here with #access_token=..., and /dashboard is the
// address on the Auth redirect allow-list.

import { useEffect } from 'react'

const TAB_TO_PATH: Record<string, string> = {
  orders: '/account/orders',
  messages: '/account/messages',
  wallet: '/account/wallet',
  profile: '/account/settings',
}

export default function DashboardRedirect() {
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const path = TAB_TO_PATH[q.get('tab') || ''] || '/account'
    q.delete('tab')
    const rest = q.toString()
    window.location.replace(`${path}${rest ? `?${rest}` : ''}${window.location.hash}`)
  }, [])
  return null
}
