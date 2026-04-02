// ============================================================
// BUYSUB — Frontend API Client
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://buysub-api-v2.ebuka-nwaju.workers.dev';

interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, any>;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  return res.json();
}

// ── Products ──
export async function getProducts(params?: {
  category?: string;
  limit?: number;
  offset?: number;
}) {
  const sp = new URLSearchParams();
  if (params?.category && params.category !== 'all') sp.set('category', params.category);
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.offset) sp.set('offset', String(params.offset));
  const qs = sp.toString();
  return apiFetch<any[]>(`/v2/products${qs ? `?${qs}` : ''}`);
}

export async function getProductBySlug(slug: string) {
  return apiFetch<any>(`/v2/products/${slug}`);
}

// ── Discounts ──
export async function validateDiscount(code: string, items: any[], isManual = true) {
  return apiFetch<any>('/v2/discount/validate', {
    method: 'POST',
    body: JSON.stringify({ code, items, is_manual: isManual }),
  });
}

export async function getAutoApplyDiscounts() {
  return apiFetch<{ discounts: any[] }>('/v2/discount/auto-apply');
}

// ── Orders ──
export async function createOrder(payload: any) {
  return apiFetch<any>('/v2/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createWhatsAppOrder(payload: any) {
  return apiFetch<any>('/v2/orders/whatsapp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Payments ──
export async function initPaystackPayment(orderId: string, callbackUrl: string, useWallet = false) {
  return apiFetch<any>('/v2/pay/init', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId, callback_url: callbackUrl, use_wallet: useWallet }),
  });
}

export async function verifyPayment(reference: string) {
  return apiFetch<any>(`/v2/pay/verify?reference=${encodeURIComponent(reference)}`);
}

// ── Customers ──
export async function searchCustomers(query: string) {
  return apiFetch<any[]>(`/v2/customers/search?q=${encodeURIComponent(query)}`);
}
