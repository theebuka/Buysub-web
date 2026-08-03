// ============================================================
// BUYSUB — Frontend Constants, Types & Helpers
// ============================================================

// ── Logo.dev token ──
export const LOGO_DEV_TOKEN = 'pk_S77F38yQR6WQWErhPEEp1w';

// ── WhatsApp ──
export const WHATSAPP_NUMBER = '2348107872916';

// ── Periods ──
export const PERIODS: Record<string, { months: number; field: string; label: string; name: string }> = {
  quarterly: { months: 3, field: 'price_3m', label: '/ 3 mo', name: 'Quarterly' },
  biannual:  { months: 6, field: 'price_6m', label: '/ 6 mo', name: 'Biannual' },
  annual:    { months: 12, field: 'price_1y', label: '/ yr',   name: 'Annual' },
};

// ── Tab Order ──
export const TAB_ORDER = [
  'all', 'music streaming', 'video streaming', 'security', 'ai',
  'productivity', 'sports', 'bundles', 'education', 'cloud',
  'gaming', 'services', 'coins', 'social media','lifestyle',
];

// ── FX ──
export const FX: Record<string, number> = {
  NGN: 1,
  USD: 1 / 1300,
  GBP: 1 / 1860,
  CAD: 1 / 920,
};

// ── Cart Storage ──
export const CART_STORAGE_KEY = 'buysub_cart_v2';

// ── Types ──
export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  short_description: string | null;
  category_tagline: string | null;
  price_1m: number | null;
  price_3m: number | null;
  price_6m: number | null;
  price_1y: number | null;
  billing_type: 'subscription' | 'one_time';
  billing_period: string | null;
  tags: string | null;
  domain: string | null;
  stock_status: 'in_stock' | 'out_of_stock' | 'preorder';
  status: string;
  image_url: string | null;
  sort_order: number;
}

export interface CartItem {
  product: Product;
  qty: number;
  itemPeriod: string;
}

export interface DiscountRecord {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  display: string;
  max_discount_ngn: number | null;
  min_order_ngn: number;
  included_products: string | null;
  excluded_products: string | null;
  included_categories: string | null;
  excluded_categories: string | null;
  is_auto_apply: boolean;
  scope: 'site_wide' | 'category';
  is_exclusive: boolean;
}

export interface AppliedDiscount extends DiscountRecord {
  isAutoApplied: boolean;
}

// ── Helpers ──
export const norm = (v: any): string => String(v || '').trim().toLowerCase();

export const roundUp = (v: number): number => Math.ceil(v * 2) / 2;

export const format = (value: number, currency: string): string => {
  if (!value && value !== 0) return '—';
  const v = roundUp(value);
  if (currency === 'NGN') return `₦${v.toLocaleString()}`;
  return new Intl.NumberFormat(undefined, {
    style: 'currency', currency, maximumFractionDigits: 2,
  }).format(v);
};

export const discountPct = (monthly: number, periodPrice: number, months: number): number | null =>
  monthly && periodPrice && monthly * months > periodPrice
    ? Math.round((1 - periodPrice / (monthly * months)) * 100)
    : null;

export const isInStock = (status: string): boolean =>
  ['in_stock', 'in stock', 'available'].includes(String(status).toLowerCase());

export const getCategoryList = (product: Product): string[] => {
  const raw = product.category;
  if (!raw) return [];
  return raw.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
};

export const hasCategory = (product: Product, target: string): boolean => {
  if (target === 'all') return true;
  return getCategoryList(product).includes(target.toLowerCase());
};

export const cartKey = (pid: string, period: string): string => `${pid}__${period}`;

export const isValidEmail = (e: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export const splitList = (raw: string | null | undefined): string[] =>
  String(raw || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

// ── Discount eligibility (frontend mirror of backend logic) ──
export const isItemEligible = (item: CartItem, discount: DiscountRecord | AppliedDiscount): boolean => {
  const name = norm(item.product.name);
  const categories = getCategoryList(item.product);
  const excProds = splitList(discount.excluded_products);
  const excCats = splitList(discount.excluded_categories);
  const incProds = splitList(discount.included_products);
  const incCats = splitList(discount.included_categories);

  if (excProds.length > 0 && excProds.includes(name)) return false;
  if (excCats.length > 0 && categories.some(c => excCats.includes(c))) return false;
  if (incProds.length > 0 && !incProds.includes(name)) return false;
  if (incCats.length > 0 && !categories.some(c => incCats.includes(c))) return false;
  return true;
};

export const getEligibleSubtotal = (
  cartItems: Record<string, CartItem>, discount: DiscountRecord | AppliedDiscount, fxRate: number
): number =>
  Object.values(cartItems).reduce((sum, item) => {
    if (!isItemEligible(item, discount)) return sum;
    const price = (item.product as any)[PERIODS[item.itemPeriod]?.field];
    return sum + (price ? price * fxRate * item.qty : 0);
  }, 0);

export const calcDiscountAmount = (
  eligibleSubtotal: number, discount: DiscountRecord | AppliedDiscount, fxRate: number
): number => {
  let amount = 0;
  if (discount.type === 'percentage') {
    amount = eligibleSubtotal * (discount.value / 100);
  } else {
    amount = discount.value * fxRate;
  }
  if (discount.max_discount_ngn != null) {
    const cap = discount.max_discount_ngn * fxRate;
    amount = Math.min(amount, cap);
  }
  return amount;
};

// ── CSS Variables (injected globally) ──
//
// This is the single source of truth for every visual token. Do not add
// per-file dark/light token objects; consume these instead.
//
// Dark is the default and lives on :root. Light is an override applied via
// data-theme="light" on <html>, set before first paint by the script in
// app/layout.tsx and maintained by useTheme() in lib/theme.ts.
//
// NOTE: /shop is deliberately never themed. components/Marketplace.tsx is
// dark-only by construction (fixed #1C1C1F borders, unconditional #fff on the
// mobile segmented controls, dark-only logo swatches, theme=dark in the
// logo.dev URL), so applying the light block there renders it half-light.
// Both the layout script and lib/theme.ts guard on the pathname. See
// REFACTOR.md before removing that guard.
export const CSS_VARS = `
  :root {
    /* ── Colour ─────────────────────────────────────────────── */
    --bs-bg-base: #050507;
    --bs-bg-card: #0B0B0F;
    --bs-bg-elevated: #111116;
    --bs-bg-input: #0E0E13;
    --bs-bg-muted: #1A1A22;
    --bs-bg-subtle: #16161E;
    --bs-text-primary: #F0F0F5;
    --bs-text-secondary: #A0A0B0;
    --bs-text-muted: #6E6E80;
    --bs-text-faint: #4A4A58;
    --bs-border-default: #1E1E28;
    --bs-border-subtle: #16161E;
    --bs-border-strong: #2A2A36;
    --bs-accent: #7C5CFF;
    --bs-accent-hover: #6B4EE6;
    --bs-success: #22C55E;
    --bs-error: #EF4444;
    --bs-warning: #F59E0B;

    /* ── rgb companions, derived from the hex above ─────────── */
    /* For rgba() tints: rgba(var(--bs-accent-rgb), 0.12)          */
    --bs-accent-rgb: 124, 92, 255;
    --bs-success-rgb: 34, 197, 94;
    --bs-error-rgb: 239, 68, 68;
    --bs-warning-rgb: 245, 158, 11;
    --bs-text-muted-rgb: 110, 110, 128;
    /* Legacy alias. components/Marketplace.tsx:1389 spells it this way and
       that file is off-limits. Prefer --bs-text-muted-rgb in new code; this
       can be deleted once Marketplace is next edited. */
    --bs-muted-rgb: var(--bs-text-muted-rgb);

    /* Accent as TEXT, on a page or card background only.
       Text sitting on an accent FILL stays #fff in both themes. */
    --bs-accent-on-surface: #7C5CFF;

    /* ── Status badges ──────────────────────────────────────────
       OPAQUE fills, not rgba() tints. A badge renders on three
       different backgrounds — a Card, a bare list row, and a
       SELECTED row carrying rgba(var(--bs-accent-rgb), 0.06-0.15).
       A translucent tint composites with whatever is underneath, so
       the selected-row case failed AA on every light family and on
       half of dark no matter how the text was tuned. An opaque fill
       is immune to what sits beneath it.

       Each -bg is the 0.12 tint of its state token pre-flattened
       against --bs-bg-card (0.08 for -pending, which is what keeps
       rejected_pending visibly dimmer than plain pending). Every
       pair measures 5.01-8.27 against 11px/500 badge text. Tuned to
       5.0, not the 4.5 floor: the minimum-passing values sat at
       4.60 and any later surface change would erase that headroom.

       -pending is rejected_pending: stage one of a two-stage
       rejection, reversible via /v2/admin/orders/:id/undo-reject.
       It is action-needed, so it takes the warning hue. Terminal
       rejected and cancelled use -error. Do not merge them. */
    --bs-badge-success-bg: #0E2118;
    --bs-badge-success-fg: #22C55E;
    --bs-badge-warning-bg: #271D0F;
    --bs-badge-warning-fg: #F59E0B;
    --bs-badge-error-bg: #261215;
    --bs-badge-error-fg: #F04E4E;
    --bs-badge-neutral-bg: #17171D;
    --bs-badge-neutral-fg: #878796;
    --bs-badge-pending-bg: #1E170F;
    --bs-badge-pending-fg: #F59E0B;

    /* ── Text on a tint of its own colour ───────────────────────
       For the "soft" controls that fill with 12% of their own accent and
       then print label text in that same accent: SmallBtn, PillBadge.
       Measured as shipped, every one of those failed AA — 3.74:1 for
       accent in light, 3.58:1 for text-muted in dark — because a 12%
       tint barely moves the surface while the text stays mid-saturation.
       This is the --bs-accent-on-surface problem again, in the buttons.

       Consumed as color-mix(in srgb, <colour>, var(--bs-on-tint-mix)),
       which holds BOTH the mix target and the percentage so the whole
       thing is theme-switchable from one property with no call-site
       change. Dark lightens toward white, light darkens toward black.

       The percentages are the worst case across the six colours those
       components are actually called with (accent, success, error,
       warning, text-muted, text-secondary): 16% clears dark at 4.93:1,
       28% clears light at 4.71:1, both on card and on base. Lower and
       warning fails in light; higher and the hues start to grey out. */
    --bs-on-tint-mix: #FFFFFF 16%;

    /* ── Brand slab ─────────────────────────────────────────── */
    /* Deliberately dark in BOTH themes. Defined here only, and intentionally
       NOT listed in the [data-theme="light"] block below, which is what makes
       them theme-invariant — that block overrides only what it names.
       Do not "complete the set" by adding light values.

       Never build this surface out of --bs-bg-*, --bs-text-* or --bs-border-*:
       all of those flip under light and would split the page in half. The
       gradient ends on the dark base value as a pinned literal for the same
       reason. Used by the brand panel in app/partners/page.tsx. */
    --bs-brand-slab: linear-gradient(155deg, #17123A 0%, #0C0A1C 58%, #050507 100%);
    --bs-brand-slab-fg: #FFFFFF;
    --bs-brand-slab-fg-dim: rgba(255, 255, 255, 0.70);
    --bs-brand-slab-border: #1C1C1F;

    /* ── Type: 8 steps, px, floor 11 ────────────────────────── */
    --bs-text-2xs: 11px;   /* badges, table column headers, timestamps */
    --bs-text-xs: 12px;    /* metadata, helper text, captions */
    --bs-text-sm: 13px;    /* admin body + table cells — dense default */
    --bs-text-base: 15px;  /* customer body — mobile legibility default */
    --bs-text-lg: 17px;    /* card titles, section leads */
    --bs-text-xl: 20px;    /* panel titles, prices */
    --bs-text-2xl: 24px;   /* KPI values, page titles */
    --bs-text-3xl: 32px;   /* confirmation moments only */

    --bs-weight-regular: 400;
    --bs-weight-medium: 500;   /* secondary labels */
    --bs-weight-semibold: 600; /* UI labels, buttons, active states */
    --bs-weight-bold: 700;     /* prices, KPI numbers, page titles only */

    --bs-leading-tight: 1.2;   /* display and headings */
    --bs-leading-snug: 1.4;    /* UI labels, table cells */
    --bs-leading-relaxed: 1.6; /* descriptions and prose */

    /* ── Spacing: strict 4px grid, 8 steps ──────────────────── */
    --bs-space-1: 4px;
    --bs-space-2: 8px;
    --bs-space-3: 12px;
    --bs-space-4: 16px;
    --bs-space-5: 20px;
    --bs-space-6: 24px;
    --bs-space-8: 32px;
    --bs-space-12: 48px;

    /* ── Control heights ────────────────────────────────────── */
    /* Customer surfaces use lg or taller. 44px is the touch-target floor. */
    --bs-control-sm: 32px;  /* admin inline actions */
    --bs-control-md: 40px;  /* admin inputs and buttons */
    --bs-control-lg: 44px;  /* customer minimum touch target */
    --bs-control-xl: 52px;  /* primary CTA */

    /* ── Radius: 6 steps, mirroring Marketplace ─────────────── */
    --bs-radius-sm: 6px;    /* badges, tags, chips */
    --bs-radius-md: 10px;   /* inputs, buttons, controls */
    --bs-radius-lg: 14px;   /* panels, logo tiles, line items */
    --bs-radius-xl: 20px;   /* cards and modals, mobile card scale */
    --bs-radius-2xl: 28px;  /* desktop card scale */
    --bs-radius-full: 999px;

    /* ── Elevation ──────────────────────────────────────────── */
    /* Dark separates by surface + border, not shadow. Reach for elev-2 and
       above only when something genuinely floats over the page. */
    --bs-elev-0: none;
    --bs-elev-1: 0 1px 2px rgba(0,0,0,0.28);
    --bs-elev-2: 0 4px 16px rgba(0,0,0,0.35);   /* dropdowns, popovers */
    --bs-elev-3: 0 16px 48px rgba(0,0,0,0.50);  /* drawers, modals */
    --bs-elev-accent: 0 8px 32px rgba(var(--bs-accent-rgb), 0.45);
    --bs-ring: 0 0 0 3px rgba(var(--bs-accent-rgb), 0.35);

    /* ── Motion ─────────────────────────────────────────────── */
    --bs-dur-1: 120ms;  /* hover, active — feedback */
    --bs-dur-2: 200ms;  /* state change, fades */
    --bs-dur-3: 280ms;  /* drawer and modal enter */
    --bs-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    --bs-ease-inout: cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* ── Light theme ──────────────────────────────────────────── */
  /* --bs-text-muted and --bs-text-faint are darker than the values these
     were ported from: #8896a6 measured 3.20:1 and #b0bac5 1.9:1 against
     --bs-bg-base, both failing AA. --bs-text-faint is for decorative and
     disabled use only, never for text a user has to read. */
  [data-theme="light"] {
    --bs-bg-base: #F8F9FB;
    --bs-bg-card: #FFFFFF;
    --bs-bg-elevated: #F1F3F5;
    --bs-bg-input: #FFFFFF;
    --bs-bg-muted: #E8EAED;
    --bs-bg-subtle: #EEF0F3;
    --bs-text-primary: #1A1A2E;
    --bs-text-secondary: #4A5568;
    --bs-text-muted: #66717F;
    --bs-text-faint: #7F8896;
    --bs-border-default: #E2E5E9;
    --bs-border-subtle: #EEF0F3;
    --bs-border-strong: #D1D1D6;
    --bs-accent: #7C5CFF;
    --bs-accent-hover: #6B4EE6;
    --bs-success: #059669;
    --bs-error: #DC2626;
    --bs-warning: #D97706;

    /* #7C5CFF as text on white is 4.0:1 and fails AA. #5B3FD4 is 6.76:1 on
       card, 5.61:1 on the darkest light surface. Fills stay #7C5CFF. */
    --bs-accent-on-surface: #5B3FD4;

    /* Status badges. Same construction as :root — the 0.12 tint of the
       light state token flattened against #FFFFFF (0.08 for -pending).
       These are why the light theme needed its own set at all: a 12%
       tint barely darkens white, so a mid-saturation state colour was
       sitting as text on an almost-white field. Range here is
       5.03-5.05, i.e. every pair clears AA with headroom. */
    --bs-badge-success-bg: #E1F2ED;
    --bs-badge-success-fg: #047351;
    --bs-badge-warning-bg: #FAEFE1;
    --bs-badge-warning-fg: #9A5404;
    --bs-badge-error-bg: #FBE5E5;
    --bs-badge-error-fg: #BF2121;
    --bs-badge-neutral-bg: #EDEEF0;
    --bs-badge-neutral-fg: #5C6672;
    --bs-badge-pending-bg: #FCF4EB;
    --bs-badge-pending-fg: #9E5704;

    /* Darken toward black instead of lightening toward white. See :root. */
    --bs-on-tint-mix: #000000 28%;

    --bs-success-rgb: 5, 150, 105;
    --bs-error-rgb: 220, 38, 38;
    --bs-warning-rgb: 217, 119, 6;
    --bs-text-muted-rgb: 102, 113, 127;

    --bs-elev-1: 0 1px 3px rgba(0,0,0,0.06);
    --bs-elev-2: 0 4px 12px rgba(0,0,0,0.08);
    --bs-elev-3: 0 16px 40px rgba(0,0,0,0.12);

    /* --bs-brand-slab-* and --bs-accent-rgb are deliberately absent here.
       They must stay dark/identical under light — see the note in :root. */
  }

  /* Deliberately global, and it does reach into Marketplace.tsx: an instant
     drawer is the correct result for someone who asked the OS for reduced
     motion, and a global rule is the only way to reach those keyframes given
     that file is off-limits. 1ms rather than none so animationend still fires.
     This cannot stop JS timers — ShopAds' carousel needs its own guard. */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 1ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 1ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

// ── Token references for inline style objects ──
//
// Holds only var() references, never values, so CSS_VARS above stays the
// single source of truth. Use as: { fontSize: T.text.sm, padding: T.space[3] }
export const T = {
  text: {
    '2xs': 'var(--bs-text-2xs)',
    xs: 'var(--bs-text-xs)',
    sm: 'var(--bs-text-sm)',
    base: 'var(--bs-text-base)',
    lg: 'var(--bs-text-lg)',
    xl: 'var(--bs-text-xl)',
    '2xl': 'var(--bs-text-2xl)',
    '3xl': 'var(--bs-text-3xl)',
  },
  weight: {
    regular: 'var(--bs-weight-regular)',
    medium: 'var(--bs-weight-medium)',
    semibold: 'var(--bs-weight-semibold)',
    bold: 'var(--bs-weight-bold)',
  },
  leading: {
    tight: 'var(--bs-leading-tight)',
    snug: 'var(--bs-leading-snug)',
    relaxed: 'var(--bs-leading-relaxed)',
  },
  space: {
    1: 'var(--bs-space-1)',
    2: 'var(--bs-space-2)',
    3: 'var(--bs-space-3)',
    4: 'var(--bs-space-4)',
    5: 'var(--bs-space-5)',
    6: 'var(--bs-space-6)',
    8: 'var(--bs-space-8)',
    12: 'var(--bs-space-12)',
  },
  control: {
    sm: 'var(--bs-control-sm)',
    md: 'var(--bs-control-md)',
    lg: 'var(--bs-control-lg)',
    xl: 'var(--bs-control-xl)',
  },
  radius: {
    sm: 'var(--bs-radius-sm)',
    md: 'var(--bs-radius-md)',
    lg: 'var(--bs-radius-lg)',
    xl: 'var(--bs-radius-xl)',
    '2xl': 'var(--bs-radius-2xl)',
    full: 'var(--bs-radius-full)',
  },
  elev: {
    0: 'var(--bs-elev-0)',
    1: 'var(--bs-elev-1)',
    2: 'var(--bs-elev-2)',
    3: 'var(--bs-elev-3)',
    accent: 'var(--bs-elev-accent)',
    ring: 'var(--bs-ring)',
  },
  color: {
    bgBase: 'var(--bs-bg-base)',
    bgCard: 'var(--bs-bg-card)',
    bgElevated: 'var(--bs-bg-elevated)',
    bgInput: 'var(--bs-bg-input)',
    bgMuted: 'var(--bs-bg-muted)',
    bgSubtle: 'var(--bs-bg-subtle)',
    textPrimary: 'var(--bs-text-primary)',
    textSecondary: 'var(--bs-text-secondary)',
    textMuted: 'var(--bs-text-muted)',
    textFaint: 'var(--bs-text-faint)',
    borderDefault: 'var(--bs-border-default)',
    borderSubtle: 'var(--bs-border-subtle)',
    borderStrong: 'var(--bs-border-strong)',
    accent: 'var(--bs-accent)',
    accentHover: 'var(--bs-accent-hover)',
    accentOnSurface: 'var(--bs-accent-on-surface)',
    success: 'var(--bs-success)',
    error: 'var(--bs-error)',
    warning: 'var(--bs-warning)',
  },
  brandSlab: {
    bg: 'var(--bs-brand-slab)',
    fg: 'var(--bs-brand-slab-fg)',
    fgDim: 'var(--bs-brand-slab-fg-dim)',
    border: 'var(--bs-brand-slab-border)',
  },
  motion: {
    dur1: 'var(--bs-dur-1)',
    dur2: 'var(--bs-dur-2)',
    dur3: 'var(--bs-dur-3)',
    easeOut: 'var(--bs-ease-out)',
    easeInOut: 'var(--bs-ease-inout)',
  },
} as const;
