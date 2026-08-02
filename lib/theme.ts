'use client'

// ============================================================
// BUYSUB — Theme controller
// ============================================================
//
// Dark is the default. Light is applied by putting data-theme="light" on
// <html>, which activates the [data-theme="light"] block in CSS_VARS.
//
// The attribute is set before first paint by the inline script in
// app/layout.tsx; this hook keeps it in sync afterwards. Both use the same
// storage key, the same value shape, and the same /shop guard.

import { useCallback, useEffect, useState } from 'react'

export type ThemeName = 'dark' | 'light'

// Written as a bare 'dark' | 'light' string, not JSON. Four surfaces already
// read this key directly with `saved === 'light'` (app/admin/page.tsx:74,
// app/partners/dashboard/page.tsx:41, app/login/page.tsx:86) and write it the
// same way. Do not change the shape while those files still exist.
export const THEME_STORAGE_KEY = 'bs_admin_theme'

// components/Marketplace.tsx is dark-only by construction: fixed #1C1C1F
// borders, unconditional color:#fff on the mobile segmented controls,
// dark-only ProductLogo swatches, theme=dark in the logo.dev URL. Theming
// /shop renders it half-light, and that file is off-limits for edits.
// Removing this guard requires editing Marketplace first. See REFACTOR.md.
export function isThemeableRoute(pathname: string): boolean {
  return pathname !== '/shop' && !pathname.startsWith('/shop/')
}

// Anything that is not exactly 'light' means dark: absent key, garbage value,
// or a throw. Matches how the four existing surfaces already read it.
function readStoredTheme(): ThemeName {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function applyTheme(theme: ThemeName) {
  try {
    const root = document.documentElement
    if (theme === 'light' && isThemeableRoute(window.location.pathname)) {
      root.setAttribute('data-theme', 'light')
    } else {
      root.removeAttribute('data-theme')
    }
  } catch {
    /* non-browser or locked-down environment */
  }
}

/**
 * Returns the current theme plus a toggle.
 *
 * `mounted` is false on the first render and true after the effect runs.
 * Render the dark fallback until it flips: localStorage must never be read
 * during render or hydration will mismatch.
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = readStoredTheme()
    setTheme(stored)
    applyTheme(stored)
    setMounted(true)
  }, [])

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next: ThemeName = prev === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        /* storage unavailable — the attribute still applies for this session */
      }
      applyTheme(next)
      return next
    })
  }, [])

  return { theme, isDark: theme === 'dark', toggle, mounted }
}
