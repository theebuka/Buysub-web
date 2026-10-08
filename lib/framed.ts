'use client'

// ============================================================
// BUYSUB — Running inside a frame
// ============================================================
// The home page shows the live shop inside a phone (components/home). That
// copy is the same app in an iframe, so it must not do what the page around
// it already does: poll notifications, open the chat widget, or sync the
// cart and saved list (same browser storage, same account).

import { useEffect, useState } from 'react'

export function isFramed(): boolean {
  try { return window.self !== window.top } catch { return true } // cross-origin parent
}

/** False on the server and first render, so markup matches; true after mount when framed. */
export function useFramed(): boolean {
  const [framed, setFramed] = useState(false)
  useEffect(() => { setFramed(isFramed()) }, [])
  return framed
}
