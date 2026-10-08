#!/usr/bin/env node
/*
 * BUYSUB — fixture API for UI verification
 * =========================================
 *
 * A dependency-free stand-in for the Workers API, used only to verify UI work.
 * It exists because the authenticated surfaces (/dashboard, /admin,
 * /partners/dashboard) redirect to /login on 401, so they cannot be inspected
 * with a fake session against the real API.
 *
 * Pointing the app at a *dead* host also avoids the redirect, but then every
 * list renders its empty state — no rows, no amounts, no modals. A money-colour
 * bug shipped in Phase 2 for exactly that reason. Verify against populated data.
 *
 *   node scripts/fixture-api.js
 *   NEXT_PUBLIC_API_BASE=http://127.0.0.1:8787 \
 *   NEXT_PUBLIC_API_URL=http://127.0.0.1:8787 npm run build
 *   npm run start
 *
 * BOTH names are required. The app reads NEXT_PUBLIC_API_URL in lib/api.ts and
 * the two admin surfaces, NEXT_PUBLIC_API_BASE everywhere else. Setting only
 * one leaves part of the app talking to production while you measure the rest —
 * /order/verify goes through lib/api.ts, so API_BASE alone sends the real
 * payment-verification call to the live Worker.
 *
 * Then seed a session in the browser console (any non-empty token works — this
 * server never checks Authorization):
 *
 *   localStorage.setItem('sb-fixture-auth-token', JSON.stringify({
 *     access_token: 'fixture',
 *     expires_at: Math.floor(Date.now()/1000) + 86400,
 *     user: { id: 'fixture-user', email: 'ada.okonkwo@example.com' },
 *   }))
 *
 * ALWAYS rebuild without NEXT_PUBLIC_API_BASE before committing, and confirm:
 *   grep -rho "127\.0\.0\.1:8787" .next/static/chunks/app/<route>/*.js
 *
 * Variants (singular endpoints that cannot show two states at once):
 *   FIXTURE_PROFILE=nameless   full_name is empty, so anything deriving a
 *                              display name falls back to the email address
 *   FIXTURE_WALLET=zero        wallet balance is 0
 *   FIXTURE_PARTNER=pending    partner status: approved (default) | pending |
 *                              rejected | none. `none` returns no profile, which
 *                              is the "No partner profile" branch.
 *   FIXTURE_VERIFY=failed      /v2/pay/verify outcome: verified (default) | failed
 *   FIXTURE_BANNER=short       AppShell's banner message: long (default) | short
 *   FIXTURE_MAINTENANCE=on     /v2/status reports maintenance mode (the storefront
 *                              shows the maintenance page; /admin does not)
 *   FIXTURE_SERVICES=off       /v2/status reports Paystack, WhatsApp, wallet and
 *                              partner applications switched off
 *   PORT=9001                  listen elsewhere
 *
 * The list endpoints always carry their awkward cases inline: a very long
 * product name, a very large amount, a zero amount, and one order per status
 * including rejected_pending (live in the DB, absent from the API's
 * OrderStatus union — see the workspace CLAUDE.md).
 */

const http = require('http')

const PORT = Number(process.env.PORT || 8787)
const NAMELESS = process.env.FIXTURE_PROFILE === 'nameless'
const ZERO_WALLET = process.env.FIXTURE_WALLET === 'zero'
const PARTNER = process.env.FIXTURE_PARTNER || 'approved'
const VERIFY_OK = process.env.FIXTURE_VERIFY !== 'failed'
const SHORT_BANNER = process.env.FIXTURE_BANNER === 'short'
const MAINTENANCE = process.env.FIXTURE_MAINTENANCE === 'on'
const SERVICES_ON = process.env.FIXTURE_SERVICES !== 'off'

// ── awkward values, kept in one place so they are easy to reuse ──────────
const LONG_NAME =
  'Adobe Creative Cloud All Apps with Firefly Premium, Extra Seat and 1TB Cloud Storage (Annual, Prepaid)'
const HUGE = 9876543   // digit grouping + layout pressure
const TINY = 0

// AppShell's banner is a single-line bar, so length is its awkward axis and
// this is the value that applies pressure to it. Long is the DEFAULT, not a
// variant: the short message that used to be seeded here fits inside 360px
// uncut, so the fixture rendered the one case the bar already handled and the
// clipping bug lived outside it. Seventh time a fixture gap has hidden a
// screen on this refactor. Use FIXTURE_BANNER=short for the one-line case.
const LONG_BANNER =
  'Scheduled maintenance: checkout may be briefly unavailable on Sunday ' +
  '02:00-04:00 WAT while we migrate the payment provider. Orders already paid ' +
  'for are unaffected and no action is needed on your part.'

// ── customer fixtures ───────────────────────────────────────────────────
// One order per status the UI can encounter, including rejected_pending.
// Shaped like GET /v2/me/orders since the account rebuild: items carry
// product_id, duration_months, billing_type and the joined product (slug,
// domain), and paid orders carry paid_at, so /account can derive
// subscription end dates. Dates are relative to 2026-10-06 so that one plan
// is active, one ends within 7 days and one has ended.
const item = (product_name, billing_period, months, quantity, unit, slug, domain, extra = {}) => ({
  id: `oi-${slug}-${billing_period}`, product_id: `p-${slug}`, product_name, category: null,
  billing_period, billing_type: months ? 'subscription' : 'one_time', duration_months: months,
  quantity, unit_price_ngn: unit, total_price_ngn: unit * quantity,
  products: { slug, domain, image_url: null }, ...extra,
})
const ORDERS = [
  {
    id: 'o-wallet', order_ref: 'BS-2026-G6T84', status: 'paid',
    total_ngn: 0, subtotal_ngn: 263000, discount_ngn: 49970, wallet_ngn: 213030,
    payment_method: 'wallet', currency: 'NGN', fx_rate: 1, discount_code: null,
    created_at: '2026-10-07T22:04:00Z', paid_at: '2026-10-07T22:04:01Z',
    order_items: [item('Netflix Premium', 'Annual', 12, 1, 263000, 'netflix-premium', 'netflix.com')],
  },
  {
    id: 'o-recent', order_ref: 'BS-24301', status: 'paid',
    total_ngn: 18500, subtotal_ngn: 18500, discount_ngn: 0, wallet_ngn: 0,
    payment_method: 'paystack', currency: 'NGN', fx_rate: 1, discount_code: null,
    created_at: '2026-09-21T09:40:00Z', paid_at: '2026-09-21T09:42:00Z',
    order_items: [item('Netflix Premium', 'Quarterly', 3, 1, 18500, 'netflix-premium', 'netflix.com')],
  },
  {
    id: 'o-paid', order_ref: 'BS-24118', status: 'paid',
    total_ngn: 62700, subtotal_ngn: 68000, discount_ngn: 5300, wallet_ngn: 0,
    payment_method: 'paystack', currency: 'NGN', fx_rate: 1, discount_code: 'AUGUST10',
    created_at: '2026-07-28T10:14:00Z', paid_at: '2026-07-28T10:16:00Z',
    order_items: [
      item(LONG_NAME, 'Annual', 12, 1, 45000, 'adobe-cc', 'adobe.com'),
      item('Apple Music', 'Quarterly', 3, 2, 11500, 'apple-music', 'apple.com'),
    ],
  },
  {
    id: 'o-ending', order_ref: 'BS-24002', status: 'paid',
    total_ngn: 6900, subtotal_ngn: 6900, discount_ngn: 0, wallet_ngn: 0,
    payment_method: 'paystack', currency: 'NGN', fx_rate: 1, discount_code: null,
    created_at: '2026-07-10T18:05:00Z', paid_at: '2026-07-10T18:06:00Z',
    order_items: [item('Spotify Duo', 'Quarterly', 3, 1, 6900, 'spotify-duo', 'spotify.com')],
  },
  {
    id: 'o-approved', order_ref: 'BS-24090', status: 'approved',
    total_ngn: HUGE, subtotal_ngn: HUGE, discount_ngn: 0,
    payment_method: 'bank_transfer', currency: 'NGN',
    created_at: '2026-07-25T14:03:00Z',
    order_items: [item('Enterprise bundle, 40 seats', 'Annual', 12, 40, HUGE / 40, 'enterprise', null)],
  },
  {
    id: 'o-pending-manual', order_ref: 'BS-23904', status: 'pending_manual',
    total_ngn: 100500, subtotal_ngn: 100500, discount_ngn: 0,
    payment_method: 'whatsapp', currency: 'NGN',
    created_at: '2026-07-19T08:02:00Z',
    order_items: [item('Netflix Premium', 'Annual', 12, 1, 100500, 'netflix-premium', 'netflix.com')],
  },
  {
    id: 'o-pending', order_ref: 'BS-23880', status: 'pending',
    total_ngn: 18000, subtotal_ngn: 18000, discount_ngn: 0,
    payment_method: 'paystack', currency: 'NGN',
    created_at: '2026-07-17T19:47:00Z', order_items: [],
  },
  {
    id: 'o-expired', order_ref: 'BS-22650', status: 'paid',
    total_ngn: 15000, subtotal_ngn: 15000, discount_ngn: 0,
    payment_method: 'paystack', currency: 'NGN',
    created_at: '2026-03-02T12:00:00Z', paid_at: '2026-03-02T12:01:00Z',
    order_items: [
      item('YouTube Premium Family', 'Quarterly', 3, 1, 15000, 'youtube-premium', 'youtube.com'),
      item('Steam Wallet Top-up', 'Quarterly', null, 1, 0, 'steam-wallet', 'steampowered.com'),
    ],
  },
  {
    id: 'o-rejected-pending', order_ref: 'BS-23812', status: 'rejected_pending',
    total_ngn: 7500, subtotal_ngn: 7500, discount_ngn: 0,
    payment_method: 'whatsapp', currency: 'NGN',
    created_at: '2026-07-08T11:26:00Z',
    order_items: [item('Spotify Duo', 'Quarterly', 3, 1, 7500, 'spotify-duo', 'spotify.com')],
  },
  {
    id: 'o-rejected', order_ref: 'BS-23790', status: 'rejected',
    total_ngn: 4200, subtotal_ngn: 4200, discount_ngn: 0,
    payment_method: 'whatsapp', currency: 'NGN',
    created_at: '2026-07-02T13:09:00Z', order_items: [],
  },
  {
    id: 'o-cancelled', order_ref: 'BS-23771', status: 'cancelled',
    total_ngn: TINY, subtotal_ngn: 14250, discount_ngn: 14250,
    payment_method: 'paystack', currency: 'NGN',
    created_at: '2026-06-30T16:41:00Z', order_items: [],
  },
]

const MY_BUCKETS = {
  processing: ['pending', 'pending_manual', 'rejected_pending'],
  completed: ['paid'],
  cancelled: ['failed', 'refunded', 'cancelled', 'rejected'],
}

const MESSAGES = [
  {
    id: 'm-unread', subject: 'Your Netflix Premium login is ready',
    product_name: 'Netflix Premium', product_domain: 'netflix.com',
    body: 'Email: shared.acct@buysub.ng\nPassword: correct-horse-battery\nProfile: Slot 3\n\nDo not change the password or the household settings.',
    is_read: false, created_at: '2026-07-28T11:00:00Z',
    expires_at: '2027-07-28T11:00:00Z',
  },
  {
    id: 'm-long', subject: LONG_NAME,
    product_name: LONG_NAME, product_domain: 'adobe.com',
    body: 'Your plan renews on 28 October 2026. Reply here if the seat has not appeared in your Adobe account within 24 hours.',
    is_read: true, created_at: '2026-07-12T09:30:00Z', expires_at: null,
  },
  {
    id: 'm-nodomain', subject: 'Scheduled maintenance on 2 August',
    product_name: null, product_domain: null,
    body: 'Wallet top-ups will be paused between 01:00 and 03:00 WAT.',
    is_read: true, created_at: '2026-07-01T07:15:00Z', expires_at: null,
  },
]

const TXNS = [
  { id: 't-large',  type: 'credit', amount_ngn: HUGE, source: 'admin_topup', reference: 'admin_topup', note: 'Enterprise prepayment', created_at: '2026-07-26T09:00:00Z' },
  { id: 't-refund', type: 'credit', amount_ngn: 5300, source: 'refund', reference: 'refund', note: 'Order BS-23904 partial refund', created_at: '2026-07-20T12:00:00Z' },
  { id: 't-debit',  type: 'debit',  amount_ngn: 2000, source: 'order', reference: null, note: null, created_at: '2026-07-18T15:20:00Z' },
  // amount_ngn arrives as a string from some paths — the UI coerces with Number()
  { id: 't-string', type: 'credit', amount_ngn: '1500.50', source: 'promotion', reference: 'promotion', note: 'Referral bonus', created_at: '2026-07-05T10:10:00Z' },
  { id: 't-zero',   type: 'credit', amount_ngn: TINY, source: 'compensation', reference: 'compensation', note: 'Goodwill adjustment, no value', created_at: '2026-07-03T08:00:00Z' },
]

// role drives the site header's account menu (Admin console link for staff).
// FIXTURE_ROLE=admin to see it.
const PROFILE = {
  id: 'fixture-user',
  role: process.env.FIXTURE_ROLE || 'customer',
  full_name: NAMELESS ? '' : 'Ada Okonkwo',
  phone: '08031229041',
  email: 'ada.okonkwo@example.com',
  avatar_url: null,
}

// app/partners/dashboard/page.tsx reads j.data.profile and j.data.affiliate,
// NOT a flat profile — returning the flat shape renders the "No partner
// profile" branch and every measurement is of the wrong screen.
const PARTNER_STATUS = {
  approved: 'approved',
  pending: 'pending_review',
  rejected: 'rejected',
}[PARTNER] || 'approved'

const PARTNER_PROFILE = PARTNER === 'none' ? null : {
  id: 'p-1',
  legal_name: 'Okonkwo Digital Ltd',
  store_name: 'Okonkwo Digital',
  status: PARTNER_STATUS,
  reviewer_notes: PARTNER === 'rejected'
    ? 'CAC registration could not be verified against the number supplied.'
    : null,
  business_email: 'partners@okonkwodigital.example',
  business_phone: '08031229041',
  alternate_phone: '',
  owner_name: NAMELESS ? '' : 'Ada Okonkwo',
  owner_email: 'ada.okonkwo@example.com',
  owner_phone: '08031229042',
  owner_location: 'Yaba, Lagos',
  contact_method: 'WhatsApp',
  address: '14 Herbert Macaulay Way, Sabo',
  lga: 'Lagos Mainland',
  state: 'Lagos',
  payout_frequency: 'Monthly',
  payout_method: 'Bank Transfer',
  bank_name: 'Guaranty Trust Bank',
  account_name: 'Okonkwo Digital Ltd',
  account_number: '0123456789',
  crypto_token: '', crypto_chain: '', wallet_address: '',
  social_media: 'Instagram: @okonkwodigital',
}

// Only an approved partner has an affiliate record.
const PARTNER_AFFILIATE = PARTNER === 'approved' ? {
  id: 'aff-1',
  referral_code: 'OKONKWO-DIGITAL-2026',   // long enough to test wrapping
  status: 'active',
  display_name: 'Okonkwo Digital',
  commission_rate: 10,
} : null

// The /partner portal adds approved_ngn, commission_rate and a 30-day daily
// series (see handlePartnerMyStats). Deterministic numbers with a few quiet
// days, so the chart shows real variation and real zeros.
const DAILY = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 8, 7 + i)).toISOString().slice(0, 10)
  const clicks = [12, 30, 0, 44, 18, 9, 61, 25, 33, 0, 14, 52, 70, 41, 22, 8, 0, 37, 46, 29, 55, 88, 64, 31, 19, 40, 73, 26, 12, 49][i]
  const conversions = clicks > 50 ? 2 : clicks > 30 ? 1 : 0
  return { date: d, clicks, conversions, earned_ngn: conversions * 1850 }
})
const PARTNER_STATS = {
  affiliate_id: PARTNER_AFFILIATE ? 'aff-1' : null,
  clicks: 4820,
  conversions: 0,          // a zero next to a large number
  earnings_ngn: HUGE,
  pending_ngn: 47500,
  approved_ngn: 12300,
  commission_rate: 10,
  daily: DAILY,
}

const COMMISSIONS = [
  { id: 'c1', amount_ngn: 1850, status: 'pending', created_at: '2026-10-04T13:10:00Z', orders: { order_ref: 'BS-24310', total_ngn: 18500, created_at: '2026-10-04T13:09:00Z' } },
  { id: 'c2', amount_ngn: 6270, status: 'approved', created_at: '2026-09-28T09:41:00Z', orders: { order_ref: 'BS-24277', total_ngn: 62700, created_at: '2026-09-28T09:40:00Z' } },
  { id: 'c3', amount_ngn: 690, status: 'paid', paid_at: '2026-09-30T10:00:00Z', created_at: '2026-09-12T18:00:00Z', orders: { order_ref: 'BS-24190', total_ngn: 6900, created_at: '2026-09-12T17:58:00Z' } },
  { id: 'c4', amount_ngn: 1500, status: 'rejected', created_at: '2026-09-02T08:00:00Z', orders: { order_ref: 'BS-24133', total_ngn: 15000, created_at: '2026-09-02T07:59:00Z' } },
  { id: 'c5', amount_ngn: 10050, status: 'paid', paid_at: '2026-08-31T10:00:00Z', created_at: '2026-08-19T12:00:00Z', orders: { order_ref: 'BS-23990', total_ngn: 100500, created_at: '2026-08-19T11:58:00Z' } },
]

// ── storefront fixtures (Phase 12) ──────────────────────────────────────
// /v2/products, /v2/ads and /v2/discount/auto-apply all fell through to the
// catch-all until Phase 12, so /shop rendered an empty storefront: no cards,
// no cart, and therefore no cart drawer — the exact seam Phase 12 had to
// compare the restyled navbar against. Fourth time a fixture gap has hidden a
// screen, after Phase 4, Phase 6 and Phase 7.
//
// Shapes taken from the fields the components actually read, not the ones that
// sound right: PERIODS maps period keys to price_3m / price_6m / price_1y
// (there is no price_1m period, though the column exists), isInStock() tests
// stock_status as a string, and getCategoryList() splits `category` on commas,
// so multi-category rows have to be comma-joined to reach more than one tab.
//
// NOTE when verifying: Marketplace caches this list in sessionStorage under
// PRODUCT_CACHE_KEY. Clear it between fixture changes or the page keeps
// rendering the previous run's rows.
const PRODUCTS = [
  { id: 'p-netflix', name: 'Netflix Premium', slug: 'netflix-premium',
    category: 'video streaming', description: 'Four screens in 4K HDR.',
    short_description: 'Four screens, 4K HDR', category_tagline: 'Streaming',
    price_1m: 6500, price_3m: 18500, price_6m: 35000, price_1y: 66000,
    billing_type: 'subscription', billing_period: 'monthly',
    tags: 'popular', domain: 'netflix.com',
    stock_status: 'in_stock', status: 'active', image_url: null, sort_order: 1,
    // Product-page content (migration 07): one fully-populated product so the
    // features, steps, FAQ, delivery and badge blocks all render.
    featured: true, badge: 'Best seller',
    delivery_time: 'Within 1 hour', delivery_method: 'Profile on a shared account, by WhatsApp',
    region: 'Nigeria',
    features: ['4 screens at once', 'Ultra HD and HDR', 'Downloads on 6 devices', 'Your own profile and PIN'],
    how_it_works: ['Pick a plan and pay.', 'We add your profile within the hour.', 'Log in with the details we send on WhatsApp.'],
    faqs: [
      { q: 'Can I change my profile name?', a: 'Yes. Your profile is yours to rename and lock with a PIN.' },
      { q: 'What happens when my plan ends?', a: 'Access stops at the end of the period. Renew from your account to keep watching.' },
    ],
    seo_title: 'Netflix Premium in Naira · BuySub', seo_description: 'Netflix Premium 4K, paid in Naira.',
    // Volume discounts (migration 19).
    volume_tiers: [{ min_qty: 3, percent: 5 }, { min_qty: 5, percent: 10 }] },
  { id: 'p-spotify', name: 'Spotify Duo', slug: 'spotify-duo',
    category: 'music streaming', description: 'Two premium accounts.',
    short_description: 'Two premium accounts', category_tagline: 'Music',
    price_1m: 2400, price_3m: 6900, price_6m: 13200, price_1y: 24500,
    billing_type: 'subscription', billing_period: 'monthly',
    tags: null, domain: 'spotify.com',
    stock_status: 'in_stock', status: 'active', image_url: null, sort_order: 2 },
  // Multi-category: reachable from both `ai` and `productivity`.
  { id: 'p-claude', name: 'Claude Pro', slug: 'claude-pro',
    category: 'ai, productivity', description: 'Higher limits and priority access.',
    short_description: 'Higher limits, priority access', category_tagline: 'AI',
    price_1m: 32000, price_3m: 92000, price_6m: 178000, price_1y: 338000,
    billing_type: 'subscription', billing_period: 'monthly',
    tags: 'new', domain: 'claude.ai',
    stock_status: 'in_stock', status: 'active', image_url: null, sort_order: 3 },
  // Out of stock, so the card's unavailable branch renders.
  { id: 'p-nord', name: 'NordVPN Plus', slug: 'nordvpn-plus',
    category: 'security', description: 'VPN with threat protection.',
    short_description: 'VPN with threat protection', category_tagline: 'Security',
    price_1m: 4200, price_3m: 11800, price_6m: 21500, price_1y: 38900,
    billing_type: 'subscription', billing_period: 'monthly',
    tags: null, domain: 'nordvpn.com',
    stock_status: 'out_of_stock', status: 'active', image_url: null, sort_order: 4 },
  // Layout pressure: the 101-character name, and a price in the millions.
  { id: 'p-adobe', name: LONG_NAME, slug: 'adobe-creative-cloud',
    category: 'productivity', description: 'Every Adobe app, one plan.',
    short_description: 'Every Adobe app, one plan', category_tagline: 'Creative',
    price_1m: 74000, price_3m: 219000, price_6m: 428000, price_1y: HUGE,
    billing_type: 'subscription', billing_period: 'monthly',
    tags: null, domain: 'adobe.com',
    stock_status: 'in_stock', status: 'active', image_url: null, sort_order: 5 },
  // One-time, and the only row with a period price missing — the card has to
  // cope with a null where PERIODS expects a number.
  { id: 'p-steam', name: 'Steam Wallet Top-up', slug: 'steam-wallet',
    category: 'gaming, coins',
    description: 'Credit applied straight to your Steam wallet, in your account’s own currency.\n\nUse it on games, DLC, the Community Market or gifts. Credit doesn’t expire.',
    // "How it works" as paragraphs (one entry): the prose form.
    how_it_works: ['After payment we top up the Steam account you give us at checkout, usually within the hour. You don’t share your password: we only need the account name.\n\nThe credit shows in your Steam wallet as soon as it lands, and we send a WhatsApp message with the receipt.'],
    short_description: 'Credit for your Steam wallet', category_tagline: 'Gaming',
    price_1m: null, price_3m: 15000, price_6m: null, price_1y: null,
    billing_type: 'one_time', billing_period: null,
    tags: null, domain: 'steampowered.com',
    stock_status: 'in_stock', status: 'active', image_url: null, sort_order: 6 },
  // In stock but no price for any period, like 36 live products in Oct 2026.
  // It used to render ₦0 with a working Add to cart; it must read unavailable.
  { id: 'p-applemusic', name: 'Apple Music Individual', slug: 'apple-music-individual',
    category: 'music streaming', description: 'Over 100 million songs, ad-free.',
    short_description: '100M songs, ad-free', category_tagline: 'Music',
    price_1m: null, price_3m: null, price_6m: null, price_1y: null,
    billing_type: 'subscription', billing_period: 'monthly',
    tags: null, domain: 'apple.com',
    stock_status: 'in_stock', status: 'active', image_url: null, sort_order: 6 },
  // On snapchat.com so the home marquee shows its Snapchat tile, the one
  // brand drawn with an outline (white ghost, black stroke).
  { id: 'p-snapchat', name: 'Snapchat+', slug: 'snapchat-plus',
    category: 'social', description: 'Snapchat+ subscription.',
    short_description: 'Early features', category_tagline: 'Social',
    price_1m: 2500, price_3m: 7000, price_6m: null, price_1y: 26000,
    billing_type: 'subscription', billing_period: 'monthly',
    tags: null, domain: 'snapchat.com',
    stock_status: 'in_stock', status: 'active', image_url: null, sort_order: 7 },
  // ── Rows 7-10 exist to make SponsoredProductCard reachable ─────────────
  // Marketplace calls interleaveAds(visible, sponsoredCards, 8), which inserts
  // an ad only after every 8th product. At six rows the modulo never fires, so
  // the sponsored card had never rendered — the sixth fixture gap, found in
  // Phase 13. Keep this list at nine or more or that component goes dark again.
  { id: 'p-yt', name: 'YouTube Premium Family', slug: 'youtube-premium-family',
    category: 'video streaming', description: 'Ad-free for up to five members.',
    short_description: 'Ad-free for five', category_tagline: 'Streaming',
    price_1m: 7200, price_3m: 21500, price_6m: 41000, price_1y: 78000,
    billing_type: 'subscription', billing_period: 'monthly',
    tags: null, domain: 'youtube.com',
    stock_status: 'in_stock', status: 'active', image_url: null, sort_order: 7 },
  { id: 'p-notion', name: 'Notion Plus', slug: 'notion-plus',
    category: 'productivity', description: 'Unlimited blocks and file uploads.',
    short_description: 'Unlimited blocks', category_tagline: 'Productivity',
    price_1m: 8400, price_3m: 24000, price_6m: 46000, price_1y: 88000,
    billing_type: 'subscription', billing_period: 'monthly',
    tags: null, domain: 'notion.so',
    stock_status: 'in_stock', status: 'active', image_url: null, sort_order: 8 },
  { id: 'p-duo', name: 'Duolingo Super', slug: 'duolingo-super',
    category: 'education', description: 'No ads and unlimited hearts.',
    short_description: 'No ads, unlimited hearts', category_tagline: 'Education',
    price_1m: 5100, price_3m: 14500, price_6m: 27500, price_1y: 52000,
    billing_type: 'subscription', billing_period: 'monthly',
    tags: null, domain: 'duolingo.com',
    stock_status: 'in_stock', status: 'active', image_url: null, sort_order: 9 },
  { id: 'p-icloud', name: 'iCloud+ 2TB', slug: 'icloud-plus-2tb',
    category: 'cloud', description: 'Two terabytes with Private Relay.',
    short_description: '2TB with Private Relay', category_tagline: 'Cloud',
    price_1m: 4800, price_3m: 13800, price_6m: 26400, price_1y: 50000,
    billing_type: 'subscription', billing_period: 'monthly',
    tags: null, domain: 'icloud.com',
    stock_status: 'in_stock', status: 'active', image_url: null, sort_order: 10 },
]

// Ads occupy the storefront the navbar is measured against, so they have to be
// on screen even though ShopAds.tsx itself is Phase 13. One row per placement
// ShopAds requests; the banner carries two so its 6s rotation is exercised.
const SHOP_ADS = [
  { id: 'ad-b1', title: 'Renew before September and keep the old rate',
    image_url: 'https://picsum.photos/seed/buysub-ad-banner-1/1200/300',
    link: 'https://buysub.ng', placement: 'shop_banner', ad_type: 'image',
    card_name: null, card_category: null, card_price: null, card_badge: null, weight: 10 },
  { id: 'ad-b2', title: 'Wallet top-ups now clear instantly',
    image_url: 'https://picsum.photos/seed/buysub-ad-banner-2/1200/300',
    link: 'https://buysub.ng', placement: 'shop_banner', ad_type: 'image',
    card_name: null, card_category: null, card_price: null, card_badge: null, weight: 5 },
  { id: 'ad-s1', title: 'Partner programme',
    image_url: 'https://picsum.photos/seed/buysub-ad-side-1/400/600',
    link: '/partners', placement: 'shop_sidebar', ad_type: 'image',
    card_name: null, card_category: null, card_price: null, card_badge: null, weight: 8 },
  { id: 'ad-c1', title: 'YouTube Premium Family',
    image_url: 'https://picsum.photos/seed/buysub-ad-card-1/600/600',
    link: 'https://buysub.ng', placement: 'shop_product_card', ad_type: 'card',
    card_name: 'YouTube Premium Family', card_category: 'video streaming',
    card_price: '₦21,500', card_badge: 'Sponsored', weight: 6 },
]

// Auto-applied so the cart drawer renders its discount row without anyone
// typing a code. site_wide with no include/exclude lists, so isItemEligible()
// passes every line; min_order_ngn is low enough that a single item clears it.
const AUTO_DISCOUNT = {
  code: 'AUGUST10',
  type: 'percentage',
  value: 10,
  display: '10% off',
  max_discount_ngn: 20000,
  min_order_ngn: 5000,
  included_products: null, excluded_products: null,
  included_categories: null, excluded_categories: null,
  is_auto_apply: true, scope: 'site_wide', is_exclusive: false,
}

// ── admin fixtures ──────────────────────────────────────────────────────
// Only /v2/admin/stats is filled in; it is the one admin shape verified so
// far. The list endpoints return a correctly-shaped empty page. Fill these in
// at Phase 6, when each tab's row shape has actually been read.
const ADMIN_STATS = {
  payouts_pending: 2, support_waiting: 2,
  revenue_today: 184500, revenue_this_month: 4820750, total_revenue: 61944210,
  orders_today: 12, orders_pending_manual: 3,
  products_active: 268, products_total: 275,
  customers_total: 1841, partners_pending: 2,
  top_products: [
    { name: LONG_NAME, order_count: 214, revenue: HUGE },
    { name: 'Netflix Premium', order_count: 198, revenue: 3120400 },
    { name: 'Spotify Duo', order_count: 87, revenue: 402150 },
  ],
  recent_orders: ORDERS.slice(0, 5).map(o => ({
    order_ref: o.order_ref, status: o.status, total_ngn: o.total_ngn,
    customer_name: NAMELESS ? '' : 'Ada Okonkwo',
    customer_email: 'ada.okonkwo@example.com', created_at: o.created_at,
  })),
  revenue_by_day: Array.from({ length: 30 }, (_, i) => ({
    day: new Date(Date.UTC(2026, 6, i + 1)).toISOString().slice(0, 10),
    revenue: [0, 12000, 48000, 155000, 91000][i % 5],
  })),
}

const page = (rows = []) => ({
  ok: true, data: rows,
  meta: { pagination: { page: 1, limit: 20, total: rows.length, pages: rows.length ? 1 : 0 } },
})

// ── admin row shapes ────────────────────────────────────────────────────
// The same orders the customer sees, plus the identity columns admin renders.
// Deliberately keeps one row per status, including rejected_pending, since
// that is the whole point of measuring badges against this fixture.
const ADMIN_BUYERS = [
  { customer_name: 'Ada Okonkwo',        customer_email: 'ada.okonkwo@example.com' },
  { customer_name: 'Chidi Balogun-Eze',  customer_email: 'c.balogun@example.com' },
  { customer_name: '',                   customer_email: 'no.name@example.com' },
  { customer_name: 'Funmilayo Adewale',  customer_email: 'funmi@example.com' },
  { customer_name: 'Emeka Nwosu',        customer_email: 'emeka.n@example.com' },
  { customer_name: 'Zainab Abdulkareem', customer_email: 'zainab.a@example.com' },
  { customer_name: 'Tobi Aluko',         customer_email: 'tobi@example.com' },
]
const ADMIN_ORDERS = ORDERS.map((o, i) => ({ ...o, ...ADMIN_BUYERS[i % ADMIN_BUYERS.length] }))

const ADMIN_CUSTOMERS = ADMIN_BUYERS.map((b, i) => ({
  id: `c-${i}`,
  name: b.customer_name,
  email: b.customer_email,
  phone: ['+234 803 412 8871', '+234 701 553 2094', '', '+234 812 660 4417'][i % 4],
  category: ['retail', 'reseller', 'retail', 'corporate'][i % 4],
  source: ['whatsapp', 'organic', 'referral', 'organic'][i % 4],
  // Both states, so is_active -> Badge active/hidden paints both families.
  is_active: i % 3 !== 2,
  created_at: `2026-0${(i % 7) + 1}-1${i % 9}T09:00:00Z`,
}))

// `status` and `stock_status` are SEPARATE fields, and ProductsTab reads both:
//   isHidden = p.status !== 'active'
//   isOOS    = p.stock_status !== 'in_stock'
// An earlier version of this fixture put stock values in `status`, so every
// card took the isHidden branch and the visible-product styling was never
// rendered. Keep one row per combination, and at least one `featured`, or the
// featured ribbon never mounts and cannot be measured.
const ADMIN_PRODUCTS = [
  { id: 'p-1', name: LONG_NAME, category: 'video streaming',
    status: 'active', stock_status: 'in_stock', featured: true,
    price_3m: 14000, price_6m: 26000, price_1y: 45000, domain: 'netflix.com' },
  { id: 'p-2', name: 'Apple Music', category: 'music streaming',
    status: 'active', stock_status: 'out_of_stock', featured: false,
    price_3m: 11500, price_6m: 21000, price_1y: 38000, domain: 'apple.com' },
  { id: 'p-3', name: 'Enterprise bundle, 40 seats', category: 'bundles',
    status: 'hidden', stock_status: 'in_stock', featured: false,
    price_3m: 0, price_6m: 0, price_1y: HUGE, domain: 'buysub.ng' },
  { id: 'p-4', name: 'Spotify Duo', category: 'music streaming',
    status: 'active', stock_status: 'in_stock', featured: true,
    price_3m: 7500, price_6m: 14000, price_1y: 25000, domain: 'spotify.com' },
]

// Partner applications. PartnersTab reads legal_name / store_name / owner_* /
// business_* / cac_number / address / lga / state / gender / status, and
// filters by status, so keep one row per status the approve/reject flow can
// produce.
const ADMIN_PARTNERS = ['pending', 'approved', 'rejected'].map((status, i) => ({
  id: `pt-${i}`,
  status,
  legal_name: ['Adaeze Ventures Ltd', 'Kolawole Digital Enterprises', 'Ifeanyi Stores'][i],
  store_name: ['Adaeze Subs', 'KD Subs', 'Ifeanyi Digital'][i],
  owner_name: ['Adaeze Nwachukwu', 'Kolawole Ogunlesi', 'Ifeanyi Okafor'][i],
  owner_email: ['adaeze@example.com', 'kolawole@example.com', 'ifeanyi@example.com'][i],
  owner_phone: ['+234 802 331 7742', '+234 809 118 2260', '+234 703 994 5518'][i],
  business_email: ['hello@adaezesubs.ng', 'support@kdsubs.ng', ''][i],
  business_phone: ['+234 1 271 0044', '', '+234 1 460 2210'][i],
  cac_number: ['RC-1842771', 'RC-2290418', ''][i],
  address: ['14 Adeola Odeku St', '3 Ring Road', '88 New Market Rd'][i],
  lga: ['Eti-Osa', 'Ibadan North', 'Onitsha North'][i],
  state: ['Lagos', 'Oyo', 'Anambra'][i],
  gender: ['female', 'male', 'male'][i],
  created_at: `2026-0${i + 4}-1${i}T09:20:00Z`,
}))

const ADMIN_AFFILIATES = ['active', 'pending', 'suspended'].map((status, i) => ({
  id: `af-${i}`,
  status,
  business_name: ['Adaeze Subs', 'KD Subs', 'Ifeanyi Digital'][i],
  store_name: ['Adaeze Subs', 'KD Subs', 'Ifeanyi Digital'][i],
  referral_code: ['ADAEZE10', 'KDSUBS', 'IFY2026'][i],
  commission_rate: [7.5, 5, 10][i],
  click_count: [412, 0, 1837][i],
  created_at: `2026-0${i + 3}-0${i + 2}T11:00:00Z`,
}))

// Short links. LinkRowCard reads slug / destination_url / active / click_count
// / click_limit / expires_at / has_password / cloak / hide_referrer /
// deep_link_* / tags / qr_config. Keep one row per feature badge and one per
// degraded state (expired, limit reached, inactive), or those branches never
// render — LinkRowCard's border and badge logic keys off exactly these.
const ADMIN_LINKS = [
  { id: 'ln-1', slug: 'blackfriday', destination_url: 'https://buysub.ng/shop?utm_campaign=bf',
    active: true, click_count: 1284, click_limit: null, expires_at: null,
    has_password: false, cloak: false, hide_referrer: false,
    deep_link_ios: null, deep_link_android: null, tags: ['campaign'],
    qr_config: { fg: '#000000', bg: '#ffffff', ecc: 'M' } },
  { id: 'ln-2', slug: 'vip-access', destination_url: 'https://buysub.ng/vip',
    active: true, click_count: 47, click_limit: 500, expires_at: '2026-12-31T23:59:00Z',
    has_password: true, cloak: true, hide_referrer: true,
    deep_link_ios: 'buysub://vip', deep_link_android: 'buysub://vip', tags: ['vip', 'gated'],
    qr_config: { fg: '#1A1A2E', bg: '#ffffff', ecc: 'H' } },
  { id: 'ln-3', slug: 'expired-promo', destination_url: 'https://buysub.ng/promo',
    active: true, click_count: 903, click_limit: null, expires_at: '2026-01-15T00:00:00Z',
    has_password: false, cloak: false, hide_referrer: false,
    deep_link_ios: null, deep_link_android: null, tags: [],
    qr_config: { fg: '#000000', bg: '#ffffff', ecc: 'M' } },
  { id: 'ln-4', slug: 'capped', destination_url: 'https://buysub.ng/limited',
    active: false, click_count: 200, click_limit: 200, expires_at: null,
    has_password: false, cloak: false, hide_referrer: true,
    deep_link_ios: null, deep_link_android: null, tags: ['retired'],
    qr_config: { fg: '#000000', bg: '#ffffff', ecc: 'L' } },
]

// Targeting rules, so TargetingSection renders populated instead of empty.
const LINK_RULES = [
  { id: 'r-1', link_id: 'ln-2', priority: 1, match_type: 'country', match_value: 'NG', destination_url: 'https://buysub.ng/vip/ng' },
  { id: 'r-2', link_id: 'ln-2', priority: 2, match_type: 'os', match_value: 'ios', destination_url: 'https://buysub.ng/vip/ios' },
]

const CUSTOMER_MESSAGES = [
  { id: 'cm-1', subject: 'Your Netflix renewal', body: 'Renewed through 2027-02-14.', read: true,  created_at: '2026-07-30T10:00:00Z' },
  { id: 'cm-2', subject: 'Wallet top-up received', body: '₦18,300 credited.',          read: false, created_at: '2026-08-01T16:42:00Z' },
]

const ADMIN_ADS = [
  { id: 'ad-1', title: 'Black Friday, up to 40% off', placement: 'shop_top',
    image_url: 'https://picsum.photos/seed/buysub-bf/1200/300',
    active: true,  view_count: 18422, click_count: 1204 },
  { id: 'ad-2', title: 'Refer a friend, earn ₦2,000', placement: 'shop_mid',
    image_url: 'https://picsum.photos/seed/buysub-referral/1200/300',
    active: true,  view_count: 9310,  click_count: 287 },
  // Inactive and zero-traffic, so the dimmed branch and the 0 case both render.
  { id: 'ad-3', title: 'Retired campaign', placement: 'shop_top',
    image_url: 'https://picsum.photos/seed/buysub-retired/1200/300',
    active: false, view_count: 0,     click_count: 0 },
]

// One row per `type` (percentage / fixed) and per scope, plus the awkward
// cases DiscountsTab branches on: an expired code, one at its usage cap, one
// auto-applied, one exclusive, and one with product/category scoping so the
// included_/excluded_ lists are not all null.
const ADMIN_DISCOUNTS = [
  { id: 'dc-1', code: 'BLACKFRIDAY', type: 'percentage', value: 25, active: true,
    auto_apply: true, exclusive: false, scope: 'site_wide',
    min_order_ngn: 10000, max_uses: 500, times_used: 218, max_discount_ngn: 20000,
    active_from: '2026-06-01T00:00:00Z', expires_at: '2026-12-31T23:59:00Z',
    created_at: '2026-05-20T09:00:00Z',
    included_products: null, excluded_products: null,
    included_categories: null, excluded_categories: null },
  { id: 'dc-2', code: 'FLAT5K', type: 'fixed', value: 5000, active: true,
    auto_apply: false, exclusive: true, scope: 'product',
    min_order_ngn: 25000, max_uses: null, times_used: 41, max_discount_ngn: null,
    active_from: null, expires_at: null, created_at: '2026-07-02T14:30:00Z',
    included_products: ['p-1', 'p-4'], excluded_products: null,
    included_categories: null, excluded_categories: ['bundles'] },
  { id: 'dc-3', code: 'EXPIRED10', type: 'percentage', value: 10, active: false,
    auto_apply: false, exclusive: false, scope: 'category',
    min_order_ngn: 0, max_uses: 200, times_used: 200, max_discount_ngn: 3000,
    active_from: '2026-01-01T00:00:00Z', expires_at: '2026-03-31T23:59:00Z',
    created_at: '2025-12-18T08:00:00Z',
    included_products: null, excluded_products: null,
    included_categories: ['music streaming'], excluded_categories: null },
]

// type is toast | banner | modal and each renders a different preview, so one
// row per type. The modal carries `steps` so the multi-step branch renders.
const ADMIN_NOTIFICATIONS = [
  { id: 'nt-1', type: 'toast', audience: 'users',
    title: 'Wallet top-ups are live', message: 'Fund your wallet and check out in one tap.',
    image_url: null, image_position: 'top', steps: null,
    active: true, scheduled_for: null, expires_at: '2026-09-01T00:00:00Z',
    created_at: '2026-07-28T10:00:00Z' },
  { id: 'nt-2', type: 'banner', audience: 'users',
    title: 'Scheduled maintenance', message: 'Checkout may be briefly unavailable on Sunday 02:00-04:00 WAT.',
    image_url: null, image_position: 'top', steps: null,
    active: true, scheduled_for: '2026-08-09T02:00:00Z', expires_at: null,
    created_at: '2026-08-01T12:00:00Z' },
  { id: 'nt-3', type: 'modal', audience: 'admins',
    title: 'New payout flow', message: 'Partner payouts move to the new schedule this month.',
    image_url: 'https://picsum.photos/seed/buysub-payout/800/400', image_position: 'top',
    steps: [
      { title: 'What changed', body: 'Payouts now run weekly on Tuesdays.' },
      { title: 'What you do', body: 'Confirm each partner’s bank details before Monday.' },
      { title: 'Questions', body: 'Reply in the ops channel.' },
    ],
    active: false, scheduled_for: null, expires_at: null,
    created_at: '2026-07-15T16:20:00Z' },
]

const ADMIN_SETTINGS = {
  phone: '+234 810 787 2916',
  receipt_caption: 'Thank you for shopping with BuySub. Keep this receipt for your records.',
  facebook: 'https://facebook.com/buysubng',
  instagram: 'https://instagram.com/buysubng',
  tiktok: 'https://tiktok.com/@buysubng',
  x: 'https://x.com/buysubng',
}

// Rendered by components/AppShell.tsx: one per type, so the toast, the banner
// and the multi-step modal all mount. The modal carries an image_url and three
// steps so the image block, the dot row and the Back/Next path all render.
const SHELL_NOTIFICATIONS = [
  { id: 'sn-toast', type: 'toast', audience: 'users',
    message: 'Wallet top-ups are live. Fund your wallet and check out in one tap.' },
  { id: 'sn-banner', type: 'banner', audience: 'users',
    message: SHORT_BANNER ? 'Free delivery on annual plans until 31 August.' : LONG_BANNER },
  { id: 'sn-modal', type: 'modal', audience: 'users',
    title: 'What changed this month',
    message: 'A short summary lives on the first step.',
    image_url: 'https://picsum.photos/seed/buysub-notif/1280/440',
    steps: [
      { title: 'Wallet top-ups', message: 'Fund a wallet once and check out without re-entering card details.',
        image_url: 'https://picsum.photos/seed/buysub-notif-1/1280/440' },
      { title: 'Faster renewals', message: 'Renewals now confirm in under a minute on Paystack.' },
      { title: 'Partner payouts', message: 'Payouts move to a weekly Tuesday schedule from September.' },
    ] },
  // audience: 'admins' — AppShell must NOT show this on a customer route.
  { id: 'sn-admin-only', type: 'banner', audience: 'admins',
    message: 'Admin-only banner. If this appears on a customer page the audience filter broke.' },
]

// ── extra features (migrations 08-15) ───────────────────────────────────
// Ratings and sold counts: one product with both, one with a rating only, one
// with a single 1-star review, the rest with nothing (most of the catalog).
Object.assign(PRODUCTS[0], { sold_count: 1240, rating_avg: 4.7, rating_count: 86 })
Object.assign(PRODUCTS[1], { sold_count: null, rating_avg: 4.2, rating_count: 9 })
Object.assign(PRODUCTS[2], { sold_count: 58, rating_avg: 1, rating_count: 1 })

// Server-side expiry dates on the paid lines (migration 08), matching what
// lib/subscriptions.ts derives, so both paths agree.
for (const o of ORDERS) {
  if (o.status !== 'paid') continue
  for (const it of o.order_items) {
    if (!it.duration_months || it.billing_type === 'one_time') continue
    const start = new Date(o.paid_at || o.created_at)
    const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + it.duration_months)
    it.starts_at = start.toISOString(); it.expires_at = end.toISOString()
  }
}

const STATUS = {
  maintenance: { enabled: MAINTENANCE, message: MAINTENANCE ? 'We’re upgrading checkout. Back by 2pm.' : '' },
  services: {
    paystack: SERVICES_ON, whatsapp: SERVICES_ON, wallet_pay: SERVICES_ON, wallet_funding: SERVICES_ON,
    partner_applications: SERVICES_ON, reviews: true, referrals: true, payouts: true,
  },
  wallet_funding: { min_ngn: 1000, max_ngn: 500000 },
}

const REVIEWS = [
  { id: 'rv1', rating: 5, body: 'Profile was set up in about 20 minutes. Works on my TV and phone.', display_name: 'Chidi E.', created_at: '2026-10-01T10:00:00Z' },
  { id: 'rv2', rating: 4, body: 'Good value. Took a little over an hour the first time.', display_name: 'Funmi A.', created_at: '2026-09-22T14:00:00Z' },
  { id: 'rv3', rating: 5, body: null, display_name: 'Tunde', created_at: '2026-09-15T08:30:00Z' },
  { id: 'rv4', rating: 2, body: LONG_BANNER, display_name: 'Ngozi O.', created_at: '2026-08-30T19:10:00Z' },
]
const REVIEW_SUMMARY = { average: 4.7, count: 86, distribution: [2, 1, 4, 14, 65] }

const INBOX = [
  { id: 'n1', kind: 'order', title: 'Order BS-24301 confirmed', body: 'Payment received. Your receipt is in your email.', href: '/account/orders/BS-24301', read_at: null, created_at: '2026-10-06T09:42:00Z' },
  { id: 'n2', kind: 'renewal', title: 'Spotify Duo ends on 10 October 2026', body: 'Renew now to keep it running without a gap.', href: '/account/subscriptions?renew=oi-spotify-duo-Quarterly', read_at: null, created_at: '2026-10-03T08:00:00Z' },
  { id: 'n3', kind: 'wallet', title: '₦5,000 added to your wallet', body: 'Your top-up was successful.', href: '/account/wallet', read_at: '2026-09-20T10:00:00Z', created_at: '2026-09-20T09:00:00Z' },
  { id: 'n4', kind: 'referral', title: 'You earned ₦500', body: 'A friend you invited made their first purchase. The reward is in your wallet.', href: '/account/referrals', read_at: '2026-09-11T10:00:00Z', created_at: '2026-09-11T09:00:00Z' },
  { id: 'n5', kind: 'stock', title: 'NordVPN Plus is back in stock', body: null, href: '/shop/nordvpn-plus', read_at: '2026-09-01T10:00:00Z', created_at: '2026-09-01T09:00:00Z' },
]

const REFERRALS = {
  enabled: true, reward_ngn: 500, friend_reward_ngn: 300, min_order_ngn: 2000,
  code: 'BSK7Q2MX', link: 'https://app.buysub.ng/shop?ref=BSK7Q2MX',
  earned_ngn: 1500, referred: 3, pending_orders: 1,
  rewards: [
    { id: 'rr1', friend: 'c•••@gmail.com', amount_ngn: 500, created_at: '2026-09-11T09:00:00Z' },
    { id: 'rr2', friend: 'f•••@yahoo.com', amount_ngn: 500, created_at: '2026-08-24T12:00:00Z' },
    { id: 'rr3', friend: 't•••••@outlook.com', amount_ngn: 500, created_at: '2026-08-02T15:00:00Z' },
  ],
}

// Saved on the account (another device), merged with the browser list on sign-in.
const SAVED = ['p-claude']
// The account's cart (PUT replaces it, like the API), merged with the browser cart on sign-in.
let CART = { items: [{ product_id: 'p-spotify', period: 'quarterly', qty: 1 }], updated_at: '2026-10-06T10:00:00Z' }

const PAYOUTS = {
  enabled: true, min_ngn: 5000, hold_days: 14,
  frequency: 'Quarterly', next_payout_date: '2027-01-01', cutoff_at: '2026-12-17T23:00:00Z',
  next_ngn: 12300, later_ngn: 1850, has_details: true,
  open: [
    { id: 'po3', amount_ngn: 9400, status: 'pending', period_start: '2026-07-01', period_end: '2026-10-01', frequency: 'Quarterly', created_at: '2026-10-01T08:00:00Z', processed_at: null, admin_note: null, reference: null },
  ],
  history: [
    { id: 'po3', amount_ngn: 9400, status: 'pending', period_start: '2026-07-01', period_end: '2026-10-01', frequency: 'Quarterly', created_at: '2026-10-01T08:00:00Z', processed_at: null, admin_note: null, reference: null },
    { id: 'po2', amount_ngn: 10050, status: 'paid', period_start: '2026-04-01', period_end: '2026-07-01', frequency: 'Quarterly', created_at: '2026-07-01T08:00:00Z', processed_at: '2026-07-03T10:00:00Z', admin_note: null, reference: 'TRF-88213' },
    { id: 'po1', amount_ngn: 4200, status: 'rejected', period_start: '2026-01-01', period_end: '2026-04-01', frequency: 'Quarterly', created_at: '2026-04-01T08:00:00Z', processed_at: '2026-04-02T09:00:00Z', admin_note: 'Account name doesn’t match the business name. Update it in your profile', reference: null },
  ],
}
PARTNER_STATS.tier = {
  sales_ngn: 182000,
  current: { name: 'Starter', min_sales_ngn: 0, rate: 0 },
  next: { name: 'Silver', min_sales_ngn: 250000, rate: 7.5, remaining_ngn: 68000 },
  effective_rate: 10,
  tiers: [{ name: 'Starter', min_sales_ngn: 0, rate: 0 }, { name: 'Silver', min_sales_ngn: 250000, rate: 7.5 }, { name: 'Gold', min_sales_ngn: 1000000, rate: 10 }],
}

const ADMIN_FLAGS = {
  maintenance_mode: { enabled: MAINTENANCE, config: { message: 'We will be back shortly.' }, exists: true },
  paystack_checkout: { enabled: true, config: {}, exists: true },
  whatsapp_checkout: { enabled: true, config: { number: '2348107872916' }, exists: true },
  wallet_enabled: { enabled: true, config: {}, exists: true },
  wallet_funding: { enabled: true, config: { min_ngn: 1000, max_ngn: 500000 }, exists: true },
  partner_applications: { enabled: true, config: {}, exists: true },
  reviews: { enabled: true, config: { show_sold_from: 10 }, exists: true },
  renewal_reminders: { enabled: true, config: { days_before: 7 }, exists: true },
  customer_referrals: { enabled: false, config: { reward_ngn: 500, friend_reward_ngn: 0, min_order_ngn: 2000 }, exists: true },
  partner_payouts: { enabled: true, config: { min_ngn: 5000, hold_days: 14 }, exists: true },
  partner_tiers: { enabled: false, config: { tiers: PARTNER_STATS.tier.tiers }, exists: true },
}

const ADMIN_REVIEWS = [
  ...REVIEWS.map((r, i) => ({ ...r, status: i === 3 ? 'hidden' : 'published', product_id: 'p-netflix', products: { name: 'Netflix Premium', slug: 'netflix-premium' }, orders: { order_ref: ['BS-24301', 'BS-24118', 'BS-24002', 'BS-22650'][i] } })),
  { id: 'rv5', rating: 1, body: 'Never received login details.', display_name: 'Kemi B.', status: 'published', created_at: '2026-09-09T11:00:00Z', product_id: 'p-claude', products: { name: 'Claude Pro', slug: 'claude-pro' }, orders: { order_ref: 'BS-24190' } },
]

const ADMIN_PAYOUTS = [
  { id: 'apo1', amount_ngn: 12300, status: 'pending', period_start: '2026-09-01', period_end: '2026-10-01', frequency: 'Monthly', created_at: '2026-10-01T08:00:00Z', processed_at: null, admin_note: null, reference: null,
    payout_details: { payout_method: 'Bank Transfer', bank_name: 'GTBank', account_name: 'Okonkwo Digital Subscriptions Ltd', account_number: '0123456789' },
    affiliate_id: 'aff-1', affiliates: { store_name: 'Okonkwo Digital Subscriptions', business_name: null, referral_code: 'OKONKWO-DIGITAL-2026' } },
  { id: 'apo2', amount_ngn: HUGE, status: 'pending', period_start: '2026-07-01', period_end: '2026-10-01', frequency: 'Quarterly', created_at: '2026-10-01T08:00:00Z', processed_at: null, admin_note: null, reference: null,
    payout_details: { payout_method: 'Crypto', crypto_token: 'USDT', crypto_chain: 'TRC20', wallet_address: 'TXk3m9QpX7aL2vR8sN4bW6cY1dE5fG0hJ' },
    affiliates: { store_name: 'Lagos Gadget Hub', referral_code: 'LGH' } },
  { id: 'apo3', amount_ngn: 10050, status: 'paid', period_start: '2026-08-01', period_end: '2026-09-01', frequency: 'Monthly', created_at: '2026-09-01T08:00:00Z', processed_at: '2026-08-31T10:00:00Z', admin_note: null, reference: 'TRF-88213',
    payout_details: { payout_method: 'Bank Transfer', bank_name: 'Access Bank', account_name: 'Ada Okonkwo', account_number: '0987654321' },
    affiliates: { store_name: 'Okonkwo Digital Subscriptions', referral_code: 'OKONKWO-DIGITAL-2026' } },
  { id: 'apo4', amount_ngn: 4200, status: 'rejected', period_start: '2026-01-01', period_end: '2026-07-01', frequency: 'Biannual', created_at: '2026-07-01T08:00:00Z', processed_at: '2026-07-31T09:00:00Z', admin_note: 'Account name doesn’t match.', reference: null,
    payout_details: { payout_method: 'Bank Transfer', bank_name: 'Zenith', account_name: 'B. Ade', account_number: '1122334455' },
    affiliates: { store_name: 'Ade Stores', referral_code: 'ADE' } },
]

// Support conversations (migration 18). Mutable, so a reply shows up on the next poll.
const now = Date.now()
const ago = (min) => new Date(now - min * 60000).toISOString()
const SUPPORT = [
  { id: 'st1', audience: 'customer', subject: 'Netflix login asks for a code', order_ref: 'BS-24301', status: 'open', user_unread: 1, admin_unread: 0, last_sender: 'admin', created_at: ago(60 * 26),
    user: { full_name: 'Ada Okonkwo', email: 'ada.okonkwo@example.com' },
    messages: [
      { id: 'sm1', sender: 'user', body: 'Hi, I signed in on my TV and Netflix is asking for a code sent to the account email. I don’t have access to that email.', created_at: ago(60 * 26) },
      { id: 'sm2', sender: 'admin', body: 'Thanks Ada. We’ve generated the code for you: 482 913. It expires in 15 minutes. If it runs out, reply here and we’ll send another.', created_at: ago(60 * 25) },
      { id: 'sm3', sender: 'user', body: 'That worked, thank you!', created_at: ago(60 * 24) },
      { id: 'sm4', sender: 'admin', body: 'Great. One more thing: please don’t change the profile PIN, as other members share the account.', created_at: ago(35) },
    ] },
  { id: 'st2', audience: 'customer', subject: 'Can I upgrade Spotify Duo to Family?', order_ref: null, status: 'open', user_unread: 0, admin_unread: 1, last_sender: 'user', created_at: ago(60 * 3),
    user: { full_name: 'Ada Okonkwo', email: 'ada.okonkwo@example.com' },
    messages: [{ id: 'sm5', sender: 'user', body: 'My sister wants to join. Is there a way to move to Family without losing the remaining time on Duo?', created_at: ago(60 * 3) }] },
  { id: 'st3', audience: 'customer', subject: 'Refund for duplicate payment', order_ref: 'BS-23880', status: 'closed', user_unread: 0, admin_unread: 0, last_sender: 'admin', created_at: '2026-09-12T10:00:00Z', closed_at: '2026-09-13T10:00:00Z',
    user: { full_name: 'Ada Okonkwo', email: 'ada.okonkwo@example.com' },
    messages: [
      { id: 'sm6', sender: 'user', body: 'I was charged twice for order BS-23880.', created_at: '2026-09-12T10:00:00Z' },
      { id: 'sm7', sender: 'admin', body: 'Sorry about that. The second charge has been refunded to your wallet.', created_at: '2026-09-12T14:00:00Z' },
    ] },
  { id: 'st4', audience: 'partner', subject: 'Payout went to my old account', order_ref: null, status: 'open', user_unread: 0, admin_unread: 2, last_sender: 'user', created_at: ago(60 * 50),
    user: { full_name: 'Tunde Bakare', email: 'tunde@lagosgadgets.ng' },
    messages: [
      { id: 'sm8', sender: 'user', body: 'I updated my bank details last week but the October payout shows the old account.', created_at: ago(60 * 50) },
      { id: 'sm9', sender: 'user', body: 'Can you hold it until it’s fixed?', created_at: ago(60 * 49) },
    ] },
]
const threadOut = (t) => {
  const { messages, ...rest } = t
  const last = messages[messages.length - 1]
  return { ...rest, last_message_preview: last?.body.slice(0, 160) || '', last_message_at: last?.created_at || t.created_at, closed_at: t.closed_at || null }
}
const sortThreads = (list) => [...list].sort((a, b) => threadOut(b).last_message_at.localeCompare(threadOut(a).last_message_at))
const supportPost = (id, sender, body) => {
  const t = SUPPORT.find(x => x.id === id)
  if (!t) return { ok: false, error: 'Conversation not found' }
  const m = { id: `sm${Date.now()}`, sender, body: String(body.body || '').trim(), created_at: new Date().toISOString() }
  t.messages.push(m); t.status = 'open'; t.closed_at = null; t.last_sender = sender
  if (sender === 'user') { t.admin_unread += 1; t.user_unread = 0 } else { t.user_unread += 1; t.admin_unread = 0 }
  return { ok: true, data: m }
}

// Writes that the UI reads a response from. Everything else is acknowledged.
const POST_ROUTES = [
  [/^\/v2\/me\/support$/, (body) => {
    const t = { id: `st${Date.now()}`, audience: body.audience === 'partner' ? 'partner' : 'customer', subject: body.subject, order_ref: body.order_ref || null, status: 'open', user_unread: 0, admin_unread: 0, last_sender: 'user', created_at: new Date().toISOString(),
      user: { full_name: 'Ada Okonkwo', email: 'ada.okonkwo@example.com' }, messages: [] }
    SUPPORT.push(t); supportPost(t.id, 'user', body); return { ok: true, data: threadOut(t) }
  }],
  [/^\/v2\/me\/support\/[^/]+\/messages$/, (body, path) => supportPost(path.split('/')[4], 'user', body)],
  [/^\/v2\/me\/support\/[^/]+\/close$/, (body, path) => { const t = SUPPORT.find(x => x.id === path.split('/')[4]); if (t) { t.status = 'closed'; t.closed_at = new Date().toISOString() } return { ok: true, data: t && threadOut(t) } }],
  [/^\/v2\/admin\/support\/[^/]+\/messages$/, (body, path) => supportPost(path.split('/')[4], 'admin', body)],
  [/^\/v2\/admin\/support\/[^/]+$/, (body, path) => { const t = SUPPORT.find(x => x.id === path.split('/')[4]); if (t) { t.status = body.status; t.closed_at = body.status === 'closed' ? new Date().toISOString() : null } return { ok: true, data: t && threadOut(t) } }],
  // Sends the browser straight back as if Paystack had redirected.
  [/^\/v2\/me\/wallet\/fund$/, () => ({ ok: true, data: { authorization_url: '/account/wallet?reference=FIXTURE-TOPUP', reference: 'FIXTURE-TOPUP' } })],
  [/^\/v2\/admin\/jobs\/partner-payouts$/, () => ({ ok: true, data: { created: 0, below_minimum: 2, exists: 0, not_due: 3, failed: 0 } })],
  [/^\/v2\/me\/cart$/, (body) => { CART = { items: body.items || [], updated_at: new Date().toISOString() }; return { ok: true, data: CART } }],
  [/^\/v2\/me\/saved\/merge$/, (body) => ({ ok: true, data: [...new Set([...(body.product_ids || []), ...SAVED])] })],
  [/^\/v2\/me\/reviews$/, (body) => ({ ok: true, data: { id: 'rv-mine', rating: body.rating, body: body.body || null, status: 'published', created_at: new Date().toISOString() } })],
  [/^\/v2\/stock-alerts$/, () => ({ ok: true, data: { subscribed: true } })],
]

// ── routing ─────────────────────────────────────────────────────────────
const ROUTES = [
  [/^\/v2\/status$/,                    () => ({ ok: true, data: STATUS })],
  [/^\/v2\/products\/[^/]+\/reviews$/, () => ({ ok: true, data: { enabled: true, items: REVIEWS, summary: REVIEW_SUMMARY },
    meta: { pagination: { page: 1, limit: 10, total: REVIEWS.length, pages: 1 } } })],
  [/^\/v2\/products\/[^/]+\/related$/, () => ({ ok: true, data: [{ product_id: 'p-spotify', count: 41 }, { product_id: 'p-yt', count: 17 }, { product_id: 'p-nord', count: 6 }] })],
  [/^\/v2\/me\/notifications$/,        () => ({ ok: true, data: { items: INBOX, unread: INBOX.filter(n => !n.read_at).length, has_more: false } })],
  [/^\/v2\/me\/reviews\/[^/]+$/,       () => ({ ok: true, data: { enabled: true, can_review: true, review: null } })],
  [/^\/v2\/me\/referrals$/,            () => ({ ok: true, data: REFERRALS })],
  [/^\/v2\/me\/saved$/,                () => ({ ok: true, data: SAVED })],
  [/^\/v2\/me\/support$/,              (q) => ({ ok: true, data: sortThreads(SUPPORT.filter(t => !q.get('audience') || t.audience === q.get('audience'))).map(threadOut) })],
  [/^\/v2\/me\/support\/[^/]+$/,        (q, path) => { const t = SUPPORT.find(x => x.id === path.split('/')[4]); if (!t) return { ok: false, error: 'Conversation not found' }; t.user_unread = 0; return { ok: true, data: { thread: threadOut(t), messages: t.messages } } }],
  [/^\/v2\/admin\/support$/,           (q) => { const st = q.get('status') || 'open'; const term = (q.get('q') || '').toLowerCase(); return { ok: true, data: sortThreads(SUPPORT.filter(t => (st === 'all' || t.status === st) && (!term || `${t.subject} ${t.order_ref} ${t.user.full_name} ${t.user.email}`.toLowerCase().includes(term)))).map(threadOut) } }],
  [/^\/v2\/admin\/support\/[^/]+$/,     (q, path) => { const t = SUPPORT.find(x => x.id === path.split('/')[4]); if (!t) return { ok: false, error: 'Conversation not found' }; t.admin_unread = 0; return { ok: true, data: { thread: threadOut(t), messages: t.messages } } }],
  [/^\/v2\/me\/cart$/,                 () => ({ ok: true, data: CART })],
  [/^\/v2\/me\/wallet\/fund\/verify$/, () => ({ ok: true, data: { credited: true, amount_ngn: 5000, balance_ngn: 23300 } })],
  [/^\/v2\/partners\/me\/payouts$/,   () => ({ ok: true, data: PAYOUTS })],
  [/^\/v2\/admin\/flags$/,             () => ({ ok: true, data: ADMIN_FLAGS })],
  [/^\/v2\/admin\/reviews$/, q => {
    let rows = ADMIN_REVIEWS
    const st = q.get('status'); if (st) rows = rows.filter(r => r.status === st)
    const rt = Number(q.get('rating')); if (rt) rows = rows.filter(r => r.rating === rt)
    return page(rows)
  }],
  [/^\/v2\/admin\/payouts$/, q => {
    const st = q.get('status')
    return page(st ? ADMIN_PAYOUTS.filter(p => p.status === st) : ADMIN_PAYOUTS)
  }],
  [/^\/v2\/me$/,                        () => ({ ok: true, data: PROFILE })],
  // Mirrors the API: ?status= (raw or bucket), ?q= on the ref, page/limit.
  [/^\/v2\/me\/orders$/, q => {
    let rows = ORDERS
    const st = q.get('status')
    if (st) rows = rows.filter(o => (MY_BUCKETS[st] || [st]).includes(o.status))
    const term = (q.get('q') || '').toLowerCase()
    if (term) rows = rows.filter(o => o.order_ref.toLowerCase().includes(term))
    const limit = Number(q.get('limit')) || 50, pageN = Number(q.get('page')) || 1
    return { ok: true, data: rows.slice((pageN - 1) * limit, pageN * limit),
      meta: { pagination: { page: pageN, limit, total: rows.length, pages: Math.ceil(rows.length / limit) } } }
  }],
  [/^\/v2\/me\/orders\/[^/]+$/, (q, path) => {
    const ref = decodeURIComponent(path.split('/').pop())
    const hit = ORDERS.find(o => o.order_ref === ref)
    return hit ? { ok: true, data: hit } : { ok: false, error: 'Order not found' }
  }],
  [/^\/v2\/me\/messages$/,              () => ({ ok: true, data: MESSAGES })],
  [/^\/v2\/me\/messages\/[^/]+\/read$/, () => ({ ok: true })],
  [/^\/v2\/me\/wallet$/,                () => ({ ok: true, data: { balance_ngn: ZERO_WALLET ? 0 : 18300 } })],
  [/^\/v2\/me\/wallet\/transactions$/,  () => ({ ok: true, data: TXNS })],
  [/^\/v2\/partners\/me\/stats$/,        () => ({ ok: true, data: PARTNER_STATS })],
  [/^\/v2\/affiliates\/me\/commissions$/, q => {
    const limit = Number(q.get('limit')) || 20, pageN = Number(q.get('page')) || 1
    return { ok: true, data: COMMISSIONS.slice((pageN - 1) * limit, pageN * limit),
      meta: { pagination: { page: pageN, limit, total: COMMISSIONS.length, pages: Math.ceil(COMMISSIONS.length / limit) } } }
  }],
  [/^\/v2\/partners\/me$/,              () => ({ ok: true, data: { profile: PARTNER_PROFILE, affiliate: PARTNER_AFFILIATE } })],
  // AppShell polls THIS endpoint (not /v2/admin/notifications, which is the
  // admin CRUD list). It returned [] until Phase 11, so the toast, banner and
  // multi-step modal had never rendered and none had been measured.
  // AppShell filters on `audience`, so the admins-only row proves that filter
  // still excludes it on customer routes. Note it also de-dupes via
  // localStorage `notif_<id>` — clear those keys between verification runs or
  // each one shows exactly once, ever.
  [/^\/v2\/notifications$/,             () => ({ ok: true, data: SHELL_NOTIFICATIONS })],
  // Wallet-paid orders land on /order/verify?order=REF, which reads this.
  [/^\/v2\/me\/orders\/[^/]+\/confirmation$/, () => ({ ok: true, data: { verified: true, order_ref: 'BS-2026-G6T84', summary: {
    first_name: 'Ada', email_masked: 'ad••••@example.com', paid_at: new Date().toISOString(),
    currency: 'NGN', fx_rate: 1, subtotal_ngn: 263000, discount_ngn: 49970, wallet_ngn: 213030, total_ngn: 0,
    items: [{ name: 'Netflix Premium', period: 'Annual', billing_type: 'recurring', months: 12, quantity: 1, total_ngn: 263000, slug: 'netflix-premium', domain: 'netflix.com', image_url: null, delivery_time: 'Within 2 hours' }],
  } } })],
  // /order/verify reads this through lib/api.ts, i.e. NEXT_PUBLIC_API_URL.
  [/^\/v2\/pay\/verify$/, () => VERIFY_OK
    ? ({ ok: true, data: { verified: true, order_ref: 'BS-2026-7K2QX', summary: {
        first_name: 'Ada', email_masked: 'ad••••@example.com', paid_at: new Date().toISOString(),
        currency: 'NGN', fx_rate: 1, subtotal_ngn: 66000, discount_ngn: 3300, wallet_ngn: 2000, total_ngn: 60700,
        items: [
          { name: 'Netflix Premium', period: 'Annual', billing_type: 'recurring', months: 12, quantity: 1, total_ngn: 54000, slug: 'netflix-premium', domain: 'netflix.com', image_url: null, delivery_time: 'Within 2 hours' },
          { name: 'Spotify Premium', period: 'Quarterly', billing_type: 'recurring', months: 3, quantity: 2, total_ngn: 12000, slug: null, domain: 'spotify.com', image_url: null, delivery_time: null },
        ] } } })
    : ({ ok: true, data: { verified: false } })],
  // ── storefront ──────────────────────────────────────────────────────
  // A flat array, not page(): Marketplace reads res.data directly and
  // pages nothing. Reached through lib/api.ts, i.e. NEXT_PUBLIC_API_URL.
  [/^\/v2\/products$/,                  () => ({ ok: true, data: PRODUCTS })],
  [/^\/v2\/products\/[^/]+$/, (q, path) => {
    const slug = decodeURIComponent(path.split('/').pop())
    const hit = PRODUCTS.find(p => p.slug === slug || p.id === slug)
    return hit ? { ok: true, data: hit } : { ok: false, error: 'Product not found' }
  }],
  // Placement-aware on purpose. ShopAds fires three requests that differ only
  // by query string, so a route that ignores it hands every placement the same
  // rows and renders a sidebar ad as a banner.
  [/^\/v2\/ads$/, q => {
    const placement = q.get('placement')
    const rows = placement ? SHOP_ADS.filter(a => a.placement === placement) : SHOP_ADS
    const limit = Number(q.get('limit')) || rows.length
    return { ok: true, data: rows.slice(0, limit) }
  }],
  // Nested under data.discounts, not data — lib/api.ts types it
  // `{ discounts: any[] }` and Marketplace reads `res.data?.discounts`, so a
  // bare array here silently yields no auto-applied discount.
  // ReferralBanner had never rendered before Phase 13, and this route is why.
  // lib/useReferral.ts:63 resolves the ?ref= code here and gates on
  // `data.data?.valid` at :66. The catch-all returns `data: []`, and
  // `[].valid` is undefined, so affiliateInfo stayed null and
  // Marketplace.tsx:1136 never mounted the banner. Reach it with
  // /shop?ref=OKONKWO-DIGITAL-2026. `code=missing` returns the invalid branch.
  [/^\/v2\/affiliates\/resolve$/, q => {
    const code = q.get('code') || ''
    if (code === 'missing') return { ok: true, data: { valid: false } }
    return { ok: true, data: {
      valid: true,
      affiliate_id: 'aff-1',
      referral_code: code || 'OKONKWO-DIGITAL-2026',
      // Long enough to push the banner's flex-wrap on a 360px viewport.
      store_name: 'Okonkwo Digital Subscriptions',
    } }
  }],
  // /v2/discount/validate needs no route: it is a POST, and every non-GET is
  // acknowledged generically above. /v2/ads/impression, /v2/ads/click and
  // /v2/affiliates/click are POSTs for the same reason.
  [/^\/v2\/discount\/auto-apply$/, () => ({ ok: true, data: { discounts: [AUTO_DISCOUNT] } })],
  [/^\/v2\/admin\/stats$/,              () => ({ ok: true, data: ADMIN_STATS })],
  // Admin reads a wider row than the customer dashboard: OrdersTab renders
  // customer_name / customer_email alongside the fields /v2/me/orders returns.
  // Serving the customer shape here would render every row's identity as an
  // em-dash and hide exactly the defects this fixture exists to surface.
  // Query-aware on purpose. RejectedTab asks for
  // ?status=rejected_pending and hardcodes <Badge status="rejected_pending">,
  // so a route that ignores the query hands it all seven orders and paints
  // paid and cancelled rows as rejected — a screen that cannot exist in
  // production. Same for the Orders status filter and its debounced search.
  [/^\/v2\/admin\/orders$/, q => {
    let rows = ADMIN_ORDERS
    const status = q.get('status')
    if (status) rows = rows.filter(o => o.status === status)
    const term = (q.get('q') || '').trim().toLowerCase()
    if (term) {
      rows = rows.filter(o => [o.order_ref, o.customer_name, o.customer_email]
        .some(v => (v || '').toLowerCase().includes(term)))
    }
    return page(rows)
  }],
  // Looked up by order_ref, not ADMIN_ORDERS[0]. Expanding any row used to
  // show the first order's items, so every expanded panel looked identical.
  [/^\/v2\/admin\/orders\/[^/]+$/, (q, path) => {
    const ref = decodeURIComponent(path.split('/').pop())
    const hit = ADMIN_ORDERS.find(o => o.order_ref === ref || o.id === ref)
    return hit ? { ok: true, data: hit } : { ok: false, error: 'Order not found' }
  }],
  [/^\/v2\/admin\/customers$/,          () => page(ADMIN_CUSTOMERS)],
  [/^\/v2\/admin\/products$/,           () => page(ADMIN_PRODUCTS)],
  [/^\/v2\/admin\/partners$/,           () => page(ADMIN_PARTNERS)],
  [/^\/v2\/admin\/affiliates$/,         () => page(ADMIN_AFFILIATES)],
  [/^\/v2\/admin\/links$/,              () => page(ADMIN_LINKS)],
  [/^\/v2\/admin\/links\/[^/]+\/rules$/, (q, path) => {
    const id = path.split('/')[4]
    return { ok: true, data: LINK_RULES.filter(r => r.link_id === id) }
  }],
  [/^\/v2\/admin\/links\/[^/]+$/, (q, path) => {
    const id = path.split('/').pop()
    const hit = ADMIN_LINKS.find(l => l.id === id)
    return hit ? { ok: true, data: hit } : { ok: false, error: 'Link not found' }
  }],
  [/^\/v2\/admin\/customers\/[^/]+\/messages$/, () => ({ ok: true, data: CUSTOMER_MESSAGES })],
  [/^\/v2\/admin\/customers\/[^/]+\/wallet$/,   () => ({ ok: true, data: { balance_ngn: 18300 } })],
  // Shaped like the API after migration 22: owner and staff actor named.
  [/^\/v2\/admin\/wallets$/, () => page([
    { id: 'wt1', wallet_id: 'w1', type: 'debit', amount_ngn: 213030, source: 'order_payment', reference: 'BS-2026-G6T84', balance_after: 268970, created_at: '2026-10-07T22:04:01Z', actor_id: null, customer_name: 'Ada Obi', customer_email: 'ada@example.com', actor_name: null, actor_email: null },
    { id: 'wt2', wallet_id: 'w1', type: 'credit', amount_ngn: 480000, source: 'admin', reference: 'compensation', balance_after: 482000, created_at: '2026-10-06T12:00:00Z', actor_id: 'u-staff', customer_name: 'Ada Obi', customer_email: 'ada@example.com', actor_name: 'Chuka Admin', actor_email: 'admin@buysub.ng' },
    { id: 'wt3', wallet_id: 'w2', type: 'credit', amount_ngn: 5000, source: 'admin', reference: 'admin topup', balance_after: 5000, created_at: '2026-09-01T12:00:00Z', actor_id: null, customer_name: null, customer_email: 'tobi@example.com', actor_name: null, actor_email: null },
    { id: 'wt4', wallet_id: 'w2', type: 'credit', amount_ngn: 10000, source: 'topup', reference: 'Top-up BSW-1', balance_after: 15000, created_at: '2026-09-02T12:00:00Z', actor_id: null, customer_name: null, customer_email: 'tobi@example.com', actor_name: null, actor_email: null },
  ])],
  [/^\/v2\/admin\/ads$/,                () => page(ADMIN_ADS)],
  [/^\/v2\/admin\/discounts$/,          () => page(ADMIN_DISCOUNTS)],
  [/^\/v2\/admin\/notifications$/,      () => page(ADMIN_NOTIFICATIONS)],
  // Returns an OBJECT, not a list. SettingsTab does
  // `if (r?.ok && r.data) setSettings(r.data)`, and the catch-all below hands
  // back `data: []` — an empty array is truthy, so settings became [], every
  // field read undefined, and the form rendered blank but not broken. It looked
  // like a working empty form rather than a missing fixture.
  [/^\/v2\/admin\/settings$/,           () => ({ ok: true, data: ADMIN_SETTINGS })],
  // Remaining stub: the receipt surfaces (Phase 10).
  [/^\/v2\/admin\//,                    () => page([])],
]

const server = http.createServer((req, res) => {
  const path = req.url.split('?')[0]
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
  }
  if (req.method === 'OPTIONS') { res.writeHead(204, headers); return res.end() }

  // Writes are acknowledged so optimistic UI paths complete.
  if (req.method !== 'GET') {
    let raw = ''
    req.on('data', c => { raw += c })
    req.on('end', () => {
      let body = {}
      try { body = JSON.parse(raw || '{}') } catch { /* not JSON */ }
      const post = POST_ROUTES.find(([re]) => re.test(path))
      res.writeHead(200, headers)
      res.end(JSON.stringify(post ? post[1](body, path) : { ok: true }))
    })
    return
  }

  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?') + 1) : ''
  const query = new URLSearchParams(qs)
  const hit = ROUTES.find(([re]) => re.test(path))
  const body = hit ? hit[1](query, path) : { ok: true, data: [] }
  res.writeHead(200, headers)
  res.end(JSON.stringify(body))
})

server.listen(PORT, () => {
  console.log(`fixture api → http://127.0.0.1:${PORT}`)
  console.log(`  profile: ${NAMELESS ? 'nameless (falls back to email)' : 'Ada Okonkwo'}`)
  console.log(`  wallet:  ${ZERO_WALLET ? '0' : '18,300'}`)
  console.log(`  orders:  ${ORDERS.length} (one per status, incl. rejected_pending)`)
  console.log(`  partner: ${PARTNER}${PARTNER_PROFILE ? ` (${PARTNER_STATUS})` : ' — no profile'}`)
  console.log(`  verify:  ${VERIFY_OK ? 'verified' : 'failed'}`)
  console.log(`  banner:  ${SHORT_BANNER ? 'short (one line)' : `long (${LONG_BANNER.length} chars)`}`)
})
