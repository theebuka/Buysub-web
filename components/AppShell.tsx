"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
// SiteHeader / SiteFooter replaced Navbar / Footer in Phase 1b of the IA
// refactor. They render on exactly the routes the old pair did.
import SiteHeader from "./nav/SiteHeader"
import SiteFooter from "./nav/SiteFooter"
import MaintenanceGate from "./MaintenanceGate"
import { SavedSync } from "@/lib/saved"
import { CartSync } from "@/lib/cartSync"
import { toast } from "sonner"
import { syncThemeToRoute } from "@/lib/theme"
import { API_BASE } from "@/lib/config"
import { isFramed, useFramed } from "@/lib/framed"

// Precedence between the two env var names lives in lib/config.ts.
const API = API_BASE

export default function AppShell({ children }: { children: React.ReactNode }) {
    const [modal, setModal] = useState<any>(null)
    const [banner, setBanner] = useState<any>(null)
  const pathname = usePathname()
  const isAdmin = pathname.startsWith("/admin")
  // /login and /order/verify are standalone full-height pages that carry their
  // own navigation, so the navbar and footer would double up on both. Phase 11
  // must not remove either from this list — see REFACTOR.md.
  const isNoShell = pathname.startsWith("/admin") || pathname.startsWith("/partners") || pathname.startsWith("/dashboard") || pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/reset-password") || pathname.startsWith("/order/verify")
  // The home page runs full width; its sections set their own gutters.
  const isFullBleed = pathname === "/"
  // The live shop inside the home page's phone (lib/framed.ts).
  const framed = useFramed()
  const [stepIndex, setStepIndex] = useState(0)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Keeps data-theme correct for the current route. The pre-paint script in
  // app/layout.tsx only runs on a full document load; this covers every route
  // change, so the /shop exclusion cannot leak into the storefront even if
  // client-side navigation is introduced later. See lib/theme.ts.
  useEffect(() => { syncThemeToRoute(pathname) }, [pathname])

  useEffect(() => {
    if (isFramed()) return
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
      {banner && !isAdmin && !framed && (
        // Phase 11 made the whole bar one <button> (it had been a
        // click-to-dismiss <div> with no role and no accessible name) and moved
        // the off-palette #0ea5e9 -> #6366f1 gradient onto
        // accent-fill -> accent-hover, where white measures 4.61 and 5.44.
        // Both of those stand. What did not survive a 360px viewport was the
        // shape:
        //
        //   height: var(--bs-control-sm) + white-space: nowrap +
        //   overflow: hidden + justify-content: center
        //
        // A message longer than the bar was clipped at BOTH ends at once — the
        // start and the end were lost together, with no ellipsis and nothing to
        // indicate anything was missing. The fixture seeded a 44-character
        // message that fitted inside 360, so this never appeared in
        // verification until FIXTURE_BANNER seeded a long one.
        //
        // Wrapping is the fix, not scrolling. A marquee hands reading speed to
        // the animation instead of the reader, and WCAG 2.2.2 (Pause, Stop,
        // Hide) applies to any automatically-moving content running past five
        // seconds — so a conformant marquee has to carry a pause control, which
        // is more chrome than the bar itself. See REFACTOR.md.
        //
        // The bar is also no longer a single button. Its accessible name was
        // `Dismiss announcement: ${message}`, so the announcement existed to
        // assistive tech only as part of a dismiss label, sighted users could
        // not select or copy it, and a banner arriving from the 15s poll was
        // never announced. It is now a role="status" region with its own
        // dismiss control.
        <div
          role="status"
          aria-live="polite"
          style={{
            width: "100%",
            minHeight: "var(--bs-control-sm)",
            background: "linear-gradient(90deg, var(--bs-accent-fill), var(--bs-accent-hover))",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: "var(--bs-space-2)",
            padding: "var(--bs-space-1) var(--bs-space-2) var(--bs-space-1) var(--bs-space-4)",
            fontSize: "var(--bs-text-2xs)",
            fontWeight: 500,
            letterSpacing: "0.2px",
          }}
        >
          <span
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: "center",
              lineHeight: "var(--bs-leading-snug)",
              // Wraps, but capped: an announcement is a bar, not a panel, and
              // nothing should let an over-long message push the page content
              // off the first screen. Three lines at 11px is ~50px.
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 3,
              overflow: "hidden",
              overflowWrap: "anywhere",
            }}
          >
            {banner.message}
          </span>
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={() => {
              localStorage.setItem(`notif_${banner.id}`, "1")
              setBanner(null)
            }}
            style={{
              flexShrink: 0,
              alignSelf: "flex-start",
              width: "var(--bs-control-sm)",
              height: "var(--bs-control-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: "var(--bs-radius-md)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {!isNoShell && <SiteHeader />}

      <div
        id="main"
        style={
          isNoShell || isFullBleed
            ? {
                minHeight: 'calc(100dvh - 120px)',
                background: 'var(--bs-bg-base)'
              }
            : {
                minHeight: 'calc(100dvh - 120px)',
                maxWidth: 'var(--bs-page-max)',
                padding: 'var(--bs-space-6) var(--bs-page-gutter) var(--bs-space-12)',
                margin: '0 auto'
              }
        }
      >
        <MaintenanceGate>{children}</MaintenanceGate>
        {!framed && <SavedSync />}
        {!framed && <CartSync />}
      </div>

      {modal && !framed && (
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
      {(!isNoShell || pathname === '/partners' || pathname === '/partners/') && <SiteFooter />}
    </>
  )
}