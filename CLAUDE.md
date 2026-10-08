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

To watch changes live against the fixture API, use the `fixture-api` and `web-dev` entries in the workspace `.claude/launch.json` (next dev on :3200 with `NEXT_DIST_DIR=.next-dev`, so it never collides with `npm run build`). Plain `npm run dev` talks to the production API, whose CORS rejects localhost. To reproduce the real build locally: `npx @cloudflare/next-on-pages@1`, then `npx wrangler pages dev .vercel/output/static --compatibility-flags nodejs_compat`. **Edge routes (`/`, `/shop/[slug]`, `/shop/c/[category]`) don't work under plain `next start`**: they render the 404 page and log `TypeError: e[o] is not a function`. Check them with next-on-pages + wrangler instead. Under local wrangler a server-side fetch can't reach the fixture API on 127.0.0.1, so the product page falls back to loading the product in the browser there. next-on-pages is deprecated in favour of OpenNext (`@opennextjs/cloudflare`); migrating is a separate job.

## Architecture

### Surfaces (one page = one large self-contained file)

| Route | File | Audience |
|---|---|---|
| `/` | `app/page.tsx` (edge) → `components/home/HomePage.tsx` | home: hero with the live shop in a phone, brand marquee and how it works, categories, partner card (search lives in the header). Old `/?category=…` style links redirect to `/shop` with their query; `?ref=` is recorded here |
| `/shop`, `/shop/c/[category]` | `components/shop/ShopPage.tsx` | catalog: filters in the URL, quick view on card click |
| `/shop/[slug]` | `app/shop/[slug]/page.tsx` (edge, fetches the product for metadata and schema.org JSON-LD) → `components/shop/ProductPage.tsx` | product page: buy box, frequently bought together, reviews, recently viewed; the quick view `pushState`s this URL |
| `/saved` | `components/shop/SavedPage.tsx` | saved (heart) products, synced to the account when signed in (`lib/saved.ts`, `/v2/me/saved`), and recently viewed (this browser only) |
| `/sitemap.xml`, `/robots.txt` | `app/sitemap.xml/route.ts` (edge), `app/robots.ts` | the sitemap is a plain route handler: as `app/sitemap.ts` its catalog fetch never returned under next-on-pages |
| `/cart`, `/checkout` | `components/shop/CartPage.tsx`, `CheckoutPage.tsx` | cart, then details + Paystack / WhatsApp |
| `/help` | `app/help/page.tsx` | help centre |
| `/login`, `/signup` | `components/auth/AuthPage.tsx` (`AuthLayout` also frames `/reset-password`) | one sign-in for every role; the account's role picks where it lands (staff → `/admin`, partner → `/partner`, else `/account`), and a same-origin `?next=` wins. `?mode=signup|forgot` still work |
| `/account/*` | `app/account/*` → `components/account/*` | customer area: overview, orders (`?status=` processing/completed/cancelled, `?q=`), `orders/[ref]` (edge), subscriptions (`?renew=<order item id>` adds that plan to the cart: the reminder email's link), wallet (Paystack top-ups return with `?reference=`), notifications, messages (`?m=<id>`), support (two-way conversations with staff, `?t=<thread>`, `?order=<ref>` starts one about an order), referrals (refer and earn), settings. `AccountShell` gates on `RequireRole` |
| `/dashboard` | `app/dashboard/page.tsx` | redirect stub to `/account/*` (maps `?tab=`, keeps the hash). Still the sign-up `emailRedirectTo`, because it is on the Supabase Auth allow-list |
| `/admin/*` | `app/admin/(console)/<section>/page.tsx` → `app/admin/_components/*` | admin console: overview, orders (+ `orders/[ref]`, edge), rejected, discounts, products, reviews, customers, wallets, partners, affiliates, payouts, links, ads, notifications, support (reply to customer and partner conversations), settings (service switches and programme settings first). The `(console)` layout gates on a staff role (`RequireRole allow="staff"`) and renders `components/admin/AdminShell` (grouped sidebar with counts, breadcrumbs, ⌘K). Lists use `components/admin/DataTable` + `app/admin/_lib/useAdminList` (filters in the URL). `/admin?tab=x` redirects to `/admin/x` |
| `/admin/receipt` | `app/admin/(console)/receipt/page.tsx` | PDF receipt generator, inside the console shell |
| `/partners` | `app/partners/page.tsx` | partner application form (draft persisted to localStorage); a closed notice when admins switch applications off |
| `/partner/*` | `app/partner/*` → `components/partner/*` | partner portal: overview (link, figures, 30-day clicks chart), referral link builder, conversions, payouts (scheduled by the partner's chosen frequency), profile, support. `PartnerShell` shows the application status instead until approved |
| `/partners/dashboard` | `app/partners/dashboard/page.tsx` | redirect stub to `/partner` (keeps the hash). Still the partner sign-up `redirectTo` (allow-listed) |
| `/order/verify` | `app/order/verify/VerifyContent.tsx` | Paystack callback landing page (clears the cart on success) |
| `/reset-password` | `app/reset-password/page.tsx` | target of the forgot-password email; must be on the Supabase Auth redirect allow-list |

The big files are structured internally by section-comment banners and module-level sub-components (e.g. the link editor sections in `app/admin/_components/Links.tsx`). Sub-components are declared at module level on purpose — defining them inside the parent would remount them on every render and drop input focus. Keep that pattern.

### Shell and chrome

`app/layout.tsx` is the only server component. It imports `app/globals.css` (reset, keyframes, utilities), injects `CSS_VARS` from `lib/constants.ts` via `dangerouslySetInnerHTML`, loads Public Sans from Google Fonts (`--bs-font-sans`; it has a real ₦ glyph, which most UI faces lack), mounts `<Toaster>` (sonner), and mounts the Tawk.to live chat (`components/TawkWidget.tsx`: public routes only, hidden in /account, /partner and /admin, which have in-app support).

`components/AppShell.tsx` wraps all children and decides chrome by pathname: `/admin`, `/partners`, `/dashboard`, `/login`, `/signup`, `/reset-password` and `/order/verify` render **without** the site header or footer (`isNoShell`). The header and footer are `components/nav/SiteHeader.tsx` and `SiteFooter.tsx` (they replaced `Navbar.tsx` / `Footer.tsx`). The header has the Browse mega menu, the search palette (`/`, ⌘K), the currency menu, the cart count and the account menu, and mounts the site-wide cart drawer (`components/shop/CartDrawer.tsx`, opened with `setCartDrawer`). On a catalog page its search and category picks update the catalog in place through window events (`lib/shopBus.ts`); elsewhere they navigate to `/shop?q=` or `/shop/c/<category>`. Every in-app link target lives in `lib/routes.ts`. Both are gated on the same flag — the Footer used to be gated on `!isAdmin`, which let it render on `/partners` and `/dashboard` despite those being no-shell routes. It also syncs `data-theme` to the route on every pathname change (see Styling below). It wraps the page in `components/MaintenanceGate.tsx`, which shows the maintenance page while `GET /v2/status` says so (staff, `/admin` and sign-in pages pass). Service switches come from the same endpoint through `lib/siteStatus.ts`; checkout, the wallet page and `/partners` hide what is off, and the API refuses it too. Signed-in users get a notifications bell (desktop) backed by `GET /v2/me/notifications` (`lib/inbox.ts`). It additionally polls `GET /v2/notifications` every 15s and renders toast / banner / multi-step modal notifications, filtered by `audience` (`users` vs `admins`) and de-duplicated via `localStorage` keys `notif_<id>`.

### Auth

Supabase Auth, browser-only. `lib/session.ts` holds the lazy shared client: `getAccessToken()` for API calls and `getSupabase()` for the auth screens (`components/auth/*`, `/reset-password`). A few older surfaces still create their own client.

Tokens for API calls come from `supabase.auth.getSession()`, which refreshes an expired access token: the page's own client in login, dashboard and partner dashboard, and `getAccessToken()` in `lib/session.ts` for admin and receipt. **Never delete the `sb-*-auth-token` key when `expires_at` has passed** — it holds the refresh token. The old hand-rolled readers did that and signed everyone out hourly. The admin console gates on `RequireRole` (from `/v2/me`), not on a token sniff. Checkout prefills from `lib/useSession.tsx`.

Every authenticated request sends `Authorization: Bearer <access_token>`. Each surface has its own local `apiFetch` that redirects to `/login` on 401/403. There is no middleware and no route protection — pages guard themselves client-side after mount.

Post-login routing lives in `landingFor()` in `components/auth/AuthPage.tsx`: a same-origin `?next=` wins, else staff → `/admin`, partner → `/partner`, everyone else → `/account`, by the account's real role (`/v2/me`, `/v2/partners/me`). One email is one account: a partner who shops uses the same login and switches areas from the avatar menu. Customer sign-up passes name/phone/gender as auth metadata, and `completeProfile()` (`POST /v2/auth/signup`, token-identified, idempotent) runs after sign-up and at each non-staff sign-in.

### Data flow

`lib/api.ts` is a thin typed wrapper (`getProducts`, `createOrder`, `createWhatsAppOrder`, `initPaystackPayment`, `verifyPayment`, `validateDiscount`, …) returning `{ ok, data?, error?, meta? }`. **Only the storefront (`lib/checkout.ts`, `lib/useProducts.ts`) and the verify page use it** — the admin, dashboard, partner, and ads surfaces each define their own local `apiFetch` because they need the auth header. Admin list endpoints paginate via `meta.pagination`.

Checkout has two paths, both in `lib/checkout.ts` (ported verbatim from the old `Marketplace.tsx`, same payloads):
- **WhatsApp**: `POST /v2/orders/whatsapp` → open the returned `whatsapp_url` in a new tab, clear cart, show the order reference with a fallback WhatsApp button.
- **Paystack**: `POST /v2/orders` → `POST /v2/pay/init` with `callback_url = ${origin}/order/verify` → redirect to `authorization_url`. `/order/verify` then calls `GET /v2/pay/verify?reference=`.

Cart lives in `localStorage` under `CART_STORAGE_KEY` (`buysub_cart_v2`), keyed by `cartKey(productId, period)`, behind the `lib/cart.ts` store (`useCart`, `addToCart`, `reconcileCart` re-prices it against the live catalog on each catalog/cart/checkout load). Signed in, the cart and saved items also follow the account: `lib/cartSync.ts` (`/v2/me/cart`, migration 17) and `lib/saved.ts` (`/v2/me/saved`, migration 16), mounted as `<CartSync/>` and `<SavedSync/>` in AppShell. Sign-in merges a signed-out cart into the account's; sign-out empties an account's cart from the browser. Always change the cart through `lib/cart.ts` (`writeCart` and the mutations), never `localStorage` directly, or the change won't reach the account. The applied promo code is a small store in `lib/checkout.ts` (sessionStorage), shared by the drawer and `/checkout`. The display currency is site-wide (`lib/currency.ts`, `bs_currency`); orders are charged in NGN with `fx_rate`. Account pages read through `lib/useApi.ts` (per-path cache, refreshed in place by `invalidate(prefix)`). There is no subscriptions table: `lib/subscriptions.ts` derives plans from paid order lines (`paid_at` + `duration_months`), and Renew/Buy again re-adds them to the cart at today's price. Product-page content (features, FAQs, delivery, badge, SEO) comes from the columns added in `supabase-migrations/07`; `lib/catalog.ts` holds the fallbacks and the single-seller `toOffers()`.

Referrals: `lib/useReferral.ts` reads `?ref=` (URL wins over cookie), validates it against `/v2/affiliates/resolve`, stores it in the `bs_ref` cookie for 30 days, fires `/v2/affiliates/click`, then strips `?ref=` from the URL. The resulting code is passed as `referral_code` on order payloads. Partner share links are `${NEXT_PUBLIC_SITE_URL}/shop?ref=CODE` (so that var must be the app origin in production), and the home page records `?ref=` itself (`app/page.tsx` only forwards shop-filter params to `/shop`).

### Pricing and discounts

`lib/constants.ts` holds the shared domain model: the `PERIODS` map (period key → `{ months, field, label, name }`, where `field` is the product column `price_3m` / `price_6m` / `price_1y`), the `TAB_ORDER` category list, static `FX` rates (NGN base; the only FX table — `app/admin/(console)/receipt/page.tsx` imports it, and uses the order's stored `fx_rate` for receipts of existing orders), and the `Product` / `CartItem` / `DiscountRecord` types.

`isItemEligible` / `getEligibleSubtotal` / `calcDiscountAmount` in `lib/constants.ts` are an intentional **frontend mirror of backend discount logic** (include/exclude by product and category, percentage vs fixed, `max_discount_ngn` cap). If discount rules change server-side, these must be updated in lockstep or the displayed total will disagree with the charged total.

`roundUp` rounds to the nearest half unit; `format` renders `₦` manually for NGN and `Intl.NumberFormat` otherwise.

### Styling

New code (from the 2026-10 IA refactor) uses **CSS Modules**: `components/ui/` (Button, IconButton, Input/Select/Field, Badge/StatusBadge, Card/StatCard, Tabs, SegmentedControl, Modal/Drawer with a shared focus trap, Popover/MenuItem, Table that becomes cards under 768px, Pagination, EmptyState/Skeleton/Spinner, PageHeader/Breadcrumbs, CopyField, Price, ProductLogo, Icon), `components/nav/` and per-page `*.module.css`. They consume the same tokens. `app/globals.css` holds the reset and keyframes, and deliberately sets no global button/img/focus rules, because the older surfaces were tuned against UA defaults. Shared helpers: `lib/format.ts` (fmtNGN, fmtDate, …), `lib/status.ts` (label, tone and bucket for every status; `rejected_pending` is tone `pending`), `lib/apiAuth.ts` (`authFetch`), `lib/useSession.tsx` (one shared `/v2/me` store, `RequireRole`), `lib/cart.ts` (`useCart` over the same `buysub_cart_v2` key), `lib/useProducts.ts`, `lib/pricing.ts`, `lib/flags.ts` (`NEXT_PUBLIC_FF_*`).

The older surfaces are 100% inline `style` objects. Two systems coexist there and both are in use:

1. **CSS variables** (`--bs-bg-base`, `--bs-text-primary`, `--bs-accent`, …) defined once in `CSS_VARS` and consumed by `AppShell` and the verify page.
2. **Per-file `dark` / `light` theme token objects** duplicated in `app/login/page.tsx` and elsewhere (the admin console's remaining legacy editors read the var()-based `T` in `app/admin/_lib/shared.tsx`), selected by a local `useTheme()` / `isDark` state. These are being removed surface by surface; see `REFACTOR.md`.

The theme preference is persisted under the single localStorage key `bs_admin_theme` as a bare `'dark'` / `'light'` string.

`CSS_VARS` is the single source of truth for tokens: colour, type, spacing, radius, control heights, elevation and motion, plus a `[data-theme="light"]` block. `lib/constants.ts` also exports `T`, a set of `var()` references for use inside inline style objects. `lib/theme.ts` owns the theme; an inline script in `app/layout.tsx` sets `data-theme` on `<html>` before first paint. Every route is themeable: the old `/shop` exclusion ended when `Marketplace.tsx` was replaced by `components/shop/*`. `isThemeableRoute()` remains as the one gate (it returns true) in case a fixed-theme route is ever needed.

Images use raw `<img>`. The older surfaces use raw `<a>`; new code (`components/ui`, `components/nav`, new pages) uses `next/link`. `next/image` is not used, though `next.config.js` still whitelists `img.logo.dev`, `*.airtableusercontent.com`, and `*.supabase.co` remote patterns. Brand logos are fetched from `https://img.logo.dev/<domain>?token=...&size=N`.

### Hydration

Client-only values (localStorage, `window`) must never be read during render. The established fix is `useSyncExternalStore` (see `lib/useSession.tsx`, `lib/cart.ts`) or the `mounted` flag pattern (`useEffect(() => setMounted(true), [])`, render the fallback until mounted). Reading localStorage directly in a render body will produce a hydration mismatch.

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
