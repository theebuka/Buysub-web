# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server on 0.0.0.0:3000
npm run build    # next build
npm run start    # production server
npx tsc --noEmit # type-check (tsconfig is strict, noEmit)
```

There is no linter, no test suite, and no test runner configured. `npm run build` + `npx tsc --noEmit` are the only verification gates.

## What this is

`@buysub/web` — the Next.js 14 App Router frontend for BuySub, a Nigerian digital-subscription marketplace. It is a **pure frontend**: there are no API routes, no server actions, and no server-side data fetching. Every page is `'use client'`; all data comes from an external Cloudflare Workers API (`buysub-api-v2.ebuka-nwaju.workers.dev`) over `/v2/*` endpoints, and auth comes from Supabase Auth.

Dependencies are deliberately minimal: `next`, `react`, `@supabase/supabase-js`, `sonner`. No UI library, no CSS framework, no state manager, no form library, no data-fetching library.

### Hosting

Cloudflare Pages project `buysub-web` (account `e6fedf8d3c96d8e4d22e27d618f60ada`, the same one as both workers), Git-connected to this repo. Pushing `main` deploys production (`app.buysub.ng`); every other branch gets a preview at `<hash>.buysub-web.pages.dev`. Build command `npx @cloudflare/next-on-pages@1`, output `.vercel/output/static`; the `NEXT_PUBLIC_*` values live in the Pages project settings, not in the repo.

Two things `next build` alone won't catch:
- **Any dynamic route needs `export const runtime = 'edge'`**, or the Pages build fails with "routes were not configured to run with the Edge Runtime". `app/page.tsx` is dynamic because it reads `searchParams`.
- **`.npmrc` sets `legacy-peer-deps=true`.** Without it the build's `npx` install fails on peer ranges. Every build from 2026-08-02 to 2026-10-06 failed that way, so production sat on the 2026-05-08 build.

To reproduce the real build locally: `npx @cloudflare/next-on-pages@1`, then `npx wrangler pages dev .vercel/output/static --compatibility-flags nodejs_compat`. next-on-pages is deprecated in favour of OpenNext (`@opennextjs/cloudflare`); migrating is a separate job.

## Architecture

### Surfaces (one page = one large self-contained file)

| Route | File | Audience |
|---|---|---|
| `/` | `app/page.tsx` | redirects to `/shop` |
| `/shop` | `components/Marketplace.tsx` (~2.1k lines) | public storefront + cart + checkout |
| `/login` | `app/login/page.tsx` | three tabs: customer / partner / admin |
| `/dashboard` | `app/dashboard/page.tsx` | customer: orders, messages, wallet, profile |
| `/admin` | `app/admin/page.tsx` (~5.5k lines) | 13 tabs, the whole back office |
| `/admin/receipt` | `app/admin/receipt/page.tsx` | PDF receipt generator (ported from Airtable) |
| `/partners` | `app/partners/page.tsx` | partner application form (draft persisted to localStorage) |
| `/partners/dashboard` | `app/partners/dashboard/page.tsx` | partner earnings |
| `/order/verify` | `app/order/verify/VerifyContent.tsx` | Paystack callback landing page (clears the cart on success) |
| `/reset-password` | `app/reset-password/page.tsx` | target of the forgot-password email; must be on the Supabase Auth redirect allow-list |

The big files are structured internally by section-comment banners and module-level sub-components (e.g. `OrdersTab`, `ProductsTab`, `NewOrderDrawer` in `app/admin/page.tsx`). Sub-components are declared at module level on purpose — defining them inside the parent would remount them on every render and drop input focus. Keep that pattern.

### Shell and chrome

`app/layout.tsx` is the only server component. It imports `app/globals.css` (reset, keyframes, utilities), injects `CSS_VARS` from `lib/constants.ts` via `dangerouslySetInnerHTML`, loads Inter from Google Fonts, mounts `<Toaster>` (sonner), and injects the Tawk.to live-chat script.

`components/AppShell.tsx` wraps all children and decides chrome by pathname: `/admin`, `/partners`, `/dashboard`, `/login`, `/reset-password` and `/order/verify` render **without** the site header or footer (`isNoShell`). The header and footer are `components/nav/SiteHeader.tsx` and `SiteFooter.tsx` (they replaced `Navbar.tsx` / `Footer.tsx`, which are now unused and go in Phase 2). The header has the Browse mega menu, the search palette (`/`, ⌘K), the cart count and the account menu; on `/shop` it drives Marketplace's own cart drawer, search and category through window events (`lib/shopBus.ts`), and elsewhere it navigates to `/shop?q=`, `/shop?category=` or `/shop#cart`. Every in-app link target lives in `lib/routes.ts`. Both are gated on the same flag — the Footer used to be gated on `!isAdmin`, which let it render on `/partners` and `/dashboard` despite those being no-shell routes. It also syncs `data-theme` to the route on every pathname change (see Styling below). It additionally polls `GET /v2/notifications` every 15s and renders toast / banner / multi-step modal notifications, filtered by `audience` (`users` vs `admins`) and de-duplicated via `localStorage` keys `notif_<id>`.

### Auth

Supabase Auth, browser-only. The Supabase client is instantiated per-page (`createClient(SUPABASE_URL, SUPABASE_ANON)` in `login`, `dashboard`, `partners/dashboard`, `reset-password`). `lib/session.ts` holds a lazy shared client used only for `getAccessToken()`.

Tokens for API calls come from `supabase.auth.getSession()`, which refreshes an expired access token: the page's own client in login, dashboard and partner dashboard, and `getAccessToken()` in `lib/session.ts` for admin and receipt. **Never delete the `sb-*-auth-token` key when `expires_at` has passed** — it holds the refresh token. The old hand-rolled readers did that and signed everyone out hourly. `readToken` in `app/admin/page.tsx` survives only as a presence check for render gating. `components/Marketplace.tsx` still scans localStorage, but only to prefill checkout, and it ignores expired tokens rather than deleting them.

Every authenticated request sends `Authorization: Bearer <access_token>`. Each surface has its own local `apiFetch` that redirects to `/login` on 401/403. There is no middleware and no route protection — pages guard themselves client-side after mount.

Post-login routing lives in `redirectByRole()` in `app/login/page.tsx`: admin → `/admin`, partner → `/partners/dashboard`, customer → `/dashboard`. Arriving with an existing session uses `redirectExistingSession()`, which routes by the account's real role (`/v2/me`). Customer sign-up passes name/phone/gender as auth metadata, and `completeProfile()` (`POST /v2/auth/signup`, token-identified, idempotent) runs after sign-up and at each customer login.

### Data flow

`lib/api.ts` is a thin typed wrapper (`getProducts`, `createOrder`, `createWhatsAppOrder`, `initPaystackPayment`, `verifyPayment`, `validateDiscount`, …) returning `{ ok, data?, error?, meta? }`. **Only `Marketplace.tsx` and the verify page use it** — the admin, dashboard, partner, and ads surfaces each define their own local `apiFetch` because they need the auth header. Admin list endpoints paginate via `meta.pagination`.

Checkout has two paths, both in `Marketplace.tsx`:
- **WhatsApp**: `POST /v2/orders/whatsapp` → open the returned `whatsapp_url` in a new tab, clear cart.
- **Paystack**: `POST /v2/orders` → `POST /v2/pay/init` with `callback_url = ${origin}/order/verify` → redirect to `authorization_url`. `/order/verify` then calls `GET /v2/pay/verify?reference=`.

Cart lives in `localStorage` under `CART_STORAGE_KEY` (`buysub_cart_v2`), keyed by `cartKey(productId, period)`.

Referrals: `lib/useReferral.ts` reads `?ref=` (URL wins over cookie), validates it against `/v2/affiliates/resolve`, stores it in the `bs_ref` cookie for 30 days, fires `/v2/affiliates/click`, then strips `?ref=` from the URL. The resulting code is passed as `referral_code` on order payloads. Partner share links are `${NEXT_PUBLIC_SITE_URL}/shop?ref=CODE` (so that var must be the app origin in production), and `app/page.tsx` forwards the query string when it redirects to `/shop`.

### Pricing and discounts

`lib/constants.ts` holds the shared domain model: the `PERIODS` map (period key → `{ months, field, label, name }`, where `field` is the product column `price_3m` / `price_6m` / `price_1y`), the `TAB_ORDER` category list, static `FX` rates (NGN base; the only FX table — `app/admin/receipt/page.tsx` imports it, and uses the order's stored `fx_rate` for receipts of existing orders), and the `Product` / `CartItem` / `DiscountRecord` types.

`isItemEligible` / `getEligibleSubtotal` / `calcDiscountAmount` in `lib/constants.ts` are an intentional **frontend mirror of backend discount logic** (include/exclude by product and category, percentage vs fixed, `max_discount_ngn` cap). If discount rules change server-side, these must be updated in lockstep or the displayed total will disagree with the charged total.

`roundUp` rounds to the nearest half unit; `format` renders `₦` manually for NGN and `Intl.NumberFormat` otherwise.

### Styling

New code (from the 2026-10 IA refactor) uses **CSS Modules**: `components/ui/` (Button, IconButton, Input/Select/Field, Badge/StatusBadge, Card/StatCard, Tabs, SegmentedControl, Modal/Drawer with a shared focus trap, Popover/MenuItem, Table that becomes cards under 768px, Pagination, EmptyState/Skeleton/Spinner, PageHeader/Breadcrumbs, CopyField, Price, ProductLogo, Icon), `components/nav/` and per-page `*.module.css`. They consume the same tokens. `app/globals.css` holds the reset and keyframes, and deliberately sets no global button/img/focus rules, because the older surfaces were tuned against UA defaults. Shared helpers: `lib/format.ts` (fmtNGN, fmtDate, …), `lib/status.ts` (label, tone and bucket for every status; `rejected_pending` is tone `pending`), `lib/apiAuth.ts` (`authFetch`), `lib/useSession.tsx` (one shared `/v2/me` store, `RequireRole`), `lib/cart.ts` (`useCart` over the same `buysub_cart_v2` key), `lib/useProducts.ts`, `lib/pricing.ts`, `lib/flags.ts` (`NEXT_PUBLIC_FF_*`).

The older surfaces are 100% inline `style` objects. Two systems coexist there and both are in use:

1. **CSS variables** (`--bs-bg-base`, `--bs-text-primary`, `--bs-accent`, …) defined once in `CSS_VARS` and consumed by `AppShell`, `Navbar`, `Footer`, and the verify page.
2. **Per-file `dark` / `light` theme token objects** duplicated in `app/admin/page.tsx`, `app/login/page.tsx`, `components/Navbar.tsx`, and elsewhere, selected by a local `useTheme()` / `isDark` state.

The theme preference is persisted under the single localStorage key `bs_admin_theme` as a bare `'dark'` / `'light'` string (the marketplace navbar writes it too, despite the name — but `Navbar.tsx` only ever *writes* it and never reads it back on mount, so that toggle resets to dark on every load). `components/Marketplace.tsx` does not touch this key at all.

`CSS_VARS` is the single source of truth for tokens: colour, type, spacing, radius, control heights, elevation and motion, plus a `[data-theme="light"]` block. `lib/constants.ts` also exports `T`, a set of `var()` references for use inside inline style objects. `lib/theme.ts` owns the theme; an inline script in `app/layout.tsx` sets `data-theme` on `<html>` before first paint. **`/shop` is not themed yet, and the exclusion is temporary** — `Marketplace.tsx` mixes `var()` surfaces with fixed dark literals, so a light theme renders it half-light. Both the script and the hook guard on the pathname. The guard ends when `Marketplace.tsx` is refactored, which is the last planned surface; `components/Navbar.tsx` already gates its theme toggle on `isThemeableRoute()`, so that control starts appearing on `/shop` the day the guard lifts, with no edit. The per-file `dark`/`light` objects listed below are being removed surface by surface; see `REFACTOR.md`.

Images use raw `<img>`. The older surfaces use raw `<a>`; new code (`components/ui`, `components/nav`, new pages) uses `next/link`. `next/image` is not used, though `next.config.js` still whitelists `img.logo.dev`, `*.airtableusercontent.com`, and `*.supabase.co` remote patterns. Brand logos are fetched from `https://img.logo.dev/<domain>?token=...&size=N`.

### Hydration

Client-only values (localStorage, `window`) must never be read during render. The established fix is `useClientValue(getter, fallback)` in `app/admin/page.tsx` and the `mounted` flag pattern (`useEffect(() => setMounted(true), [])`, render the fallback until mounted). Reading localStorage directly in a render body will produce a hydration mismatch.

## Gotchas

- **Two env var names for the same API base**, resolved in one place: `lib/config.ts` exports `API_BASE` (`NEXT_PUBLIC_API_BASE`, else `NEXT_PUBLIC_API_URL`, else the live Workers URL). Every file imports it; never read either variable directly. Before this, half the files read only `NEXT_PUBLIC_API_BASE` and fell back to production, so a local run with only `NEXT_PUBLIC_API_URL` set sent login, dashboard, partner, ads and referral traffic to the live API.
- **Hardcoded production URLs and tokens.** The Workers API URL, the WhatsApp number `2348107872916`, and the logo.dev publishable token are literal strings duplicated across several files. Changing any of them means grepping, not editing one constant.
- **Duplicated helpers.** `fmt`/`fmtDate`/`statusColor`, the theme token objects, the session-reading function, and the FX table each exist in multiple copies. When fixing a bug in one, check whether the same code exists in the sibling surfaces.

## Environment

Copy `.env.example` → `.env.local`:

```
NEXT_PUBLIC_API_URL           # Workers API base
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
NEXT_PUBLIC_SITE_URL
```

`NEXT_PUBLIC_API_URL` alone is enough; `NEXT_PUBLIC_API_BASE`, if set, takes precedence (see `lib/config.ts`).
