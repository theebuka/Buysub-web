'use client'

// Order status actions, shared by the orders list, the order page and the
// rejected queue. Rejection is two-stage (contract 5): the first call moves a
// pending_manual order to rejected_pending (reversible), `confirm` makes it
// cancelled, and undo puts it back.

import { authFetch } from '@/lib/apiAuth'
import { invalidate } from '@/lib/useApi'

export type AdminOrder = {
  id: string; order_ref: string; status: string
  customer_id?: string | null; customer_name: string | null; customer_email: string | null; customer_phone: string | null
  payment_method: string | null; currency: string; fx_rate?: number | null; display_total?: number | null
  subtotal_ngn: number; discount_ngn: number; wallet_ngn?: number | null; tax_ngn?: number | null; total_ngn: number
  discount_code?: string | null; affiliate_id?: string | null; paystack_ref?: string | null; notes: string | null
  created_at: string; updated_at?: string; paid_at?: string | null
  order_items?: { id?: string; product_name: string; category?: string | null; billing_period?: string | null; duration_months?: number | null; quantity: number; unit_price_ngn: number; total_price_ngn?: number }[]
}

const enc = encodeURIComponent

async function act(path: string, body?: any) {
  const r = await authFetch(path, { method: 'POST', body })
  invalidate('/v2/admin/stats')
  return r
}

export const approveOrder = (ref: string) => act(`/v2/admin/orders/${enc(ref)}/approve`)
export const rejectOrder = (ref: string, reason: string) => act(`/v2/admin/orders/${enc(ref)}/reject`, { reason: reason || 'Rejected' })
export const confirmReject = (ref: string, reason = '') => act(`/v2/admin/orders/${enc(ref)}/reject`, { confirm: true, ...(reason ? { reason } : {}) })
export const undoReject = (ref: string) => act(`/v2/admin/orders/${enc(ref)}/undo-reject`)

export const receiptHref = (ref: string) => `/admin/receipt?ref=${enc(ref)}`
export const orderHref = (ref: string) => `/admin/orders/${enc(ref)}`

export const PAYMENT_LABELS: Record<string, string> = {
  paystack: 'Paystack', whatsapp: 'WhatsApp', manual: 'Manual', bank_transfer: 'Bank transfer',
  wallet: 'Wallet', cash: 'Cash', crypto: 'Crypto', pos: 'POS', coupon: 'Coupon', cashback: 'Cashback', free: 'No charge',
}
export const paymentLabel = (m: string | null | undefined) =>
  m ? PAYMENT_LABELS[m] || m.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) : '-'
