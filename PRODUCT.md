# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary: people in Nigeria who want foreign digital subscriptions (streaming, AI tools, productivity apps, games, cloud) but can't easily pay in dollars. They come to buy a specific service quickly and trust that someone will set it up.

Secondary: partners who earn commission by referring buyers (partner portal at /partner). Staff run the admin console.

## Product Purpose
BuySub sells subscriptions to international services priced in Naira. Shoppers pay by card or transfer through Paystack (optionally using their BuySub wallet balance) or place the order on WhatsApp, and BuySub sets up the subscription and sends the access details. Success: a shopper finds the service, pays without a dollar card, and gets access.

## Positioning
Naira pricing and human-handled setup for services that otherwise need a foreign card. BuySub is the only seller today; the catalog is structured so other sellers could be added later.

## Capabilities and Constraints
- Catalog of products by category with per-period pricing (monthly, quarterly, annual, one-time), volume discounts and promo codes.
- Checkout via Paystack or WhatsApp; wallet balance; customer accounts with orders, wallet, messages, support.
- Partner referral links (`?ref=`), partner payouts.
- Frontend: Next.js 14 on Cloudflare Pages (next-on-pages, edge runtime for dynamic routes). The storefront lives at app.buysub.ng.
- Copy must not promise what the business hasn't committed to (no guaranteed delivery times or guarantees).

## Brand Commitments
- Name BuySub; logo files in `public/brand/`. Violet brand colour.
- Light theme is the default for the landing page.
- No AI-slop UI: no gradients, glows or eyebrows; sentence case; violet only for primary/active elements; no em dashes in visible copy.
- Third-party service logos come from Simple Icons, in each brand's official colour.

## Evidence on Hand
- Live product catalog from the API (names, logos, categories, prices).
- No testimonials, customer counts, ratings totals or press exist to quote; don't invent them.
- Hero mockup photo (hand holding a phone, transparent background) will be supplied by the owner; a same-size placeholder stands in until then.

## Product Principles
1. The shortest path from "I want this service" to paying for it.
2. Prices in Naira, stated plainly.
3. Say only what is true about delivery and support.
4. A real person is reachable (WhatsApp) at every step.
