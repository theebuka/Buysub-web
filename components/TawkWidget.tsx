'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Tawk.to live chat. Was an inline <script> in app/layout.tsx that ran
// unconditionally on every route, so the widget mounted position:fixed over the
// back office too. app/layout.tsx is the only server component and cannot read
// the route, which is the same constraint that produced
// components/ThemedToaster.tsx — so this follows that file's shape: a client
// wrapper applying a pure route predicate from a lib module.

const TAWK_SRC = 'https://embed.tawk.to/69fef29b952ab91c389cfc77/1jo5u7clb'

// The widget is for visitors: the home page, the shop, product pages, cart,
// checkout, /partners and the help pages. The signed-in areas have their own
// support chat (/account/support, /partner/support, answered from
// /admin/support), and the widget sat over their bottom tab bar and composer.
const SIGNED_IN_AREAS = ['/account', '/partner', '/admin', '/dashboard']

export function isChatRoute(pathname: string): boolean {
  // '/partner' must not catch the public '/partners' landing page.
  return !SIGNED_IN_AREAS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export default function TawkWidget() {
  const pathname = usePathname()
  const allowed = isChatRoute(pathname)

  useEffect(() => {
    const w = window as any

    // Client-side navigation moves between the two kinds of route, so hide
    // and show rather than only deciding at load. Tawk has no unload;
    // hideWidget is the documented way to take it off screen.
    if (!allowed) {
      try { w.Tawk_API?.hideWidget?.() } catch {}
      return
    }

    // Already injected by an earlier mount: show it again rather than adding a
    // second copy of the script.
    if (w.__bsTawkLoaded) {
      try { w.Tawk_API?.showWidget?.() } catch {}
      return
    }

    w.Tawk_API = w.Tawk_API || {}
    // The script can finish loading after the visitor has moved into a
    // signed-in area; check the route again when it does.
    w.Tawk_API.onLoad = () => {
      if (!isChatRoute(window.location.pathname)) { try { w.Tawk_API.hideWidget() } catch {} }
    }
    w.Tawk_LoadStart = new Date()
    w.__bsTawkLoaded = true

    const s = document.createElement('script')
    s.async = true
    s.src = TAWK_SRC
    s.charset = 'UTF-8'
    s.setAttribute('crossorigin', '*')
    document.head.appendChild(s)
  }, [allowed])

  return null
}
