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
| `/order/verify` | `app/order/verify/VerifyContent.tsx` | Paystack callback landing page |

The big files are structured internally by section-comment banners and module-level sub-components (e.g. `OrdersTab`, `ProductsTab`, `NewOrderDrawer` in `app/admin/page.tsx`). Sub-components are declared at module level on purpose — defining them inside the parent would remount them on every render and drop input focus. Keep that pattern.

### Shell and chrome

`app/layout.tsx` is the only server component. It injects `CSS_VARS` from `lib/constants.ts` plus a global reset via `dangerouslySetInnerHTML`, loads Inter from Google Fonts, mounts `<Toaster>` (sonner), and injects the Tawk.to live-chat script.

`components/AppShell.tsx` wraps all children and decides chrome by pathname: `/admin`, `/partners`, and `/dashboard` render **without** Navbar/Footer (`isNoShell`); `/admin` also hides the Footer. It additionally polls `GET /v2/notifications` every 15s and renders toast / banner / multi-step modal notifications, filtered by `audience` (`users` vs `admins`) and de-duplicated via `localStorage` keys `notif_<id>`.

### Auth

Supabase Auth, browser-only. The Supabase client is instantiated per-page (`createClient(SUPABASE_URL, SUPABASE_ANON)` in `login`, `dashboard`, `partners/dashboard`); there is no shared client module.

Two different ways of reading the session coexist:
- `supabase.auth.getSession()` — login page, partner dashboard.
- Scanning `localStorage` for a key matching `sb-*-auth-token` and parsing `access_token` / `expires_at` / `user.email` out of it — `app/admin/page.tsx` (`readToken`), `app/dashboard/page.tsx` (`readSession`), `app/admin/receipt/page.tsx` (`getToken`), `components/Marketplace.tsx`. Each file has its own copy of this function.

Every authenticated request sends `Authorization: Bearer <access_token>`. Each surface has its own local `apiFetch` that redirects to `/login` on 401/403. There is no middleware and no route protection — pages guard themselves client-side after mount.

Post-login routing lives in `redirectByRole()` in `app/login/page.tsx`: admin → `/admin`, partner → `/partners/dashboard`, customer → `/dashboard`.

### Data flow

`lib/api.ts` is a thin typed wrapper (`getProducts`, `createOrder`, `createWhatsAppOrder`, `initPaystackPayment`, `verifyPayment`, `validateDiscount`, …) returning `{ ok, data?, error?, meta? }`. **Only `Marketplace.tsx` and the verify page use it** — the admin, dashboard, partner, and ads surfaces each define their own local `apiFetch` because they need the auth header. Admin list endpoints paginate via `meta.pagination`.

Checkout has two paths, both in `Marketplace.tsx`:
- **WhatsApp**: `POST /v2/orders/whatsapp` → open the returned `whatsapp_url` in a new tab, clear cart.
- **Paystack**: `POST /v2/orders` → `POST /v2/pay/init` with `callback_url = ${origin}/order/verify` → redirect to `authorization_url`. `/order/verify` then calls `GET /v2/pay/verify?reference=`.

Cart lives in `localStorage` under `CART_STORAGE_KEY` (`buysub_cart_v2`), keyed by `cartKey(productId, period)`.

Referrals: `lib/useReferral.ts` reads `?ref=` (URL wins over cookie), validates it against `/v2/affiliates/resolve`, stores it in the `bs_ref` cookie for 30 days, fires `/v2/affiliates/click`, then strips `?ref=` from the URL. The resulting code is passed as `referral_code` on order payloads.

### Pricing and discounts

`lib/constants.ts` holds the shared domain model: the `PERIODS` map (period key → `{ months, field, label, name }`, where `field` is the product column `price_3m` / `price_6m` / `price_1y`), the `TAB_ORDER` category list, static `FX` rates (NGN base — note `app/admin/receipt/page.tsx` carries its own divergent `FX` table), and the `Product` / `CartItem` / `DiscountRecord` types.

`isItemEligible` / `getEligibleSubtotal` / `calcDiscountAmount` in `lib/constants.ts` are an intentional **frontend mirror of backend discount logic** (include/exclude by product and category, percentage vs fixed, `max_discount_ngn` cap). If discount rules change server-side, these must be updated in lockstep or the displayed total will disagree with the charged total.

`roundUp` rounds to the nearest half unit; `format` renders `₦` manually for NGN and `Intl.NumberFormat` otherwise.

### Styling

100% inline `style` objects — there are no `.css` files, no CSS modules, no Tailwind. Two systems coexist and both are in use:

1. **CSS variables** (`--bs-bg-base`, `--bs-text-primary`, `--bs-accent`, …) defined once in `CSS_VARS` and consumed by `AppShell`, `Navbar`, `Footer`, and the verify page.
2. **Per-file `dark` / `light` theme token objects** duplicated in `app/admin/page.tsx`, `app/login/page.tsx`, `components/Navbar.tsx`, and elsewhere, selected by a local `useTheme()` / `isDark` state.

The theme preference is persisted under the single localStorage key `bs_admin_theme` (used by the marketplace navbar too, despite the name).

Images use raw `<img>`; links use raw `<a>`. `next/image` and `next/link` are not used anywhere, though `next.config.js` still whitelists `img.logo.dev`, `*.airtableusercontent.com`, and `*.supabase.co` remote patterns. Brand logos are fetched from `https://img.logo.dev/<domain>?token=...&size=N`.

### Hydration

Client-only values (localStorage, `window`) must never be read during render. The established fix is `useClientValue(getter, fallback)` in `app/admin/page.tsx` and the `mounted` flag pattern (`useEffect(() => setMounted(true), [])`, render the fallback until mounted). Reading localStorage directly in a render body will produce a hydration mismatch.

## Gotchas

- **Two env var names for the same API base.** `lib/api.ts`, `app/admin/page.tsx`, and `app/admin/receipt/page.tsx` read `NEXT_PUBLIC_API_URL`; `app/dashboard`, `app/login`, `app/partners/*`, `components/Marketplace.tsx`, `components/ShopAds.tsx`, and `lib/useReferral.ts` read `NEXT_PUBLIC_API_BASE`. Only `NEXT_PUBLIC_API_URL` is defined in `.env.example` / `.env.local`, so the `API_BASE` group silently falls back to the hardcoded production Workers URL — including in local dev. `app/admin/page.tsx` uses `process.env.NEXT_PUBLIC_API_URL!` with no fallback, so it breaks outright if that var is missing.
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

Add `NEXT_PUBLIC_API_BASE` with the same value as `NEXT_PUBLIC_API_URL` if you want the second group of files to hit a non-production API.
