// Renders on /shop and, via the exact-match exception in AppShell, on
// /partners. /partners is themeable, so this is the half of Phase 12 whose
// light-mode values are actually reachable today.
const FOOTER_CSS = `
.bs-footer a:hover { color: var(--bs-text-primary); }
.bs-footer a:focus-visible { outline: none; box-shadow: var(--bs-ring); }
`

export default function Footer() {
    return (
      <footer
        className="bs-footer"
        style={{
          marginTop: "var(--bs-space-8)",
          padding: "var(--bs-space-6)",
          borderTop: "1px solid var(--bs-border-default)",
          // Was 13, the admin body step, on a mobile-first customer surface.
          // The customer tier reads at base 15; secondary rank is carried by
          // colour rather than by shrinking the type.
          fontSize: "var(--bs-text-base)",
          color: "var(--bs-text-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "var(--bs-space-3)"
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: FOOTER_CSS }} />

        <div>© {new Date().getFullYear()} BuySub</div>

        <nav
          aria-label="Footer"
          style={{ display: "flex", alignItems: "center", gap: "var(--bs-space-4)" }}
        >
          {[
            { href: "https://buysub.ng", label: "Main site" },
            { href: "https://buysub.ng/privacy", label: "Privacy" },
            { href: "https://buysub.ng/faqs", label: "FAQs" },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                // 44px touch floor, as in the navbar. These were bare inline
                // anchors with no height of their own.
                height: "var(--bs-control-lg)",
                // Inherited via `a { color: inherit }` in app/layout.tsx, but
                // set explicitly per the standing rule and so the hover state
                // has a value to transition from.
                color: "var(--bs-text-secondary)",
                borderRadius: "var(--bs-radius-md)",
                transition: "color var(--bs-dur-1) var(--bs-ease-out)",
              }}
            >
              {label}
            </a>
          ))}
        </nav>
      </footer>
    )
  }
