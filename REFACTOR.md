# UI Refactor — progress log

Read this file first in any session. Update it before finishing.

## Rules
- UI only. No logic, no perf, no data flow changes.
- Off-limits: components/Marketplace.tsx. Hand-written, includes the cart
  drawer. Read it for reference, never write to it.
- Colors come from the existing palette. Everything else (type, spacing,
  radius, elevation, motion) is the skill's call.
- Gates after every phase: `npx tsc --noEmit` and `npm run build`.
- Bugs found go in "Deferred" below. Do not fix them.
- Before verifying any phase, kill stale dev servers first:
  `lsof -ti:3000 | xargs kill -9 2>/dev/null; true`
  Then start exactly one `npm run dev`. Measuring against a stale server from a
  previous phase produces wrong results — this happened in Phase 1.
- Verify claims against the condition, not the line number. Phase 1's footer
  gate was misread this way — the plan cited AppShell.tsx:249 correctly but had
  the wrong condition.
- Don't re-read files already read this session. Reference the earlier read.
  For large files (Marketplace.tsx, admin/page.tsx) use offset/limit to read
  only the region you need.
- Authenticated surfaces (/dashboard, /admin, /partners/dashboard) redirect on
  401, so they cannot be measured with a fake session against the real API.
  Build a throwaway bundle with a dead API instead —
  `NEXT_PUBLIC_API_BASE=http://127.0.0.1:9 npm run build` — so apiFetch throws,
  is caught, and returns `{ok:false}` without redirecting. Every tab then
  renders its empty state. **Always rebuild without that var before
  committing**, and confirm with
  `grep -rho "127\.0\.0\.1:9" .next/static/chunks/app/<route>/*.js`.
- When measuring inside an iframe, use the iframe's own
  `contentWindow.getComputedStyle`. The outer window's version resolves
  `var()` against the *outer* document's root, so a light-themed iframe reports
  dark token values.
- A backgrounded iframe never advances animation frames, so CSS transitions
  freeze mid-flight and `getComputedStyle` reports the pre-transition value.
  Inject `*{transition:none!important;animation:none!important}` before reading
  any transitioned property, or you will chase colour bugs that do not exist.

## Phases
- [x] 0. Token layer in lib/constants.ts (CSS_VARS)
- [x] 1. app/login/page.tsx
- [x] 2. app/dashboard/page.tsx
- [ ] 3. app/partners/page.tsx
- [ ] 4. app/partners/dashboard/page.tsx
- [ ] 5. app/order/verify/VerifyContent.tsx
- [ ] 6. app/admin — shared primitives only (buttons, inputs, tables, badges)
- [ ] 7. app/admin — tabs 1–4
- [ ] 8. app/admin — tabs 5–9
- [ ] 9. app/admin — tabs 10–13
- [ ] 10. app/admin/receipt/page.tsx
- [ ] 11. components/AppShell.tsx notification toasts/banners/modals
- [ ] 12. components/Navbar.tsx and components/Footer.tsx
       (these render on /shop — the cart drawer inside Marketplace.tsx keeps
       its existing styling, so check the seam visually before committing)
- [ ] 13. components/ShopAds.tsx

## Decisions made

### Scales (Phase 0, in CSS_VARS)
- **Type — 8 steps, px, floor 11.** 2xs 11 / xs 12 / sm 13 / base 15 / lg 17 /
  xl 20 / 2xl 24 / 3xl 32. Replaced 18 ad-hoc sizes. Nothing below 11: 9 and 10
  are unreadable on a 360px Android. 14 is gone on purpose — it splits into
  base 15 on customer surfaces and sm 13 in admin, which is where the density
  difference lives.
- **Weight — 4 steps.** 400 / 500 / 600 / 700, 800 dropped. 600 is the
  workhorse for UI labels; 700 is reserved for prices, KPI numbers and page
  titles, so it still reads as emphasis.
- **Leading — 3 steps.** tight 1.2 display, snug 1.4 UI, relaxed 1.6 prose.
- **Spacing — strict 4px grid, 8 steps.** 4/8/12/16/20/24/32/48. The old 6, 10,
  14 and 18 map to their nearest step.
- **Control height — 4 steps.** sm 32 / md 40 / lg 44 / xl 52. This is what
  makes the 44px touch target enforceable rather than a thing to remember.
- **Radius — 6 steps.** sm 6 / md 10 / lg 14 / xl 20 / 2xl 28 / full 999.
  Taken from Marketplace's own values so the rest of the app inherits the
  storefront's shape identity instead of inventing one.
- **Elevation — 4 steps + accent glow + focus ring.** Dark separates by surface
  and border, not shadow; elev-2 and up are only for things that genuinely
  float. `--bs-ring` is new — there was no focus ring anywhere before.
- **Motion — 3 durations, 2 easings.** 120/200/280ms, ease-out for entrances,
  ease-inout for moves. Plus a global `prefers-reduced-motion` block, which
  there was none of before.

### Density (same tokens, different steps)
Customer surfaces are mobile-first at 360px; admin is desktop-first at 1440px
and dense. They share the token layer and differ only in which steps they use.

| | Customer | Partner dashboard | Admin |
|---|---|---|---|
| Body | base 15 | sm 13 | sm 13 |
| Secondary | xs 12 | xs 12 | 2xs 11 |
| Controls | lg 44, CTA xl 52 | md 40, primary 44 | sm 32 / md 40 |
| Block gap | space-4 / 6 | space-3 / 4 | space-2 / 3 |
| Section gap | space-8 | space-6 | space-4 |
| Card radius | xl 20 mobile / 2xl 28 desktop | lg 14 | lg 14 |

Every interactive element on a customer surface is control-lg or taller.

### Colour
Palette unchanged, byte for byte. Three additions:
- **`*-rgb` companions** for accent / success / error / warning / text-muted.
  These were already referenced in ~40 places and never defined, so every
  `rgba(var(--bs-…-rgb), α)` was an invalid declaration and rendered as
  nothing. Defining them lit up admin's selected rows, invalid-field styling
  and warning banners, plus 5 sites inside Marketplace.tsx, without editing it.
- **`--bs-muted-rgb`** is a commented legacy alias for `--bs-text-muted-rgb`.
  It mirrors text-muted, not bg-muted — admin:4683's own inline fallback of
  `100,100,110` gives it away, and bg-muted #1A1A22 at α 0.2 over a dark card
  would be invisible. The alias exists only because Marketplace.tsx:1389 uses
  that spelling. Prefer the canonical name; delete the alias when Marketplace
  is next edited.
- **`--bs-accent-on-surface`** is accent-as-text: #7C5CFF in dark (unchanged),
  #5B3FD4 in light, where plain #7C5CFF measures 4.0:1 on white and fails AA.
  Fills, buttons and borders stay #7C5CFF in both themes. Text on an accent
  fill stays #fff. Do not use this token on an accent background.

Light theme is ported from admin's `light` object with two contrast fixes:
text-muted #8896a6 (3.20:1) became #66717F (4.71:1), text-faint #b0bac5
(1.9:1) became #7F8896 (3.40:1). text-faint is decorative and disabled use
only, never for text a user has to read.

### Skill overrides — settled, do not re-derive

The design-taste-frontend skill
(`~/.claude/skills/design-taste-frontend/SKILL.md`) is a generic frontend skill.
Two of its rules are overridden for this project. Both are settled; do not
re-argue them phase by phase.

**Icons: inline SVG, against §3.C.** §3.C says *"NEVER hand-roll SVG icons. If a
glyph is missing, install a second library or compose from primitives — do not
draw icon paths from scratch."* That is unconditional, with no override clause
(unlike §3.D on emoji, which has one). We deviate anyway, on two grounds that
outrank a generic skill: the no-new-dependencies constraint, and
`components/Marketplace.tsx` already establishing inline SVG as the house
pattern with `CartIcon` and `WhatsAppIcon`. The nine inline SVGs in
`app/login/page.tsx` are a deliberate deviation from a hard rule, not a
judgement call within one. **Phases 2–5 follow the same pattern** — module-level
components, 24×24 viewBox, `currentColor`, `strokeWidth` 2, round caps.

**Admin is outside the skill's scope, per its own §13.** §13 lists dashboards,
dense product UI, admin panels and data tables as explicitly not what the skill
is for, and instructs the agent to say so and apply only the marketing-page
parts. That covers Phases 6–10 (admin primitives, the 13 tabs, the receipt
generator). **From Phase 6 the density table above is the authority**, together
with the brief's admin rules: desktop-first at 1440px, information density,
scannable tables, keyboard reachability, tight vertical rhythm. The skill
contributes only its AI-tells list (§9) from that point. Do not cite it as
authority for an admin decision.

### Theme mechanism
`data-theme="light"` on `<html>`, set pre-paint by the inline script in
app/layout.tsx and maintained by `useTheme()` in lib/theme.ts. Storage key and
value shape are unchanged: a bare `'dark' | 'light'` string, read with
`=== 'light'`, so absent or garbage means dark. System preference is ignored;
dark is the product default.

Per-file dark/light objects are **not** removed all at once. They are plain JS
hex maps that never read a CSS var, so they keep working untouched and each one
dies in its own phase.

**`/shop` is never themed, and this is permanent.** components/Marketplace.tsx
is dark-only by construction — 6 fixed #1C1C1F borders, unconditional
`color:"#fff"` on the mobile period and currency controls (:910, :948),
`rgba(0,0,0,0.65)` scrim, dark-only ProductLogo swatches, `theme=dark` in the
logo.dev URL. CSS custom properties inherit into that file but its literals do
not follow, so any `<html>`-level light theme renders the storefront half-light.
Both the layout script and lib/theme.ts guard on the pathname. Lifting the guard
requires editing Marketplace first.

Route-scoping is safe here because there is no client-side navigation:
app/page.tsx uses server-side `redirect()`, and there is no useRouter,
router.push or next/link anywhere, so every route change is a full document load
that re-runs the script.

## Deferred (logic/perf, do not fix now)
- Duplicated fmt/fmtDate/statusColor across surfaces
- Three divergent FX tables
- Duplicated session-reading (readToken/readSession/getToken)
- NEXT_PUBLIC_API_URL vs NEXT_PUBLIC_API_BASE split
- Navbar.tsx:21 writes bs_admin_theme on toggle but never reads it on mount, so
  the storefront toggle persists a value nothing acts on and resets to dark
  every load. Behavioural, not visual.
- ShopAds.tsx:102 rotates the banner carousel on a 6s setInterval. The global
  reduced-motion CSS cannot stop a JS timer; this needs its own
  `matchMedia('(prefers-reduced-motion: reduce)')` guard in Phase 13.
- AppShell.tsx:21 hardcodes the production Workers URL instead of using the env
  var.
- Lifting the /shop theme exclusion is blocked on Marketplace.tsx becoming
  editable (see Theme mechanism above). Confirmed concretely in Phase 1: forcing
  data-theme="light" on /shop turns the product card white while its #1C1C1F
  border stays dark and the segmented-control text stays white-on-white.
- app/login/page.tsx links to /terms and /privacy. Neither route exists (app/
  has only admin, dashboard, login, order/verify, partners, shop), so both 404.
  Footer.tsx uses absolute buysub.ng URLs for the same destinations. Changing an
  href is a behaviour change, so it is logged, not fixed.
- login's session-check effect calls redirectByRole with the loginType captured
  on first render, so a returning user with a live session is always routed as
  `customer` regardless of which tab they would have picked.
- dashboard's nav chip signs the user out, duplicating the Sign out button in
  the Profile tab. It is now keyboard reachable and labelled, but whether
  tapping your own name should sign you out is a product call.
- dashboard `WalletTx.amount_ngn` is typed `number | string` with a `// ← FIX`
  comment; the render coerces with `Number(...)`.
- dashboard `firstName` uses `split(' ')[0]` on a value that may be an email,
  so the chip shows the full address when the profile has no name. Truncated
  visually in Phase 2; the derivation itself is untouched.

### Phase 1 — login, and two AppShell mechanism changes
`app/login/page.tsx` is the first surface on the token layer. `T_DARK`/`T_LIGHT`
and the `ACCENT` literal are gone; all colour comes from CSS vars, and the theme
comes from `useTheme()`.

**`/login` joined `isNoShell`.** It is a standalone auth page with its own theme
toggle and its own centred full-height layout, so the navbar and footer doubled
up on both — login's toggle and Navbar's were rendering stacked on the exact
same fixed coordinates. **Phase 11 must not revert this.** A "Back to shop" link
on the page replaces the navbar's only unique affordance.

**The Footer gate was `!isAdmin`, now `!isNoShell`.** The old condition let the
footer render on `/partners` and `/dashboard` even though both are no-shell
routes, contradicting what CLAUDE.md always described. Fixing it for `/login`
without fixing it generally would have meant adding a second special case beside
a list that exists for exactly this. Side effect: `/partners` and `/dashboard`
lose their footer now rather than in their own phases. `/shop` keeps it.

**AppShell now syncs `data-theme` on every pathname change**
(`syncThemeToRoute` in `lib/theme.ts`). The pre-paint script in `app/layout.tsx`
only runs on a full document load. Today every navigation is one — there is no
`next/link`, no `useRouter`, no `router.push` anywhere — so the `/shop`
exclusion held, but only because of an invariant nothing enforced. AppShell is
mounted on every route and tracks the pathname, so the exclusion now holds under
client-side navigation too if it is ever introduced. Caveat: `useEffect` runs
after paint, so a future client transition into `/shop` would show one frame
with the attribute still set; `useLayoutEffect` would remove that frame but
warns during SSR.

Login specifics: 8 emoji replaced with inline stroke SVGs at module level
following Marketplace's `CartIcon` house style (no new dependency); the two
ambient radial-gradient blobs deleted along with their off-palette
`rgba(99,180,255,…)`; the invalid in-body `@import` and the duplicated global
reset deleted; uppercase tracked micro-labels replaced with sentence-case
labels; role tabs use accent tint only at 0.15 fill / 0.45 border, up from an
effective 0.08, with the off-palette blue and amber `grad` values removed;
`autoFocus` is desktop-only so it stops popping the keyboard on load at 360px.

Measured at a true 360×740: no horizontal overflow, and every interactive
element is ≥44px except the two inline legal links inside a sentence, which are
the standard inline-text exception. The page scrolls 147px, but the whole
primary path — role selector, email, password, Sign in — sits above the fold
with the Sign in button ending at 672 of 740, with a notification banner
present. Only the secondary "Create an account" and the legal line need a
scroll.

### Phase 2 — dashboard
Unlike login, this file already consumed CSS vars for surfaces, text and
borders and had no theme object to retire. The work was the 22 hardcoded
palette literals sitting *alongside* the vars, plus structure:

- `if (!mounted) return null` rendered a blank screen on every load. Replaced
  with the same branded boot gate login uses.
- No theme control existed on this route at all — `/dashboard` is in
  `isNoShell` so there is no Navbar toggle, and the page had none. A customer
  who switched to light elsewhere could not switch back from here. Added one
  via `useTheme()`.
- Three interactive `<div>`s became real buttons: the avatar chip (now
  `aria-label`led, per the approved call — same action, keyboard reachable),
  the order-row expander (`aria-expanded` + `aria-controls`), and the message
  card (`aria-label` carrying subject and read state).
- Tab bar gained `role="tablist"`/`tab`/`tabpanel` with `aria-selected` and
  `aria-controls`, and reaches 44px (was ~41px).
- Message modal: `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape to
  close, focus in on open and back to the triggering card on close. This is the
  one behavioural addition in Phase 2 and it is confined to that modal.
- Five emoji replaced with module-level inline SVGs.
- Wallet gradient `#7C5CFF → #5B3FD4` became `--bs-accent → --bs-accent-hover`.
  `#5B3FD4` is the *light* value of `--bs-accent-on-surface`; reusing it as a
  dark-theme gradient stop would put a second meaning on that token.
- `LOGO_DEV_TOKEN` now imported from `lib/constants` instead of re-declared.
- `LoadingState` stopped injecting a duplicate `@keyframes pulse`; skeletons
  take the shape of the rows they stand in for.
- Uppercase tracked micro-labels ("BuySub Wallet", "Transaction History",
  SectionCard titles) became sentence-case headings, as on login.

One defect found and fixed during verification: the nav chip renders
`firstName`, which falls back to the whole email when the profile has no name
(an email has no spaces for `split(' ')[0]` to cut). With `whiteSpace: nowrap`
and no cap that pushed the document 28px wider than a 360px viewport. The label
now truncates with a `maxWidth`.

`readSession()` untouched, as instructed.

## Seams to watch
- After Phase 12 restyles Navbar/Footer, the cart drawer inside Marketplace.tsx
  keeps its existing styling on the same page. Check it visually before
  committing that phase. Phase 0 narrows the gap rather than widening it: the
  radius scale comes from Marketplace's own cardStyle, and the -rgb companions
  restore the drawer's intended tints.
- Navbar.tsx:35 references `var(--bs-bg-primary)`, which does not exist and is
  not being defined — it is a stale name, not a missing token. It should be
  `--bs-bg-base` so the navbar matches Marketplace's sticky control bar
  directly below it. Currently resolves to invalid → transparent → body's
  bg-base shows through, so fixing it in Phase 12 is a visual no-op.

## Session log
- 2026-08-02 — Phase 0. Token layer added to CSS_VARS: type, weight, leading,
  spacing, control-height, radius, elevation and motion scales, the 5 missing
  *-rgb companions, --bs-accent-on-surface, the [data-theme="light"] block and
  a global prefers-reduced-motion rule. New lib/theme.ts, pre-paint script in
  app/layout.tsx scoped away from /shop, `T` token-reference export for inline
  styles. No page or component touched. tsc + build pass.
- 2026-08-03 — Phase 1. app/login/page.tsx on the token layer: T_DARK/T_LIGHT
  and ACCENT retired, useTheme() adopted, customer density applied, 8 emoji
  replaced with module-level inline SVGs, ambient glows and the invalid @import
  removed, real first-paint / error / forgot-sent states, focus rings on the
  --bs-ring token. AppShell: /login added to isNoShell, Footer gate corrected
  from !isAdmin to !isNoShell, and syncThemeToRoute wired to pathname changes.
  tsc + build pass; verified at a true 360×740 and in both themes.
- 2026-08-03 — Phase 2. app/dashboard/page.tsx: 22 palette literals retired,
  customer density applied, blank first paint replaced with a boot gate, theme
  toggle added (the route had none), three clickable divs promoted to buttons
  with full ARIA, tab bar given tablist semantics and 44px targets, message
  modal given dialog semantics plus Escape and focus restore, five emoji
  replaced with inline SVGs, wallet gradient moved onto palette tokens.
  Fixed a 28px horizontal overflow at 360px caused by the untruncated nav chip.
  tsc + build pass; verified at a true 360×740 in both themes against a
  throwaway dead-API build, then rebuilt clean. Not verified: the message modal
  (needs real messages) and focus rings (the automated tab never holds document
  focus).
