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

// Admin is staff-facing. The widget is customer support chat, it is never
// wanted there, and it overlaps admin's own UI.
//
// This is a PRESENCE rule and only admin qualifies. The widget also overlaps
// the footer wordmark on /shop and /partners, but that is a POSITIONING defect
// and stays in Deferred: removing chat from the storefront is a revenue
// decision, not a UI fix. See REFACTOR.md.
export function isChatRoute(pathname: string): boolean {
  return !pathname.startsWith('/admin')
}

export default function TawkWidget() {
  const pathname = usePathname()
  const allowed = isChatRoute(pathname)

  useEffect(() => {
    const w = window as any

    // Every navigation in this app is a full document load — there is no
    // next/link, no useRouter and no router.push anywhere — so on /admin the
    // script below simply never runs. But resting a guard on "nobody ever adds
    // next/link" is not a guard, and lib/theme.ts already learned this: the
    // /shop exclusion was correct only by an invariant nothing enforced until
    // syncThemeToRoute was added. So handle the transition case too. Tawk has
    // no unload, hideWidget is the documented way to take it off screen.
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
