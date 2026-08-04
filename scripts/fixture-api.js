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

// ── awkward values, kept in one place so they are easy to reuse ──────────
const LONG_NAME =
  'Adobe Creative Cloud All Apps with Firefly Premium, Extra Seat and 1TB Cloud Storage (Annual, Prepaid)'
const HUGE = 9876543   // digit grouping + layout pressure
const TINY = 0

// ── customer fixtures ───────────────────────────────────────────────────
// One order per status the UI can encounter, including rejected_pending.
const ORDERS = [
  {
    id: 'o-paid', order_ref: 'BS-24118', status: 'paid',
    total_ngn: 62700, subtotal_ngn: 68000, discount_ngn: 5300,
    payment_method: 'paystack', currency: 'NGN',
    created_at: '2026-07-28T10:14:00Z',
    order_items: [
      { product_name: LONG_NAME, billing_period: 'Annual', quantity: 1, total_price_ngn: 45000 },
      { product_name: 'Apple Music', billing_period: 'Quarterly', quantity: 2, total_price_ngn: 23000 },
    ],
  },
  {
    id: 'o-approved', order_ref: 'BS-24090', status: 'approved',
    total_ngn: HUGE, subtotal_ngn: HUGE, discount_ngn: 0,
    payment_method: 'bank_transfer', currency: 'NGN',
    created_at: '2026-07-25T14:03:00Z',
    order_items: [
      { product_name: 'Enterprise bundle, 40 seats', billing_period: 'Annual', quantity: 40, total_price_ngn: HUGE },
    ],
  },
  {
    id: 'o-pending-manual', order_ref: 'BS-23904', status: 'pending_manual',
    total_ngn: 100500, subtotal_ngn: 100500, discount_ngn: 0,
    payment_method: 'whatsapp', currency: 'NGN',
    created_at: '2026-07-19T08:02:00Z',
    order_items: [
      { product_name: 'Netflix Premium', billing_period: 'Annual', quantity: 1, total_price_ngn: 100500 },
    ],
  },
  {
    id: 'o-pending', order_ref: 'BS-23880', status: 'pending',
    total_ngn: 18000, subtotal_ngn: 18000, discount_ngn: 0,
    payment_method: 'paystack', currency: 'NGN',
    created_at: '2026-07-17T19:47:00Z', order_items: [],
  },
  {
    id: 'o-rejected-pending', order_ref: 'BS-23812', status: 'rejected_pending',
    total_ngn: 7500, subtotal_ngn: 7500, discount_ngn: 0,
    payment_method: 'whatsapp', currency: 'NGN',
    created_at: '2026-07-08T11:26:00Z',
    order_items: [
      { product_name: 'Spotify Duo', billing_period: 'Quarterly', quantity: 1, total_price_ngn: 7500 },
    ],
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

const PROFILE = {
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
} : null

const PARTNER_STATS = {
  affiliate_id: PARTNER_AFFILIATE ? 'aff-1' : null,
  clicks: 4820,
  conversions: 0,          // a zero next to a large number
  earnings_ngn: HUGE,
  pending_ngn: 47500,
}

// ── admin fixtures ──────────────────────────────────────────────────────
// Only /v2/admin/stats is filled in; it is the one admin shape verified so
// far. The list endpoints return a correctly-shaped empty page. Fill these in
// at Phase 6, when each tab's row shape has actually been read.
const ADMIN_STATS = {
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

// ── routing ─────────────────────────────────────────────────────────────
const ROUTES = [
  [/^\/v2\/me$/,                        () => ({ ok: true, data: PROFILE })],
  [/^\/v2\/me\/orders$/,                () => ({ ok: true, data: ORDERS })],
  [/^\/v2\/me\/messages$/,              () => ({ ok: true, data: MESSAGES })],
  [/^\/v2\/me\/messages\/[^/]+\/read$/, () => ({ ok: true })],
  [/^\/v2\/me\/wallet$/,                () => ({ ok: true, data: { balance_ngn: ZERO_WALLET ? 0 : 18300 } })],
  [/^\/v2\/me\/wallet\/transactions$/,  () => ({ ok: true, data: TXNS })],
  [/^\/v2\/partners\/me\/stats$/,        () => ({ ok: true, data: PARTNER_STATS })],
  [/^\/v2\/partners\/me$/,              () => ({ ok: true, data: { profile: PARTNER_PROFILE, affiliate: PARTNER_AFFILIATE } })],
  [/^\/v2\/notifications$/,             () => ({ ok: true, data: [] })],
  // /order/verify reads this through lib/api.ts, i.e. NEXT_PUBLIC_API_URL.
  [/^\/v2\/pay\/verify$/, () => VERIFY_OK
    ? ({ ok: true, data: { verified: true, order_ref: 'BS-24118' } })
    : ({ ok: true, data: { verified: false } })],
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
  // /v2/admin/wallets is deliberately absent. WalletsTab drops the response
  // (`.finally()` with no `.then()`) and renders an EmptyState unconditionally,
  // so no fixture can make anything appear. It is an unimplemented tab, not an
  // unstyled one — see Deferred.
  //
  // Still stubbed: the Ads, Discounts and Notifications lists (Phase 9) and the
  // receipt surfaces (Phase 10). Those tabs render empty states, so nothing in
  // them has been measured. Fill each in as its tab is taken.
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
    res.writeHead(200, headers)
    return res.end(JSON.stringify({ ok: true }))
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
})
