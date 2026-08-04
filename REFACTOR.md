# UI Refactor — progress log

Read this file first in any session. Update it before finishing.

## Rules
- UI only. No logic, no perf, no data flow changes.
- Off-limits: components/Marketplace.tsx. Hand-written, includes the cart
  drawer. Read it for reference, never write to it.
- **Off-limits: the generated PDF receipt itself.** The jsPDF drawing code in
  `app/admin/receipt/page.tsx`, its 7.5pt–22pt print scale, its layout, and the
  `buildReceiptPdf` output in the API repo. Do not restyle, retokenise or
  "improve" the document design. It is a fixed artifact.

  **The boundary, so Phase 10 does not have to re-derive it: anything that
  reaches the rendered PDF is out; anything that only affects the browser page
  is in.** Phase 10 covers the web form *around* the document — the inputs,
  buttons, labels and layout an admin uses to fill it in.

  Concretely out of scope: every `doc.*` call (33 of them — `setFontSize`,
  `setFont`, `setTextColor`, `setFillColor`, `setDrawColor`, `text`, `rect`,
  `line`, `addImage`), the pt sizes, the page geometry, the colour values
  passed into the PDF, and anything they read from. A token is not an
  improvement here: `--bs-text-sm` is 13 CSS px and means nothing to a 7.5pt
  print scale, and the PDF has no theme to follow.

  Note that the receipt page holds colours serving both sides. Only the ones
  the browser paints are Phase 10's business.
- Colors come from the existing palette. Everything else (type, spacing,
  radius, elevation, motion) is the skill's call.
- Gates after every phase: `npx tsc --noEmit` and `npm run build`.
- Bugs found go in "Deferred" below. Do not fix them.
- **Committing is pre-approved; pushing never is.** `git add` and `git commit`
  are on the allow list in `../.claude/settings.local.json`, so a finished
  phase is committed without asking. One commit per phase, on `redesign/ui`,
  after both gates pass.
- **Never run `git push`.** The owner pushes manually. `Bash(git push:*)` is on
  the deny list in the same file, so it is refused rather than prompted — do
  not work around it by other means (no `gh`, no configuring a remote helper,
  no aliasing). Finish at the commit and say so.
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
  **Verify against a populated fixture API, never an empty one.** Use
  `scripts/fixture-api.js`:

  ```bash
  node scripts/fixture-api.js                                  # :8787
  NEXT_PUBLIC_API_BASE=http://127.0.0.1:8787 \
  NEXT_PUBLIC_API_URL=http://127.0.0.1:8787 npm run build
  npm run start
  ```

  **Both names are required.** The app reads `NEXT_PUBLIC_API_URL` in
  `lib/api.ts` and the two admin surfaces, `NEXT_PUBLIC_API_BASE` everywhere
  else. Setting only one leaves part of the app talking to production while you
  measure the rest — `/order/verify` goes through `lib/api.ts`, so `API_BASE`
  alone sends the real payment-verification call to the live Worker.

  Then seed any non-empty session in the browser console (the server never
  checks Authorization):

  ```js
  localStorage.setItem('sb-fixture-auth-token', JSON.stringify({
    access_token: 'fixture',
    expires_at: Math.floor(Date.now()/1000) + 86400,
    user: { id: 'fixture-user', email: 'ada.okonkwo@example.com' },
  }))
  ```

  Variants for singular endpoints that cannot show two states at once. These
  are server-side, so switching them needs no rebuild — restart the fixture
  and reload:
  `FIXTURE_PROFILE=nameless` (empty full_name, so display names fall back to
  the email address), `FIXTURE_WALLET=zero`,
  `FIXTURE_PARTNER=approved|pending|rejected|none`,
  `FIXTURE_VERIFY=verified|failed`, `PORT=9001`.

  The list endpoints carry the awkward cases inline: a 101-character product
  name, ₦9,876,543, a zero amount, an `amount_ngn` that arrives as a string,
  and one order per status including `rejected_pending`.
  A dead API (connection refused) also avoids the redirect, but every list then
  renders its *empty state* — so no rows, no amounts, no modal, and defects in
  populated markup go unseen. That is exactly how the Phase 2 money-colour bug
  shipped. Fixtures must include at least one row per list, real amounts, one
  unread and one read message, and a mix of order statuses.
  **Always rebuild without those vars before committing**, and confirm that
  `grep -rl "127\.0\.0\.1:8787" .next/static/chunks/` returns nothing.
- Text colour must be explicit on `<button>`, `<a>`, `<input>` and `<select>`:
  they do not inherit `color` (the UA sets `buttontext` / `-webkit-link`).
  Scan a finished file for style objects that set `fontSize` but no `color`,
  and for those four tags whose style omits `color`.
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
- [x] 3. app/partners/page.tsx
- [x] 4. app/partners/dashboard/page.tsx
- [x] 5. app/order/verify/VerifyContent.tsx
- [x] 6. app/admin — shared primitives only (buttons, inputs, tables, badges)
- [x] 7. app/admin — tabs 1–4 (Overview, Orders, Rejected, Products), plus the
       three panels those tabs own: ProductFormPanel, ProductSearchBox,
       NewOrderDrawer
- [x] 8. app/admin — tabs 5–9 (Customers, Partners, Wallets, Affiliates,
       Links) plus the panels they own. **Wallets was ticked without being
       edited** — see the Phase 8 note.
- [x] 9. app/admin — tabs 10–13 (Ads, Discounts, Notifications, Settings) plus
       DiscountFormPanel, held back from Phase 7. **admin is now complete.**
- [ ] 10. app/admin/receipt/page.tsx — the web form only, never the PDF
       (see the off-limits rule above: anything reaching the rendered
       document is out of scope)
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
| Controls | lg 44, CTA xl 52 | **lg 44, primary xl 52** | sm 32 / md 40 |
| Block gap | space-4 / 6 | space-3 / 4 | space-2 / 3 |
| Section gap | space-8 | space-6 | space-4 |
| Card radius | xl 20 mobile / 2xl 28 desktop | lg 14 | lg 14 |

**44px is a floor on every mobile-first surface, not a tier variable.** Controls
drop below 44 only on admin, which is desktop-first. Density on the partner
tier comes from type, gaps and radius — 13px body, 12px labels, `space-3`/`4`
gaps, `radius-lg` cards — never from shrinking tap targets.

*Amended in Phase 4.* The Controls row originally read `md 40, primary 44` for
the partner tier. That table was written in Phase 0, before a single surface had
been built, and the row did not survive contact with a phone-first one: taken
literally it put the theme toggle, the Discard button and both form inputs at
40px on a device where the brief calls for 44. Density and tap area are
independent axes and the original row conflated them.

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

- **`--bs-accent-fill` is `#7756FF`, the accent adjusted to be readable
  *under* text** — the mirror of `--bs-accent-on-surface`, which is the accent
  adjusted to be readable *as* text.

  `#fff` on plain `--bs-accent` measures **4.35:1** and fails the 4.5 body-text
  floor. The 3:1 large-text allowance rescues none of it: the largest label on
  an accent fill is 15px, where the threshold is 24px, or 18.66px at weight
  700. `--bs-accent` is `#7C5CFF` in both themes, so there was no mode where it
  passed.

  `#7756FF` is the minimum darkening that clears the floor with headroom —
  4.61:1, hue 251.8 → 251.7, saturation unchanged at 100%, purely 1.2 points of
  HSL lightness. ΔE2000 from `#7C5CFF` is **1.77**, below the ~2.3
  just-noticeable-difference threshold, so the brand colour reads as unchanged.
  `#7958FF` also passes but by 0.02, which any later surface change erases;
  `#704DFF` (5.0:1) is ΔE 4.32 and visibly a different purple.

  **Only for fills that carry text.** A fill with no text on it — a chart bar,
  a progress meter, a carousel dot, a swatch — keeps `--bs-accent`, so the
  brand colour is untouched wherever it is seen on its own. Borders, tints and
  gradient stops also keep `--bs-accent`. Same value in both themes and no
  light-mode sibling, so it is deliberately absent from the
  `[data-theme="light"]` block. `--bs-accent-hover` already measures 5.44:1 and
  needs none.

  **34 call sites across 7 files**, landed in one commit rather than per phase:
  a token that covers only some of its call sites is worse than no token. That
  means it reached `login`, `dashboard`, `partners`, `partners/dashboard` and
  `order/verify`, all shipped in Phases 1-5, plus the receipt page's web form.
  `components/Marketplace.tsx` has **zero** accent fills, so the off-limits file
  was never involved.

  *Counting them was harder than fixing them.* Successive static audits gave
  15, then 28, then 29, then 34 — the codebase is 100% inline styles and the
  fills hide behind four spellings (`T.accent`, `T.color.accent`,
  `var(--bs-accent)`, a raw hex) and ternary active-states like
  `active ? T.accent : 'transparent'`, with the text colour often a ternary
  too. **The reliable check is at runtime**: scan computed styles for a solid
  accent-family background with white text. That is what confirmed the work,
  and it is what any future audit of this kind should use.

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

### Status colour: `rejected_pending` is a warning, not an unknown

`rejected_pending` maps to `--bs-warning`. It is stage one of a two-stage
rejection: reversible via `/v2/admin/orders/:id/undo-reject` and awaiting a
confirm. That is an action-needed state, not a terminal one, and neutral grey
reads as "no status" on the status that most needs attention. Terminal
`rejected` and `cancelled` stay on `--bs-error`.

**Apply it per surface, as each copy of `statusColor` is touched in its own
phase. No cross-surface sweep.** There are two copies:

- `app/dashboard/page.tsx:37` — has no `rejected_pending` branch, so it falls
  through to the unknown/grey default. **This is the copy that diverged.**
  Add the branch when the file is next touched.
- `app/admin/page.tsx:34` — *already* returns the warning family for
  `rejected_pending` (`rgba(217,119,6,0.08)` / `#92400e`), deliberately dimmer
  than plain `pending` so the two read as distinct. Phase 7 should preserve
  that distinction while moving both onto tokens, not flatten them together.

Admin's `statusColor` is a general status painter, not order-only: it also
covers `in_stock`, `active`, `hidden`, `suspended`, `archived` and
`pending_review`, so any change there is wider than orders.

#### Measured contrast of admin's badge colours

Badge text is 11px / weight 500, so **AA needs 4.5:1**. Measured by compositing
each `rgba()` tint over the real surface on a canvas and sampling the pixel, so
these are true composites rather than estimates. Badges appear on two surfaces:
`T.card` inside `Card`, and `T.bg` in bare tables.

`statusColor` takes no theme argument, so the same values render in both
themes.

| status family | text | dark card | dark bg | light card | light bg |
|---|---|---|---|---|---|
| success — paid, approved, in_stock, active | `#16a34a` | **5.30** | **5.56** | 2.89 | 2.73 |
| warning — pending, pending_manual, pending_review | `#d97706` | **5.49** | **5.76** | 2.79 | 2.64 |
| error — cancelled, rejected, out_of_stock, hidden, suspended, archived | `#dc2626` | 3.79 | 3.95 | 4.01 | 3.79 |
| rejected_pending | `#92400e` | 2.59 | 2.71 | **6.51** | **6.17** |
| default / unknown | `#6b6b7e` | 3.46 | 3.61 | 4.46 | 4.22 |

**Four of twenty combinations pass.** Bold = passes AA.

`rejected_pending`'s `#92400e` is the tell: it is the *only* value that passes
in light and the worst in dark. It was tuned against a light background. The
rest were tuned against dark.

#### Settled in Phase 6: opaque fills, not tints

Two things recorded above were wrong, and both are corrected here.

**"A much stronger tint in light" cannot work.** The tint *is* the text colour,
so raising alpha moves the background toward the foreground and contrast falls
monotonically: success goes 3.11 at α 0.12 → 2.82 at 0.20 → 2.49 at 0.30 →
1.69 at 0.60. That option is struck. It is only viable if the tint is
decoupled from the text, at which point it is the `-on-surface` option with
extra saturation.

**The two-surface model above is incomplete, and that is the real defect.**
Badges also render inside *selected rows*, which carry
`rgba(var(--bs-accent-rgb), …)` at 0.06–0.15 (`app/admin/page.tsx:1784`,
`:3330`, `:4752`, `:4888`, `:5184`). A translucent badge tint composites with
that third layer. With the accent tint at 0.15 underneath, every light family
and half of dark fail no matter how the text is tuned — 4.03–4.43 on the best
candidate text set. This, not the mid-saturation tokens, is why light "failed
across the board".

So the badge fill is now **opaque**: the 0.12 tint pre-flattened against
`--bs-bg-card` (0.08 for `rejected_pending`), shipped as `--bs-badge-*-bg` /
`-fg` pairs. An opaque fill cannot composite with what sits beneath it, so the
badge is identical on a card, on a bare row and inside a selected row. That
collapses the matrix from 20 combinations to 10.

| family | dark bg / fg | measured | light bg / fg | measured |
|---|---|---|---|---|
| success | `#0E2118` / `#22C55E` | 7.38 | `#E1F2ED` / `#047351` | 5.07 |
| warning | `#271D0F` / `#F59E0B` | 7.71 | `#FAEFE1` / `#9A5404` | 5.08 |
| error | `#261215` / `#F04E4E` | 5.01 | `#FBE5E5` / `#BF2121` | 5.05 |
| neutral | `#17171D` / `#878796` | — | `#EDEEF0` / `#5C6672` | — |
| `rejected_pending` | `#1E170F` / `#F59E0B` | 8.25 | `#FCF4EB` / `#9E5704` | 5.05 |

Measured in-browser against the fixture, transitions frozen, both themes.
Tuned to 5.0 rather than the 4.5 floor: the minimum-passing values sat at 4.60
and any later surface change erases that headroom.

`statusColor` returns `var()` references, so it stays theme-argument-free and
all 8 `<Badge>` call sites were untouched. `rejected_pending` moved *above* the
terminal branch — the tests are exact equality so order is not load-bearing
today, but it is the status most likely to be swept into `rejected` by a later
edit.

**Proof of the selected-row case.** Painting a badge's ancestor with the
strongest tint admin uses (`rgba(var(--bs-accent-rgb), 0.15)`) leaves the badge
at `rgb(252,244,235)` / 5.05, unchanged. The same badge built the old
translucent way would have composited to `rgb(131,94,235)` — a purple field —
at **1.61:1**.

#### Superseded: Phase 7 is re-deriving these, not porting them

Swapping in the palette tokens at the same 0.12 tint fixes dark and does not
fix light:

| family | token, dark card / bg | token, light card / bg |
|---|---|---|
| success | `#22C55E` → **7.39 / 7.78** | `#059669` → 3.25 / 3.08 |
| warning | `#F59E0B` → **7.77 / 8.19** | `#D97706` → 2.79 / 2.64 |
| error | `#EF4444` → **4.76 / 4.97** | `#DC2626` → 4.01 / 3.79 |
| unknown | `#6E6E80` → 3.60 / 3.77 | `#66717F` → 4.26 / 4.03 |

Dark goes from 2/5 passing to 3/4. **Light fails across the board**, because a
12% tint barely darkens white, so mid-saturation state colours sit on an almost
white field. This is the `--bs-accent-on-surface` problem again, generalised:
the state tokens are tuned as foreground colours on the *base* surface, not as
text over a weak tint of themselves.

So Phase 7 needs one of: `--bs-success-on-surface` / `--bs-warning-on-surface` /
`--bs-error-on-surface` darker siblings for light mode, mirroring what
`--bs-accent-on-surface` already does; or solid-filled badges instead of tinted
ones; or a much stronger tint in light. Decide before touching the tabs, since
every tab renders badges.

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

## For the owner — not a code issue, not a later phase

**Existing partner terms-acceptance records are unreliable.** Until Phase 3
(commit `7f2a4b9`, 2026-08-03) the "I have read and accept the Partner Program
Terms & Conditions" link was a `<span onClick>` nested inside that checkbox's
own `<label>`. Clicking the link to *open* the terms therefore forwarded label
activation to the checkbox and toggled it.

The failure is asymmetric, and only one direction reaches the database:

- **unchecked → clicked the link → became checked.** The applicant never
  deliberately accepted, validation passes, and the application submits with
  `terms_accepted: true`. This one persists.
- **checked → clicked the link to re-read → became unchecked.** Validation then
  blocks submission with "Required" until they tick it again, so this one
  self-corrects and never reaches the database.

So every `terms_accepted` value submitted by this form before that commit can
mean either "read and deliberately accepted" or "clicked the link", and the two
are indistinguishable after the fact. The stray tick also survived reloads,
since the draft persists to `partner_signup_draft_v4`.

Scope is narrow: only `termsAccepted`. `amlAccepted`, `privacyAccepted` and
`sameAsLegal` take plain-string labels with no interactive child, so they were
never affected. The value travels as `terms_accepted` in the `POST /v2/partners`
payload; what it is stored as is the API repo's business.

Nothing to change in this repo. Flagged because it is a records question, not
an engineering one.

## Deferred (logic/perf, do not fix now)
- Duplicated fmt/fmtDate/statusColor across surfaces
- **Three divergent FX tables, and the divergence is material.**
  `app/admin/receipt/page.tsx:33` carries its own, and it does not merely spell
  the rates differently — it disagrees with `lib/constants.ts:26` by up to 23%:

  | | receipt page | lib/constants.ts | implied NGN per unit |
  |---|---|---|---|
  | USD | `0.000625` | `1 / 1300` | 1600 vs 1300 |
  | GBP | `0.0005` | `1 / 1860` | 2000 vs 1860 |
  | CAD | `0.00086` | `1 / 920` | 1163 vs 920 |

  So the same order converts to a different foreign-currency total depending on
  whether the customer reads it in the app or on the PDF receipt. The API
  receipt path is the third copy. Confirmed during Phase 6.

  **This is logic, not styling, and it is explicitly not a Phase 10 fix** —
  Phase 10 touches only the browser form, and the FX table feeds the rendered
  document. Deciding which table is authoritative is a money question for the
  owner, not a refactor decision.
- Duplicated session-reading (readToken/readSession/getToken)
- NEXT_PUBLIC_API_URL vs NEXT_PUBLIC_API_BASE split
- Navbar.tsx:21 writes bs_admin_theme on toggle but never reads it on mount, so
  the storefront toggle persists a value nothing acts on and resets to dark
  every load. Behavioural, not visual.
- ShopAds.tsx:102 rotates the banner carousel on a 6s setInterval. The global
  reduced-motion CSS cannot stop a JS timer; this needs its own
  `matchMedia('(prefers-reduced-motion: reduce)')` guard in Phase 13.
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
  visually in Phase 2; the derivation itself is untouched. Reproduce with
  `FIXTURE_PROFILE=nameless`.
- ~~White text on the accent fill fails AA.~~ **Resolved: `--bs-accent-fill`,
  landed as its own commit before Phase 8.** See "Colour" under Decisions made.
- `app/admin/page.tsx` — the page-level auth gate (the `if (!token)` branch,
  around `:1160`) still carries a `🔒` emoji and a hardcoded `#7C5CFF` Sign In
  button. It is the page shell rather than any tab, so it fell outside every
  phase boundary so far. Small, and it needs an owner.
- `NewOrderDrawer` defines a local `IS` input style that duplicates the shared
  `inputStyle()`. Both are now on the same tokens so they render identically,
  but the duplication remains. Merging is a structural change, not a visual one.
- **`WalletsTab` is a stub.** It fetches `/v2/admin/wallets?page=1&limit=20`,
  discards the response entirely, and renders an EmptyState unconditionally.
  The tab is unimplemented, not unstyled — nothing to do in Phase 8 until the
  behaviour exists. Functional, not visual.
- `colorScheme: 'dark'` is hardcoded on five date inputs
  (`app/admin/page.tsx` in the discount form, wallet top-up, links basics and
  notifications), so the native calendar picker stays dark in light mode.
  Per-tab, Phases 7-9.
- A `▾`/`▸` expander pair remains in `DiscountsTab` (~line 4661), plus whatever
  the Ads and Notifications tabs carry. Phase 9. Scan for **non-ASCII**, not an
  emoji range — the geometric-shapes block (`▾ ▸ ▦ ⌕`) sits outside it and was
  missed by the Phase 6-7 sweeps.
- 32 emoji remain in admin, mostly as button glyphs (`✅` ×12, `🔒` ×3,
  `✕` ×3, `💳` ×2, plus `🪞 🕶 🔑 📱 📨 📋 📄`). Phases 1-5 replaced these
  with inline SVGs on every customer surface. They sit in tab code, so they go
  tab by tab in Phases 7-9, following the same module-level SVG house pattern.
- `CustomersTab` is indented two spaces at module level, with a commented-out
  earlier version directly above it. It is *not* nested inside another
  function, so there is no remount bug — but the indentation hides it from any
  column-anchored search. The dead commented copy also holds the only
  `<table>` in the file; admin's live lists are all div rows, which is why
  Phase 6 created no table primitive.
- **`rejected_pending` renders grey on the dashboard.** Decided: it is a
  warning — see "Status colour" under Decisions made. Not yet applied to
  `app/dashboard/page.tsx:37`, which has no branch for it; add that branch the
  next time the file is touched. Admin already paints it warning-family.
  Surfaced by the fixture during the Phase 2 follow-up.

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

**Phase 2 follow-up — money rendered blue on mobile, UA black on desktop.**
Two causes compounding, both mine:

1. Promoting the order row from a `<div>` to a `<button>` lost the inherited
   colour. `<button>` does not inherit `color`; the UA stylesheet sets
   `color: buttontext`. The total span had no colour of its own, so it fell
   through to UA black — unreadable in dark mode.
2. With no explicit colour, mobile data detectors wrapped the digit string in
   their own `<a>`, which took the UA link colour, hence blue.

Fixed by setting `color` explicitly on the row button, the message-card button
and the nav chip button, giving every money value an explicit token colour and
a `.bs-amount` hook, adding a rule so any injected link inherits instead of
overriding, and adding `<meta name="format-detection">` in `app/layout.tsx` to
stop the detection at source. That meta is global and also covers the prices in
`Marketplace.tsx` — prevention only, it changes no styling.

Verified in both themes: every colour inside the order-row buttons resolves to
a token (`#F0F0F5`/`#1A1A2E` text-primary, plus success, warning, error and
text-muted), with zero injected links. The message modal was also verified for
the first time — `aria-modal`, `aria-labelledby` resolving to the subject,
focus into the dialog on open, Escape to close, focus returned to the
triggering card.

### Phase 3 — partner application form
Best-structured customer surface so far: module-level primitives, an `S` style
record, and a real 900px media query already existed. The work was tokens and
structure, not a rebuild.

**`/partners` gets its footer back.** It is a public application form and the
footer is its only navigation; Phase 1's `!isAdmin` → `!isNoShell` correction
removed it as a side effect. The condition is an exact match, not a
`startsWith`, because `/partners/dashboard` is authenticated and keeps no
chrome. `isNoShell` itself is unchanged, so the navbar stays hidden.

**Brand slab tokens.** The left panel is deliberately dark in both themes. It
uses `--bs-brand-slab`, `-fg`, `-fg-dim` and `-border`, defined in `:root` only
and deliberately absent from `[data-theme="light"]` — that absence is what makes
them invariant, since the light block overrides only what it names. Do not
"complete the set". The gradient ends on `#050507` as a pinned literal, not
`var(--bs-bg-base)`, which flips. Verified: the panel's background, border and
wordmark colour are byte-identical across themes while the page background and
form text do flip.

A sixth private palette is gone: every `var(--bs-x, #hex)` fallback had drifted
from the token it shadowed (`#e8e8ec` vs `#F0F0F5`, `#27272e` vs `#1E1E28`, and
so on). The vars all resolved, so the fallbacks were dead but misleading.

Also removed: the ambient accent glow with its 60px blur, matching what login
lost in Phase 1. The hexagon watermark stays — a brand-specific mark, and a
knowing exception to the skill's discouragement of decorative SVG. Dropping the
glow also removed the reason `S.page` carried `overflow: hidden`, which would
have broken the sticky brand panel once the footer made the page scroll.

Two defects found while verifying:

- The `.bs-cta` class was never applied to either CTA button, so its hover rule
  had always been dead. Now wired.
- **The Terms link was a `<span onClick>` inside the acceptance checkbox's
  `<label>`, so clicking through to read the terms also ticked "I have read and
  accept".** It was also not keyboard reachable. It is now a `<button>`, which
  is interactive content, so the label no longer forwards activation. This is a
  behaviour change with a compliance edge — flagged, not silent.

The phone input measured 42px because a fixed 44px wrapper with 1px borders left
only 42 inside; the input now sets the height itself.

### Phase 4 — partner dashboard
A theme port like login. `T_DARK`/`T_LIGHT` are gone, the local `bs_admin_theme`
read/write is replaced by `useTheme()`, and the `T` prop stops being threaded
through twelve helpers — `Center`, `Banner`, `StatCard`, `TabBtn`, `Section`,
`F`, `Inp`, `Sel`, `btnPrimary`, `btnGhost`, `iconBtn` and the page body. The
local `T` had to be deleted before the token `T` was imported, or those helper
parameters would have shadowed the import and resolved to `undefined` without
erroring.

The page is now darker, as expected: `bg` `#0a0a0c` → `#050507`, `card`
`#111114` → `#0B0B0F`, `elev` `#14141a` → `#111116`, while `text` brightens
`#e8e8ec` → `#F0F0F5`. Light mode gains most: `muted` `#6e6e78` → `#4A5568` and
`faint` `#8e8e96` → `#66717F`.

This file had **three** text tiers where the layer has four; `text`/`muted`/
`faint` map to primary/secondary/muted and `--bs-text-faint` correctly goes
unused, since it is documented as decorative/disabled only.

Copy link now reports both outcomes. Reporting only success would have left the
exact silence it was meant to fix, because `navigator.clipboard.writeText`
rejects whenever the document lacks focus or permission — so the button also has
a "Copy failed" state that reveals the URL as selectable text, both announced
via `aria-live`.

Also: labels wired to controls with `htmlFor`/`id` (17 pairs), tabs given
`role="tablist"`/`tab`/`aria-selected`, paired fields stacked under 600px, the
uppercase micro-labels on `StatCard` and `Section` dropped, and the bare
`Loading…` replaced with the branded boot gate.

### Phase 5 — payment verification landing
The smallest surface, and the one that read most like a placeholder: three 48px
emoji as its entire iconography, a fourth in the Suspense fallback, and a static
glyph for a state whose whole job is to say "wait".

**The unclosed paren is fixed and the fix is proven.** `:41` read
`color: 'var(--bs-text-primary'`, so the declaration was invalid and dropped and
the container inherited from `body` — which happened to be the same value, so it
looked correct. Verified by forcing `body { color: red }` and confirming the
container held `rgb(240,240,245)`; before the fix it would have turned red. It
also still flips with the theme, `#F0F0F5` → `#1A1A2E`.

`/order/verify` joined `isNoShell`. It is a standalone confirmation page that
already carries its own CTAs, so the navbar's links were redundant, and it sheds
Navbar's dead theme toggle. No theme control added — this is a page a user lands
on once from Paystack and leaves.

Also: the status container gets `role="status"`/`aria-live="polite"`, so the
transition from checking to confirmed reaches assistive tech on a page that
exists only to announce an outcome. The order reference gets `ui-monospace` and
`user-select: all`, since it is the one string a customer may need to quote to
support. `WHATSAPP_NUMBER` is imported rather than inlined. `#25D366` and its
`#1EBF5A` hover stay literal — the brief pins the first and the second matches
Marketplace's `.wa-btn:hover`.

The Suspense fallback in `page.tsx` now reuses the same card, spinner and copy
as the real loading state, so the two are not visibly different components.

### Phase 6 — admin shared primitives

**The theme port is the load-bearing move, and it did not touch a tab.** The
local `dark`/`light` hex maps are replaced by one `TOKENS` object of `var()`
references. `type Theme = typeof TOKENS` still resolves to
`Record<string, string>`, so all ~40 signatures typecheck unchanged and 500+
`T.*` dereferences across 13 tabs moved onto the token layer with no call site
edited. The local `useTheme` (which read `bs_admin_theme` directly) now wraps
`lib/theme.ts`; `isDark` survives only to pick the toggle icon.

The `T` prop threading is now pure ceremony — the object is a module constant.
It dies in Phase 9, once the tabs are done. Removing it now would mean editing
every tab.

Nine sites concatenated a hex alpha onto a theme value (`${T.error}30`,
`T.accent + '20'`, `${color}10`) and would have emitted `var(--bs-error)30`,
which is invalid and silently dropped. Four of them are in tab code; they were
fixed anyway, because the repoint breaks them. They now use
`rgba(var(--bs-*-rgb), α)` or `color-mix`.

**Which tabs the repoint does *not* fully reach.** Audited statically rather
than by sampling one element per tab, so it is exhaustive:

- **Fully on the theme object** (zero colour literals): Overview, Rejected,
  Partners, Affiliates, Settings, Wallets.
- **Still holding literals**: Products (`#7C5CFF`, `#6B4EE6`, `#1C1C1F`),
  Links (`#7C5CFF`, `#6B4EE6`, `#000000`), Notifications (`#7C5CFF`), Orders,
  Customers, Ads, Discounts (`#fff`). Plus `WalletDebitPanel` (`#dc2626`,
  `#991b1b`) and `LinkRowCard` (`#1C1C1F`).

Not all are defects: `#fff` on an accent fill is correct per the colour
decision, and the QR components' `#000000`/`#ffffff` are QR module colours,
not theme colours. The real ones are the hardcoded accents (should be
`--bs-accent` / `--bs-accent-hover` / `--bs-accent-on-surface`) and the
`#1C1C1F` Marketplace leak. Fix each as its tab is taken.

**Two primitive generations, made identical but not merged.** Admin has an
older set (`Badge` 8 uses, `SmallBtn` 24, `KpiCard` 8, `FieldLabel` 60,
`pageBtnStyle` 1) and a newer "refined" set in the newer tabs (`PillBadge` 4,
`actionBtnStyle` 5, `GhostBtn` 3, `IconBtn` 2, `StatChip` 3, `Label` 16,
`refinedPageBtnStyle` 3). Phase 6 put both on the same tokens and density
*without changing any call signature*. Merging them means editing call sites
inside the tabs, which is Phases 7-9 — and because they now render
identically, that dedupe is a mechanical no-op with no visual delta, safe one
tab at a time.

**A contrast bug found in the buttons, not the badges.** `SmallBtn` and
`PillBadge` fill with 12% of their own colour and then printed the label in
that same colour. Measured as shipped, five of six colours failed AA in light
and two of six in dark — accent 3.74:1 light, text-muted 3.58:1 dark. This is
the `--bs-accent-on-surface` problem again, generalised to the controls. Fixed
with `--bs-on-tint-mix`, a single property holding both the mix target and the
percentage (`#FFFFFF 16%` dark, `#000000 28%` light) so it is theme-switchable
from one place with no call-site change. Percentages are the worst case across
the six colours those components are actually called with. Verified in-browser:
accent went 3.74 → 6.22 in light and 4.09 → 5.28 in dark.

`color-mix` is the first modern CSS function in this codebase. It is used
because it preserves the `color` prop shape, which is what kept all 24
`SmallBtn` call sites out of a primitives-only phase. Confirmed supported at
runtime.

**Focus rings exist for the first time.** Five style objects set
`outline: 'none'` with no replacement, so keyboard focus was invisible across
the whole back office. `--bs-ring` was added in Phase 0 and had no consumer
until now. The rule lives in `Shell` under a `.bs-admin` scope and uses
`!important`, which is load-bearing rather than lazy: the file is 100% inline
styles and an inline `outline: none` outbeats any stylesheet rule on
specificity. Drawn with `box-shadow` so it follows border-radius.
**Not verified** — the automated tab never holds document focus, same
limitation as Phase 2.

Also: the `☀️`/`🌙` toggle emoji became inline SVGs with an `aria-label`
(there was none); `Card`/`KpiCard`/`DetailSection` labels moved off `fontSize:
10` to the 2xs 11 floor; `minHeight: 100vh` → `100dvh`; `StatChip` lost its
decorative dot (it sat before a plain count); `PillBadge` kept its dot (real
status) and lost a dead border ternary whose branches were identical, plus a
`rgba(255,255,255,0.04)` fill that was invisible on a white card.

**Uppercase tracked micro-labels stay in admin.** Phases 1-5 replaced them
with sentence case on the customer surfaces. Admin is desktop-first and dense,
where small-caps labels earn their space. The split is deliberate; it is not
an inconsistency for a later phase to "fix".

**`scripts/fixture-api.js` had no admin routes.** Every `/v2/admin/*` list fell
through a catch-all returning `[]`, so admin rendered its empty state and no
badge, amount or row markup was measurable — the same failure the dead-API note
above warns about, which is how the Phase 2 money-colour bug shipped. Added
`/v2/admin/orders` (all 7 statuses incl. `rejected_pending`, with the
`customer_name`/`customer_email` columns admin renders and the customer
endpoint lacks), `/v2/admin/customers` and `/v2/admin/products`. **The
remaining admin lists are still stubs** — Affiliates, Links, Ads, Discounts,
Notifications, Partners and Wallets render empty, so nothing in them has been
measured. Fill each in as its tab is taken.

### Phase 7 — admin tabs 1-4

Scope was the four tab bodies **plus the three panels they own**:
`ProductFormPanel` (Products), `ProductSearchBox` and `NewOrderDrawer` (Orders).
Each panel has exactly one call site, verified before starting; they are
module-level only because of the focus-loss rule in CLAUDE.md, not because they
are shared. Restyling a tab without its drawer would have left a seam the
moment an admin opened it.

**Nothing shared was touched.** Nine components used in these ranges are also
rendered by tabs 5-13 — `Badge`, `Card`, `DRow`, `DetailSection`, `EmptyState`,
`FieldLabel`, `Loading`, `PaginationBar`, `SmallBtn`. Editing any of them would
have moved a later tab's appearance ahead of its phase. Where an icon needed
flex alignment inside `SmallBtn`, the alignment went into a new `BtnLabel`
wrapper at the call site rather than into `SmallBtn`, which has 25 call sites
across later phases.

`DiscountFormPanel` sits immediately after `ProductFormPanel` with a
near-identical signature and belongs to Phase 9. It was left alone; anyone
editing this neighbourhood by line range should know it is there.

**Literals cleared.** The `#1C1C1F` Marketplace leak on the product card
(`isHidden ? T.border : '#1C1C1F'`) sat close to `--bs-border-default` in dark,
so it looked correct there and drew a near-black border on a white card in
light. Both branches are now tokens and the hidden-vs-normal distinction is
preserved rather than "corrected". The two logo-tile borders were
`rgba(255,255,255,0.06)`, invisible on a white card — the same class as the
`PillBadge` bug from Phase 6. Two hardcoded accent glows
(`rgba(124,92,255,0.25)`) and three hardcoded accents inside the Products
`<style>` block are on tokens; the one that is accent-as-*text* takes
`--bs-accent-on-surface`, not `--bs-accent`.

Surviving `#fff` in these ranges is text on an accent **fill**, which is
correct per the colour decision, and one `rgba(0,0,0,0.65)` modal scrim, which
is deliberately theme-independent.

**A third instance of the on-tint bug.** The Products "Featured" ribbon was
9px — below the 11 floor — and painted its label in plain `T.accent` on a 12%
tint of that same accent. That is exactly what Phase 6 measured at 3.74:1 in
`SmallBtn`. It now reuses `--bs-on-tint-mix` and measures 5.28 dark / 6.22
light, the same numbers as the Phase 6 fix.

**Density.** 37 sizing values mapped onto the Phase 0 scales by one rule:
nearest step, ties resolved downward, since this is a density phase and jumping
a size changes layout. `height: 48 / 72 / 140` were deliberately left alone —
those are logo tiles, a textarea and the revenue chart, i.e. layout dimensions,
not controls. Three `Inter,sans-serif` literals removed (the layout supplies
it) and five `monospace` declarations normalised to `ui-monospace` per the
Phase 5 order-reference precedent.

A commented-out duplicate of the entire Orders filter bar was deleted. It had
already drifted from the live copy below it and contained one of the literals
the Phase 6 audit flagged.

**Fixture: two more wrong-screen bugs.** The routes ignored query strings, so
`RejectedTab` — which asks for `?status=rejected_pending` and hardcodes
`<Badge status="rejected_pending">` — was handed all seven orders and would
have painted paid and cancelled rows as rejected. `/v2/admin/orders` now honors
`status` and `q`, and `/v2/admin/orders/:id` looks up by `order_ref` instead of
always returning the first order, which had made every expanded row show the
same items.

Separately, `ADMIN_PRODUCTS` had the wrong shape: `status` and `stock_status`
are separate fields (`isHidden = p.status !== 'active'`,
`isOOS = p.stock_status !== 'in_stock'`) and the fixture had put stock values
in `status`. Every card took the `isHidden` branch, so the normal-product
styling was never rendered, and no row was `featured`, so the ribbon never
mounted. Both fixed, with one row per combination. **This is the third time a
fixture shape error has hidden a screen** (Phase 4 `/v2/partners/me`, Phase 6
missing admin routes, this one). Check the field a component actually reads,
not the field name that sounds right.

### Phase 8 — admin tabs 5-9

26 declarations, ~1970 lines, ownership resolved from the AST by transitive
render-closure. Two subsystems dominate: Links is ~1280 lines across 20
declarations, Customers ~570 across 4. Eight shared primitives (`Badge`,
`SmallBtn`, `Loading`, `EmptyState`, `PaginationBar`, `DetailSection`, `DRow`,
`FieldLabel`) were reachable but untouched — each is also rendered by tabs 1-4
or 10-13.

**`WalletsTab` was ticked without being edited, and that is the finding.** Six
lines, zero literals, zero glyphs; its entire visual output is `Loading` and
`EmptyState`, both tokenised in Phase 6. So it was already finished. No fixture
route was added for `/v2/admin/wallets` either: the tab drops the response
(`.finally()` with no `.then()`) and renders an EmptyState unconditionally, so
no fixture could make anything appear. It is an unimplemented tab, not an
unstyled one, and building the screen would be a feature, not a refactor.

**The second Marketplace leak is gone.** `LinkRowCard`'s
`link.active && !isExpired && !limitReached ? '#1C1C1F' : T.border` was the twin
of the product card in Phase 7 — near `--bs-border-default` in dark so the
healthy state looked right, a near-black border on a white card in light. The
healthy-vs-degraded distinction is preserved.

**Two gradients moved off stale literals.** `WalletTopupPanel` ran
`#7C5CFF → #5B3FD4`, and `#5B3FD4` is the *light* value of
`--bs-accent-on-surface` — the exact reuse Phase 2 ruled against on the
dashboard wallet gradient. It is now `--bs-accent → --bs-accent-hover`, matching
Phase 2. `WalletDebitPanel` ran `#dc2626 → #991b1b`, pre-token error colours
with no token for the second stop; it now derives the darker stop from
`--bs-error` via `color-mix`.

**Fifth instance of the on-tint bug**, in `LinkRowCard`'s feature pills:
`color: T.accent` on a 10% tint of that same accent, at 10px. Now on
`--bs-on-tint-mix` and the 11px floor — measured 6.39:1, up from ~3.7.

**Glyphs: the emoji sweep was under-scoped in Phases 6-7.** The regex used then
covered U+1F300-1FAFF and U+2600-27BF, which misses the geometric-shapes block
where several UI glyphs live. Replaced here: `▾`/`▸` expanders, `⌕` search,
`▦` QR, `×` close (4 sites). A `▾`/`▸` pair in `OrdersTab` that Phase 7 should
have caught was fixed as a correction; the pair in `DiscountsTab` is Phase 9's.
The `×` at `OrdersTab` line ~1438 is a multiplication sign in "product × qty"
and stays. Future sweeps should scan for non-ASCII generally, not an emoji
range.

**Fixture: five routes added**, all previously falling through to `page([])`
so every one of these tabs rendered its empty state. `/v2/admin/partners`
(one row per status), `/v2/admin/affiliates`, `/v2/admin/links` (one row per
feature badge and one per degraded state, or `LinkRowCard`'s border and badge
branches never render), `/v2/admin/links/:id/rules`, and the two customer
sub-resources. Ads, Discounts and Notifications remain stubs for Phase 9.

### Phase 9 — admin tabs 10-13, and admin is done

Five declarations, ~1206 lines. `NotificationsTab` is 904 of them and owns no
sub-components: one inline component holding the list, the create form, a
multi-step builder and a live preview. `DiscountFormPanel` is here because
Phase 7 deliberately stopped at its neighbour's boundary.

**Sixth instance of the on-tint bug, and the only one with white text.**
`.bs-notif-add-step:hover` set `color: #fff` on
`background: rgba(var(--bs-accent-rgb), 0.08)` — white on near-white in light,
about 1.05:1, so the label vanished on hover. Now on `--bs-on-tint-mix`. Worth
noting `--bs-accent-fill` would have been the *wrong* fix: the background stays
a translucent tint, and the fill token is only for solid fills.

Two hand-rolled shadows moved to `--bs-elev-2` / `--bs-elev-3`, and two
hardcoded `#7C5CFF` border-colours in the `<style>` block to `--bs-accent` —
the third such block after Products (Phase 7) and Links (Phase 8).

**The non-ASCII scan found what an emoji range would have missed.** Scanning
`[^\x00-\x7F]` across all five declarations returned exactly one pair, the
`▾`/`▸` in `DiscountsTab` logged at the end of Phase 8. The Phase 6-7 emoji
regex would have reported "none" for that tab and been wrong. All five ranges
are now glyph-free.

**`SettingsTab` had a false-clean failure mode.** It runs
`if (r?.ok && r.data) setSettings(r.data)` and the fixture catch-all returned
`{ ok: true, data: [] }`. An empty array is truthy, so `settings` became `[]`,
every field read `undefined`, and the form rendered blank but not broken — it
looked like a working empty form rather than a missing fixture. The route now
returns an object; verified 6/6 fields populated.

Four fixture routes added (ads, discounts, notifications, settings), leaving
only the receipt surfaces stubbed for Phase 10. Notifications carries one row
per `type` so all three previews render, and one with `steps` for the
multi-step branch.

### The two Phase 6 deferrals, resolved

Phase 6 named Phase 9 as the closing act for two things. Their status differs:

1. **The dead per-file `dark`/`light` hex maps: already gone, nothing to do.**
   Phase 6 planned to keep them alive and delete them here, then went further
   than its own plan and replaced both with the single `TOKENS` object of
   `var()` references. No dead map was ever left behind. Verified: `TOKENS`
   holds no hex outside a comment, and no `const dark` / `const light` /
   `T_DARK` / `T_LIGHT` survives anywhere in `app/`.

   The one remaining per-file map in the repo is `components/Navbar.tsx`
   (`T_DARK` `:4`, `T_LIGHT` `:10`, consumed `:24`). That is **Phase 12**, not
   this phase.

2. **The `T` prop threading: done, in its own commit.** Removed 267 `T={T}`
   JSX attributes, 39 `T: Theme` type members, the `T` entry on `useTheme`'s
   return, and the `type Theme` alias itself, which existed only to annotate
   those signatures. Components now read the module constant by lexical scope.
   The two dead props went with it: `Badge`'s unused `T` and `StatChip`'s
   unused `color` (plus its three call-site arguments).

   **The gate was that nothing renders differently.** Computed styles for 23
   properties on every element were captured across all 13 tabs in both themes,
   before and after, and hashed: **25 of 26 byte-identical**. The 26th,
   `dark/Affiliates`, was a stale baseline rather than a regression — proven
   three ways: re-measuring it with a longer settle reproduces the after-value
   exactly; `dark − light` element count is +1 for all 13 tabs afterwards
   (the theme toggle's extra icon path) where the before-run had Affiliates
   alone at −15; and that tab sat third in a 700ms-settle chunk, so its fetch
   had not resolved and the run recorded its loading state.

   Worth keeping for the next before/after diff: **let each tab settle long
   enough to finish fetching, or the baseline captures loading states and
   invents deltas.**

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
- 2026-08-03 — Phase 3. app/partners/page.tsx onto the token layer: stale
  var() fallbacks stripped, customer density applied, brand panel moved onto
  theme-invariant --bs-brand-slab-* tokens, ambient glow removed, Terms modal
  given dialog semantics with Escape and focus restore, Terms link promoted
  from span to button (it was ticking the acceptance checkbox), field rows
  stacked under 600px, all controls to 44px. /partners restored to the footer
  in AppShell. tsc + build pass; verified at a true 360×740, both themes, and
  draft persistence round-trips under partner_signup_draft_v4.
- 2026-08-03 — Phase 4. app/partners/dashboard/page.tsx ported off
  T_DARK/T_LIGHT onto the token layer and useTheme(); the T prop removed from
  twelve helpers; 44px floor applied per the amended density row; copy-link
  given success *and* failure feedback; boot gate, tab semantics, label
  associations and 600px field stacking added. scripts/fixture-api.js corrected
  — /v2/partners/me was returning a flat profile where the page reads
  data.profile and data.affiliate, so it would have rendered the "No partner
  profile" branch and every measurement would have been of the wrong screen;
  /v2/partners/me/stats added, plus a FIXTURE_PARTNER variant. Density table
  amended: 44px is a floor on mobile-first surfaces, not a tier variable.
  tsc + build pass; verified at a true 360×740 in both themes.
- 2026-08-03 — AppShell notifications moved off a hardcoded production URL onto
  env config, reading both NEXT_PUBLIC_API_BASE and NEXT_PUBLIC_API_URL. The
  fixture recipe was incomplete for the same reason and now sets both;
  /v2/pay/verify added to the fixture with a FIXTURE_VERIFY variant. Committed
  separately from the phase.
- 2026-08-03 — Phase 5. app/order/verify on the token layer: unclosed
  var(--bs-text-primary paren fixed and proven, four emoji replaced with inline
  SVGs, static loading glyph replaced with a spinner, role=status/aria-live
  added, order ref made monospace and selectable, WHATSAPP_NUMBER imported,
  Suspense fallback matched to the real loading state, /order/verify added to
  isNoShell. tsc + build pass; all three states verified at a true 360×740 in
  both themes with no overflow and no control under 44px.
- 2026-08-03 — Phase 6. app/admin shared primitives. Badge decision settled as
  opaque `--bs-badge-*` fills after finding that a translucent tint composites
  with the selected-row accent tint (a third surface the earlier analysis
  missed) and that the recorded "stronger tint in light" option is
  mathematically backwards. Local dark/light hex maps replaced by one TOKENS
  object of var() references, moving 500+ T.* reads onto the token layer
  without editing a tab; local useTheme now wraps lib/theme.ts. Nine hex-alpha
  concatenation sites converted before they could emit invalid CSS. Both
  primitive generations put on admin density without changing a signature, so
  the Phase 7-9 dedupe is a visual no-op. Found and fixed an AA failure in
  SmallBtn/PillBadge label text (accent 3.74:1 in light) via
  `--bs-on-tint-mix`. First focus rings in admin, on --bs-ring. Toggle emoji
  replaced with inline SVGs plus an aria-label. fixture-api.js given its
  missing /v2/admin/* routes — every admin list had been returning [], so the
  tabs rendered empty states and nothing in them was measurable. tsc + build
  pass; badges, buttons and both themes verified in-browser against the
  populated fixture with transitions frozen, then rebuilt clean and confirmed
  no 127.0.0.1:8787 in the chunks. Not verified: focus rings (the automated
  tab never holds document focus) and the SmallBtn success/error/warning
  variants (their tabs' fixtures are still stubs).
- 2026-08-03 — Phase 7. Admin tabs 1-4 plus the three panels they own, on the
  token layer. The #1C1C1F Marketplace leak and two invisible-in-light
  rgba(255,255,255,0.06) logo-tile borders cleared; two hardcoded accent glows
  and three hardcoded accents in the Products <style> block tokenised, with the
  accent-as-text one moved to --bs-accent-on-surface. Found a third instance of
  the Phase 6 on-tint contrast bug in the Featured ribbon (also 9px, below the
  floor) and fixed it with --bs-on-tint-mix: 5.28 dark / 6.22 light. Six emoji
  replaced with module-level inline SVGs, aligned via a new BtnLabel wrapper so
  the shared SmallBtn was not touched. 37 sizing values mapped to the scales by
  nearest-step-ties-down; layout dimensions left alone. A stale commented-out
  copy of the Orders filter bar deleted. fixture-api.js made query-aware
  (status, q) with per-ref order lookup, and ADMIN_PRODUCTS corrected to the
  real status/stock_status/featured shape — every product card had been taking
  the isHidden branch and no ribbon had ever rendered. tsc + build pass; all
  four tabs verified in both themes at 1440px against the populated fixture
  with transitions frozen, Rejected confirmed showing one row rather than
  seven, then rebuilt clean with no 127.0.0.1:8787 in the chunks. Not verified:
  focus rings (unchanged limitation) and the Rejected confirm path, which goes
  through a native confirm() that would block the automation.
- 2026-08-04 — `--bs-accent-fill` #7756FF, committed separately from any phase.
  #fff on --bs-accent measures 4.35:1 and fails AA; no accent-filled control
  qualifies for the 3:1 large-text allowance (largest label 15px). 34 call sites
  across 7 files in one commit, since a token covering only some of its call
  sites is worse than none — which reached login, dashboard, partners,
  partners/dashboard and order/verify, all shipped in Phases 1-5. Marketplace
  has zero accent fills. Counting them took four passes (15, 28, 29, 34): the
  fills hide behind four spellings and ternary active-states, so the reliable
  audit is a runtime scan of computed styles, not a regex.
- 2026-08-04 — Phase 8. Admin tabs 5-9 plus their panels on the token layer.
  Second Marketplace #1C1C1F leak cleared in LinkRowCard; the #5B3FD4 gradient
  stop in WalletTopupPanel and the pre-token #dc2626/#991b1b gradient in
  WalletDebitPanel moved onto tokens; fifth instance of the on-tint bug fixed in
  the Links feature pills (3.7 -> 6.39). 11 glyph sites replaced with inline
  SVGs after finding the Phase 6-7 emoji regex missed the geometric-shapes
  block; one Phase 7 escape corrected. 52 sizing values mapped to the scales,
  8 Inter literals removed. Five fixture routes added — partners, affiliates,
  links, link rules, customer messages/wallet — all of which had been returning
  [] so those tabs rendered empty states. WalletsTab ticked without edits,
  deliberately. tsc + build clean; all five tabs and all six LinkEditorDrawer
  sections verified in light and dark at 1440px against the populated fixture,
  then rebuilt clean with no 127.0.0.1:8787 in the chunks.
- 2026-08-04 — White-tint audit, runtime, all 13 admin tabs in light mode:
  **zero** near-white borders or backgrounds on light surfaces. That bug class
  (six instances across Phases 6-7) is fully cleared, so there is nothing for
  Phases 9-10 to pick up. Proven with a positive control — injecting
  rgba(255,255,255,0.06) was caught at ratio 1.003 and removing it returned
  zero — so the null result is real rather than a broken scan. Static grep
  agrees: the only two rgba(255,255,255,...) left in admin are white text on the
  purple gradient headers, which is correct.
- 2026-08-04 — Phase 9. Admin tabs 10-13 plus DiscountFormPanel on the token
  layer; admin is complete. Sixth instance of the on-tint bug fixed in
  .bs-notif-add-step:hover, the only one with white text — #fff on an 8% accent
  tint, about 1.05:1 in light, so the label vanished on hover. Two hand-rolled
  shadows to --bs-elev-2/3 and two hardcoded accents in the Notifications
  <style> block to --bs-accent. Non-ASCII scan across all five declarations
  returned one glyph pair, the DiscountsTab chevrons logged in Phase 8; an
  emoji-range regex would have reported none. 27 sizing values mapped to the
  scales. Four fixture routes added — ads, discounts, notifications and a
  settings route that returns an OBJECT, since the catch-all's `data: []` is
  truthy and had SettingsTab rendering a blank-but-not-broken form. tsc + build
  clean; all four tabs verified in light and dark at 1440px, Settings confirmed
  6/6 fields populated, and the Notifications live preview exercised for toast,
  banner and modal plus the multi-step builder — roughly a third of that tab is
  unreachable from the list view. Rebuilt clean, no 127.0.0.1:8787 in chunks.
- 2026-08-04 — Phase 6's two deferrals to Phase 9 resolved. The dead per-file
  dark/light hex maps were already gone: Phase 6 superseded its own plan by
  replacing them with the TOKENS var() object, so nothing was left to delete.
  The only per-file map left in the repo is components/Navbar.tsx, which is
  Phase 12. The `T` prop threading is genuinely outstanding and now unblocked
  ("once the tabs are done"); it spans all 13 tabs so it belongs in its own
  commit rather than inside a phase.
- 2026-08-04 — T prop threading removed, standalone commit. 267 T={T} JSX
  attributes, 39 T: Theme type members, the T entry on useTheme's return and the
  now-unreferenced `type Theme` alias all deleted; components read the module
  constant by lexical scope. Badge's unused T prop and StatChip's unused color
  prop dropped with it. Gate was that nothing renders differently: computed
  styles for 23 properties on every element, all 13 tabs, both themes, hashed
  before and after — 25 of 26 identical, and the 26th was a stale baseline that
  had captured a loading state, proven by re-measurement and by the dark-minus-
  light element count being +1 for every tab afterwards. tsc + build clean.

## Contrast audit — runtime, all surfaces, both themes (2026-08-04)

Scanned every element with its own text: computed colour against its *effective*
background (translucent layers composited down to the first opaque ancestor),
against the WCAG threshold for its size and weight (4.5, or 3.0 at >=24px or
>=18.66px bold). Positive control injected (#8a8a8a on #808080) and caught at
1.14, cleared on removal, so the null results mean something.

**Three root causes, not hundreds of defects.**

**1. `--bs-text-muted` #6E6E80 fails AA on every dark surface.** This is the
dominant finding — roughly 275 elements across all 13 admin tabs plus login,
partners, order/verify and the receipt form.

| surface | ratio | needs |
|---|---|---|
| `--bs-bg-base` #050507 | 4.08 | 4.5 |
| `--bs-bg-card` #0B0B0F | 3.93 | 4.5 |
| `--bs-bg-elevated` #111116 | 3.77 | 4.5 |
| `--bs-bg-muted` #1A1A20 | 3.47 | 4.5 |

Phase 0 fixed *light* text-muted (#8896a6 -> #66717F, 4.71:1) and never checked
dark. **This is a token decision and it touches every phase**, so it is logged
rather than patched per surface. Light-mode text-muted mostly passes on base but
fails on tinted surfaces (4.10 over an accent tint at login).

**2. `--bs-accent` used as text, where a sibling token already exists.**
In light, `--bs-accent-on-surface` (#5B3FD4) is the answer and is not being
used: admin's active tab label 4.13 (x13 tabs), product category labels 4.35,
the receipt form's "+ Add item" 4.35. In dark, `-on-surface` equals `--bs-accent`
so it does not help on accent *tints*; those need `--bs-on-tint-mix`, and there
are four more instances: the notification type pills (3.96), a discount code
(4.21), the "Auto" badge (4.25), login's role tab (3.96), partners' "Step 1 of
4" (4.17), verify's order reference (4.33).

**3. `--bs-text-faint` used for content a user must read** — 2.26 in dark,
3.58 in light. It is documented as decorative and disabled-only. Misused for
`LinkRowCard`'s click counts and the receipt form's hint text.

Plus, light-mode only: state colours printed on their own 12% tints in
`app/dashboard/page.tsx`'s **second copy of `statusColor`** — warning 2.80,
success 3.26, error 4.01, muted 4.27. That copy still uses translucent tints
with plain state tokens, the exact pattern Phase 6 replaced in admin, and still
has no `rejected_pending` branch.

### Partition

| finding | belongs to |
|---|---|
| dark `--bs-text-muted` on all four surfaces | **token decision, owner** |
| accent-as-text in light (tabs, category labels) | Phases 7-9, follow-up |
| accent-on-tint in dark (pills, codes, badges) | Phases 8-9, follow-up |
| `text-faint` for click counts | Phase 8 (`LinkRowCard`) |
| dashboard `statusColor` second copy | **Phase 2 surface, still open** |
| `text-faint` hints, 10px, "+ Add item" | Phase 10 — **fixed** |
| white on WhatsApp `#25D366`, 1.98 | Phase 10 — **not fixed, needs a decision** |

### Scanner limitations, stated so the null results are not overread

- **Elements over a background-image cannot be evaluated.** The compact scanner
  dropped the image detection the first version had and produced four false
  positives on `/partners` (1.04-1.05), where the brand slab is a
  `linear-gradient` and so has no `background-color` to find. Verified by
  walking the ancestor chain: the white text sits on
  `linear-gradient(155deg, rgb(23,18,58)...)` exactly as Phase 3 designed.
  **Any future run must skip or flag image-backed elements.**
- **`/partners/dashboard` could not be scanned.** It authenticates through
  `supabase.auth.getSession()` rather than the localStorage token scan, so the
  fixture session does not satisfy it and the route redirects to `/login`.
- Only what mounts on load. Drawers, modals and the notification preview were
  not opened for this pass.

### Dark `--bs-text-muted` corrected: #6E6E80 -> #838392

The same operation Phase 0 did for light (#8896a6 -> #66717F), which was never
done for dark. Chosen as the minimum lightening that clears 4.5 on the worst
surface this token actually renders on:

| surface | before | after |
|---|---|---|
| `--bs-bg-base` #050507 | 4.08 | **5.43** |
| `--bs-bg-card` #0B0B0F | 3.93 | **5.24** |
| `--bs-bg-elevated` #111116 | 3.77 | **5.02** |
| `--bs-bg-muted` #1A1A20 | 3.47 | **4.62** |

dE2000 from #6E6E80 is 8.14. `#818191` also clears but by 0.01, and this token
renders over tints that sit lighter than bg-muted, so near-zero headroom is
fragile — the same reasoning that picked #7756FF over #7958FF.

**On the tier scale, since the question was whether three tiers collapse into
two.** secondary<->muted narrows from dE 17.89 to 9.81; muted<->faint widens
from 13.22 to 21.41. That is not a collapse: the **light** scale already ships a
secondary<->muted gap of **10.55**, so dark is converging on spacing that
already exists and works. Dark's 17.89 was the outlier. Do not push past ~5.0:1
(#898997, gap 7.66) — that is where three tiers would genuinely read as two.
Preserving the original 17.89 would mean lightening `--bs-text-secondary` too,
which is a scale change rather than a value change.

**Verified by runtime scan, not arithmetic.** Dark failures across all 13 admin
tabs went from **275 to 14**, and every survivor is a previously-logged item in
another phase's range, not a text-muted case:

- `LinkRowCard` click counts on `--bs-text-faint`, 2.26 (Phase 8)
- accent-on-tint in Discounts 4.21 / 4.25 and Notifications 3.96 (Phase 9)
- **a 7th on-tint instance found by this pass**: Notifications' "Inactive" badge
  prints `--bs-text-muted` on `rgba(--bs-text-muted, 0.15)` — text on a 15%
  tint of itself, 4.49. A local surface problem in Phase 9's range, not a token
  one; the token clears all four designed surfaces.

Light was untouched and unchanged. The scan did surface a symmetric near-miss
there, pre-existing and not caused by this change: **light `--bs-text-muted`
#66717F measures 4.46 on `--bs-bg-elevated` #F1F3F5** (12 elements in
Products). Phase 0's light correction targeted bg-base only. Logged, not fixed.
