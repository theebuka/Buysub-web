"use client"

import { Toaster } from "sonner"
import { usePathname } from "next/navigation"
import { useTheme, isThemeableRoute } from "@/lib/theme"

// sonner renders the toasts that AppShell dispatches. It was mounted directly
// in app/layout.tsx with no theme, so toasts were the one surface in the app
// that ignored data-theme. layout.tsx is the only server component, so it
// cannot read the theme itself — hence this client wrapper.
//
// TWO things this has to get right, and they are different:
//
// 1. NOT theme="system". That tracks prefers-color-scheme, which this app
//    deliberately ignores: the theme is a stored 'dark' | 'light' string
//    applied as data-theme on <html>, and system preference is not consulted
//    anywhere else. Using "system" would make toasts the only thing following
//    the OS.
//
// 2. NOT the raw value from useTheme() either. That returns the stored
//    PREFERENCE; the /shop exclusion is applied by applyTheme() when it sets
//    the attribute, not to the returned value. So a light-mode user standing on
//    /shop has theme === 'light' while the storefront is rendering dark, and
//    passing it straight through would drop a light toast onto the dark
//    storefront — the exact half-light seam the /shop guard exists to prevent.
//
// The effective theme for the current route is what sonner needs, so the route
// guard is applied here too, from the same isThemeableRoute() the script in
// app/layout.tsx and lib/theme.ts use.
export default function ThemedToaster() {
  const { theme, mounted } = useTheme()
  const pathname = usePathname()

  const effective = isThemeableRoute(pathname) ? theme : "dark"

  // Before mount, useTheme() reports its 'dark' default rather than the stored
  // value. Dark is the product default, so rendering with it is correct rather
  // than merely safe, and it keeps markup stable across hydration.
  return <Toaster richColors position="top-right" theme={mounted ? effective : "dark"} />
}
