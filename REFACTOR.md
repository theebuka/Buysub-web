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

## Phases
- [ ] 0. Token layer in lib/constants.ts (CSS_VARS)
- [ ] 1. app/login/page.tsx
- [ ] 2. app/dashboard/page.tsx
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
(record the token scale and any pattern choices here as they're made)

## Deferred (logic/perf, do not fix now)
- Duplicated fmt/fmtDate/statusColor across surfaces
- Three divergent FX tables
- Duplicated session-reading (readToken/readSession/getToken)
- NEXT_PUBLIC_API_URL vs NEXT_PUBLIC_API_BASE split

## Session log
(append one line per session: date, phase, what landed)
