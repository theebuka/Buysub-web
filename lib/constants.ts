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
export const CSS_VARS = `
  :root {
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
  }
`;
