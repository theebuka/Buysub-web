// ============================================================
// BUYSUB — Per-period pricing
// ============================================================
// A product is sold for a period only when that period's price column is set
// and positive. A null price means "not offered for this period": the API
// rejects such cart lines at checkout ("… is not available for quarterly"),
// so the storefront must never show them as ₦0 or let them into the cart.

import { PERIODS } from './constants';

type Priced = { [field: string]: any };

/** NGN price for a period, or null when the product isn't sold for it. */
export function priceFor(product: Priced, period: string): number | null {
  const field = PERIODS[period]?.field;
  if (!field) return null;
  const v = Number(product?.[field]);
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** Period keys (in PERIODS order) that this product can be bought for. */
export function availablePeriods(product: Priced): string[] {
  return Object.keys(PERIODS).filter((p) => priceFor(product, p) !== null);
}

/** The cheapest purchasable period, for "From ₦X" labels. */
export function fromPrice(product: Priced): { period: string; price: number } | null {
  let best: { period: string; price: number } | null = null;
  for (const period of availablePeriods(product)) {
    const price = priceFor(product, period)!;
    if (!best || price < best.price) best = { period, price };
  }
  return best;
}

/** Whole-percent saving of a period over paying monthly, or null when there's none. */
export function savingsVs(product: Priced, period: string): number | null {
  const monthly = Number(product?.price_1m);
  const price = priceFor(product, period);
  const months = PERIODS[period]?.months;
  if (!price || !months || !(monthly > 0)) return null;
  const pct = Math.round((1 - price / (monthly * months)) * 100);
  return pct > 0 ? pct : null;
}
