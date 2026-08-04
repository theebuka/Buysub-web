'use client'

import { usePathname } from 'next/navigation'
import { useTheme, isThemeableRoute } from '@/lib/theme'

// Inline SVG, 24x24 viewBox, currentColor, strokeWidth 2, round caps. This is
// the house pattern (Marketplace's CartIcon, Phases 1-5, and admin's own toggle
// in Phase 6), a deliberate deviation from the skill's ban on hand-rolled icons
// on the no-new-dependencies constraint. See REFACTOR.md.
function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

// Horizontal padding, the nav gap and the link padding live in the <style>
// block rather than inline, because they are the three values that have to
// shrink at 360px to keep the row on one line once the theme toggle renders.
// An inline value would need !important to be overridden by a media query.
// Everything else stays inline, matching the rest of the codebase.
const NAV_CSS = `
.bs-nav { padding: 0 var(--bs-space-6); }
.bs-nav-links { gap: var(--bs-space-4); }
.bs-nav-links a { padding: 0 var(--bs-space-2); }
@media (max-width: 480px) {
  .bs-nav { padding: 0 var(--bs-space-4); }
  .bs-nav-links { gap: var(--bs-space-2); }
  .bs-nav-links a { padding: 0 var(--bs-space-1); }
}
.bs-nav-links a:hover { color: var(--bs-text-primary); }
.bs-theme-btn:hover { border-color: var(--bs-border-strong); color: var(--bs-text-primary); }
.bs-nav a:focus-visible,
.bs-theme-btn:focus-visible { outline: none; box-shadow: var(--bs-ring); }
`

export default function Navbar() {
  const pathname = usePathname()
  const { isDark, toggle, mounted } = useTheme()

  // The toggle is hidden on routes the theme cannot reach. Today that is only
  // /shop, which is also the only route this navbar renders on, so it renders
  // nowhere — deliberately. components/Marketplace.tsx is dark-only by
  // construction and off-limits for this refactor; when it is made themeable
  // the guard in lib/theme.ts lifts and this control starts appearing with no
  // edit here.
  //
  // Gating is not just deferral. Before this, the button wrote
  // THEME_STORAGE_KEY — the preference every other surface reads — from a
  // storefront that can never show the result, and never read it back, so its
  // icon reported dark on every load regardless of the stored value and the
  // second press inverted the user's real preference.
  const showToggle = isThemeableRoute(pathname)

  return (
    <header
      className="bs-nav"
      style={{
        height: 64,
        borderBottom: "1px solid var(--bs-border-default)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        // Was var(--bs-bg-primary), a name that has never been defined
        // anywhere. It resolved to invalid, so the bar was transparent and the
        // body's bg-base showed through — which is why this reads as a no-op.
        // bg-base is also what Marketplace's own sticky control bar directly
        // below uses, so the two surfaces now match by token, not by accident.
        background: "var(--bs-bg-base)",
        color: "var(--bs-text-primary)",
        position: "sticky",
        top: 0,
        zIndex: 50
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: NAV_CSS }} />

      {/* Logo */}
      <a
        href="/shop"
        style={{
          display: "flex",
          alignItems: "center",
          height: "var(--bs-control-lg)",
          fontWeight: "var(--bs-weight-bold)",
          fontSize: "var(--bs-text-lg)",
          color: "var(--bs-text-primary)",
          borderRadius: "var(--bs-radius-md)",
        }}
      >
        BuySub
      </a>

      {/* Right side */}
      <nav
        className="bs-nav-links"
        aria-label="Main"
        style={{ display: "flex", alignItems: "center" }}
      >
        {[
          { href: "/shop", label: "Shop" },
          { href: "/partners", label: "Partners" },
          { href: "/admin", label: "Admin" },
        ].map(({ href, label }) => (
          <a
            key={href}
            href={href}
            style={{
              display: "flex",
              alignItems: "center",
              // 44px touch floor. These were bare inline anchors about 18px
              // tall on a mobile-first surface.
              height: "var(--bs-control-lg)",
              fontSize: "var(--bs-text-base)",
              // <a> inherits colour here because app/layout.tsx sets
              // `a { color: inherit }`, but the standing rule is that the four
              // non-inheriting tags carry it explicitly, and the hover state
              // needs a value to transition from.
              color: "var(--bs-text-secondary)",
              borderRadius: "var(--bs-radius-md)",
              transition: "color var(--bs-dur-1) var(--bs-ease-out)",
            }}
          >
            {label}
          </a>
        ))}

        {/* Theme toggle */}
        {showToggle && (
          <button
            className="bs-theme-btn"
            onClick={toggle}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            style={{
              // Was position: fixed, top 20, right 20 — out of this flex row
              // and pinned to the viewport, where it overlapped AppShell's
              // notification banner. It now sits where it is declared.
              width: "var(--bs-control-lg)",
              height: "var(--bs-control-lg)",
              borderRadius: "var(--bs-radius-md)",
              background: "var(--bs-bg-card)",
              border: "1px solid var(--bs-border-default)",
              color: "var(--bs-text-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "border-color var(--bs-dur-1) var(--bs-ease-out), color var(--bs-dur-1) var(--bs-ease-out)",
            }}
          >
            {/* Dark is the render-time default until the stored preference is
                read in an effect; localStorage must never be read during
                render. */}
            {mounted && !isDark ? <MoonIcon /> : <SunIcon />}
          </button>
        )}
      </nav>
    </header>
  )
}
