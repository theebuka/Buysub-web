"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import Navbar from "./Navbar"
import Footer from "./Footer"
import { toast } from "sonner"
import { syncThemeToRoute } from "@/lib/theme"

// Both names are read on purpose. The app has two env vars for the same base
// and they split by file: NEXT_PUBLIC_API_URL is used by lib/api.ts and the two
// admin surfaces, NEXT_PUBLIC_API_BASE by everything else. API_BASE comes first
// because that is what the fixture workflow sets; API_URL is the fallback
// because it is the only one declared in .env.example. The literal stays last,
// so deployed behaviour is unchanged. The split itself is still Deferred.
const API = process.env.NEXT_PUBLIC_API_BASE
  || process.env.NEXT_PUBLIC_API_URL
  || 'https://buysub-api-v2.ebuka-nwaju.workers.dev'

export default function AppShell({ children }: { children: React.ReactNode }) {
    const [modal, setModal] = useState<any>(null)
    const [banner, setBanner] = useState<any>(null)
  const pathname = usePathname()
  const isAdmin = pathname.startsWith("/admin")
  // /login and /order/verify are standalone full-height pages that carry their
  // own navigation, so the navbar and footer would double up on both. Phase 11
  // must not remove either from this list — see REFACTOR.md.
  const isNoShell = pathname.startsWith("/admin") || pathname.startsWith("/partners") || pathname.startsWith("/dashboard") || pathname.startsWith("/login") || pathname.startsWith("/order/verify")
  const [stepIndex, setStepIndex] = useState(0)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Keeps data-theme correct for the current route. The pre-paint script in
  // app/layout.tsx only runs on a full document load; this covers every route
  // change, so the /shop exclusion cannot leak into the storefront even if
  // client-side navigation is introduced later. See lib/theme.ts.
  useEffect(() => { syncThemeToRoute(pathname) }, [pathname])

  useEffect(() => {
    let seenCache = new Set<string>()
  
    const load = async () => {
      const res = await fetch(`${API}/v2/notifications`).then(r => r.json())
      if (!res.ok) return
  
      res.data.forEach((n: any) => {
        // 🚫 don't show user notifications in admin
        if (isAdmin && n.audience === 'users') return
        if (!isAdmin && n.audience === 'admins') return
  
        // 🚫 prevent duplicates (same session)
        if (seenCache.has(n.id)) return
  
        // 🚫 prevent repeats across reloads
        const seen = localStorage.getItem(`notif_${n.id}`)
        if (seen) return
  
        seenCache.add(n.id)
  
        if (n.type === "toast") {
          toast(n.message)
          localStorage.setItem(`notif_${n.id}`, "1")
        }
  
        if (n.type === "modal") setModal(n)
        if (n.type === "banner") setBanner(n)
      })
    }
  
    load()
    const i = setInterval(load, 15000)
  
    return () => clearInterval(i)
  }, [isAdmin])

  useEffect(() => {
    if (modal) setStepIndex(0)
  }, [modal])

  // Dialog semantics for the multi-step modal, following what Phase 2 did for
  // the dashboard message modal and Phase 3 for the partner terms modal. This
  // is a BEHAVIOURAL addition, not styling, and is recorded as such: Escape
  // closes, focus moves into the dialog on open and returns to whatever had it
  // before, and the notification is marked seen on either exit so Escape does
  // not resurrect it on the next poll.
  const dismissModal = useCallback(() => {
    if (!modal) return
    try { localStorage.setItem(`notif_${modal.id}`, "1") } catch {}
    setModal(null)
  }, [modal])

  useEffect(() => {
    if (!modal) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismissModal() }
    document.addEventListener("keydown", onKey)
    dialogRef.current?.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      previouslyFocused?.focus?.()
    }
  }, [modal, dismissModal])

  return (
    <>
      {banner && !isAdmin && (
        // Was a click-to-dismiss <div>: not focusable, no role, no accessible
        // name. Promoted to a button, same treatment the dashboard rows got in
        // Phase 2. The gradient was #0ea5e9 -> #6366f1, off-palette and
        // labelled "brand feel" in a comment; white measured 2.77 at the left
        // end and 4.47 at the right, so it failed across the whole span. It is
        // now accent-fill -> accent-hover (the Phase 2 wallet-gradient pattern),
        // where white measures 4.61 and 5.44.
        <button
          type="button"
          aria-label={`Dismiss announcement: ${banner.message}`}
          onClick={() => {
            localStorage.setItem(`notif_${banner.id}`, "1")
            setBanner(null)
          }}
          style={{
            width: "100%",
            height: "var(--bs-control-sm)",
            background: "linear-gradient(90deg, var(--bs-accent-fill), var(--bs-accent-hover))",
            color: "#fff",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            fontSize: "var(--bs-text-2xs)",
            fontWeight: 500,
            letterSpacing: "0.2px",
            cursor: "pointer",
          }}
        >
          <span style={{ whiteSpace: "nowrap", textAlign: "center" }}>
            {banner.message}
          </span>
        </button>
      )}
      {!isNoShell && <Navbar />}

      <div
        style={
          isNoShell
            ? {
                minHeight: 'calc(100dvh - 120px)',
                background: 'var(--bs-bg-base)'
              }
            : {
                minHeight: 'calc(100dvh - 120px)',
                padding: 'var(--bs-space-12) var(--bs-space-6)',
                margin: '0 auto'
              }
        }
      >
        {children}
      </div>

      {modal && (
  (() => {
    const steps = modal.steps && Array.isArray(modal.steps)
      ? modal.steps
      : [modal]

    const step = steps[stepIndex] || steps[0]
    const isLast = stepIndex === steps.length - 1

    return (
      <div style={{
        position: "fixed",
        inset: 0,
        // Scrim stays a black wash in both themes: it darkens whatever is
        // behind it, which is the same job either way.
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={step.title ? "bs-notif-modal-title" : undefined}
          aria-label={step.title ? undefined : "Announcement"}
          tabIndex={-1}
          style={{
            position: "relative",
            // Was hardcoded white, so the modal rendered light on a dark page
            // regardless of theme — the only surface left doing that.
            background: "var(--bs-bg-card)",
            border: "1px solid var(--bs-border-subtle)",
            borderRadius: "var(--bs-radius-xl)",
            maxWidth: 640,
            width: "92%",
            maxHeight: "90dvh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            outline: "none",
            boxShadow: "var(--bs-elev-3)",
          }}>

          {/* Skip. Was a <div onClick> printing #aaa on white at 2.32:1 —
              unreachable by keyboard and below AA. */}
          <button
            type="button"
            onClick={dismissModal}
            style={{
              position: "absolute",
              top: "var(--bs-space-3)",
              right: "var(--bs-space-4)",
              fontSize: "var(--bs-text-xs)",
              color: "var(--bs-text-secondary)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              zIndex: 10,
              padding: "var(--bs-space-1) var(--bs-space-2)",
            }}
          >
            Skip
          </button>

          {/* IMAGE */}
          {step.image_url && (
            <div style={{ width: "100%", height: 220, overflow: "hidden" }}>
              <img
                src={step.image_url}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          )}

          {/* BODY */}
          <div style={{ padding: "var(--bs-space-5)", overflowY: "auto" }}>
            {step.title && (
              <h2 id="bs-notif-modal-title" style={{
                fontSize: "var(--bs-text-2xl)", fontWeight: 600,
                marginBottom: "var(--bs-space-2)", color: "var(--bs-text-primary)",
                lineHeight: "var(--bs-leading-tight)",
              }}>
                {step.title}
              </h2>
            )}
            <p style={{
              fontSize: "var(--bs-text-base)", color: "var(--bs-text-secondary)",
              lineHeight: "var(--bs-leading-relaxed)",
            }}>
              {step.message}
            </p>
          </div>

          {/* DOTS */}
          {steps.length > 1 && (
            <div style={{
              display: "flex",
              justifyContent: "center",
              gap: 6,
              paddingBottom: 8
            }}>
              {steps.map((_: any, i: number) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "var(--bs-radius-full)",
                    background: i === stepIndex ? "var(--bs-accent)" : "var(--bs-border-strong)"
                  }}
                />
              ))}
            </div>
          )}

          {/* FOOTER */}
          <div style={{
            padding: "var(--bs-space-4)",
            borderTop: "1px solid var(--bs-border-subtle)",
            display: "flex",
            justifyContent: "space-between"
          }}>
            <button
              disabled={stepIndex === 0}
              onClick={() => setStepIndex(i => i - 1)}
              style={{
                opacity: stepIndex === 0 ? 0.3 : 1,
                background: "transparent",
                border: "none",
                // Was unset. <button> does not inherit color, so it fell
                // through to the UA `buttontext` — the same defect that put
                // black money values on the dark dashboard in Phase 2.
                color: "var(--bs-text-primary)",
                fontSize: "var(--bs-text-sm)",
                height: "var(--bs-control-lg)",
                padding: "0 var(--bs-space-4)",
                cursor: stepIndex === 0 ? "not-allowed" : "pointer"
              }}
            >
              Back
            </button>

            <button
              onClick={() => {
                if (!isLast) {
                  setStepIndex(i => i + 1)
                } else {
                  dismissModal()
                }
              }}
              style={{
                // An accent fill carrying text, so --bs-accent-fill, not
                // --bs-accent. Was hardcoded black-on-white.
                background: "var(--bs-accent-fill)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--bs-radius-full)",
                height: "var(--bs-control-lg)",
                padding: "0 var(--bs-space-5)",
                fontSize: "var(--bs-text-sm)",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>

        </div>
      </div>
    )
  })()
)}

      {/* isNoShell means no navbar. The footer is a separate decision: this was
          `!isAdmin`, which let it render on /partners and /dashboard despite
          them being no-shell routes. /partners is the one exception — a public
          application form whose only navigation IS the footer. /partners/dashboard
          is authenticated and keeps no chrome, so this cannot be a startsWith. */}
      {(!isNoShell || pathname === '/partners' || pathname === '/partners/') && <Footer />}
    </>
  )
}