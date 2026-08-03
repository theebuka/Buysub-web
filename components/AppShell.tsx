"use client"

import { useEffect, useState } from "react"
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

  return (
    <>
      {banner && !isAdmin && (
        <div
          onClick={() => {
            localStorage.setItem(`notif_${banner.id}`, "1")
            setBanner(null)
          }}
          style={{
            height: 32,
            background: "linear-gradient(90deg, #0ea5e9, #6366f1)", // brand feel
            color: "white",
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
            fontSize: 11.5,
            fontWeight: 500,
            letterSpacing: 0.2
          }}
        >
          <div style={{
            whiteSpace: "nowrap",
            textAlign: "center"
            // animation: "scroll 48s linear infinite",
            // paddingLeft: "1%"
          }}>
            {banner.message}
          </div>
        </div>
      )}
      {!isNoShell && <Navbar />}

      <div
        style={
          isNoShell
            ? {
                minHeight: 'calc(100vh - 120px)',
                background: 'var(--bs-bg-base)'
              }
            : {
                minHeight: 'calc(100vh - 120px)',
                padding: '48px 24px',
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
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}>
        <div style={{
          position: "relative",
          background: "white",
          borderRadius: 20,
          maxWidth: 640,
          width: "92%",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}>

          {/* Skip */}
          <div
            onClick={() => {
              localStorage.setItem(`notif_${modal.id}`, "1")
              setModal(null)
            }}
            style={{
              position: "absolute",
              top: 14,
              right: 18,
              fontSize: 12,
              color: "#aaa",
              cursor: "pointer",
              zIndex: 10
            }}
          >
            Skip
          </div>

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
          <div style={{ padding: 20, overflowY: "auto" }}>
            {step.title && (
              <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: "#151515" }}>
                {step.title}
              </h2>
            )}
            <p style={{ fontSize: 14, color: "#666", lineHeight: 1.5 }}>
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
                    borderRadius: "50%",
                    background: i === stepIndex ? "#000" : "#ddd"
                  }}
                />
              ))}
            </div>
          )}

          {/* FOOTER */}
          <div style={{
            padding: 16,
            borderTop: "1px solid #eee",
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
                cursor: "pointer"
              }}
            >
              Back
            </button>

            <button
              onClick={() => {
                if (!isLast) {
                  setStepIndex(i => i + 1)
                } else {
                  localStorage.setItem(`notif_${modal.id}`, "1")
                  setModal(null)
                }
              }}
              style={{
                background: "black",
                color: "white",
                border: "none",
                borderRadius: 999,
                padding: "10px 18px",
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