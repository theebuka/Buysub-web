'use client'

// /checkout: who is buying, then pay with Paystack or order on WhatsApp.
// Same payloads as the old cart drawer (lib/checkout.ts). Paystack keeps the
// cart until /order/verify confirms payment; a WhatsApp order clears it once
// the order exists, as before.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button, ButtonLink, Card, EmptyState, Field, Icon, Input, PageHeader, WhatsAppGlyph } from '@/components/ui'
import { useCart, cartCount, clearCart } from '@/lib/cart'
import { useCurrency } from '@/lib/currency'
import { usePromo, computeTotals, validateDetails, startPaystackCheckout, startWhatsAppOrder, clearManualPromo, type CustomerDetails } from '@/lib/checkout'
import { useSession } from '@/lib/useSession'
import { useReferral } from '@/lib/useReferral'
import { format } from '@/lib/constants'
import { ROUTES } from '@/lib/routes'
import { CartEmpty, CartLines, Notice, Totals, useCartReconcile } from './CartContents'
import s from './shop.module.css'

type Done = { ref?: string; url: string }

function WhatsAppDone({ done }: { done: Done }) {
  return (
    <div className={s.page} style={{ maxWidth: 640 }}>
      <EmptyState icon="check" title="Order created"
        action={
          <div style={{ display: 'flex', gap: 'var(--bs-space-2)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <ButtonLink href={done.url} external icon="message">Open WhatsApp</ButtonLink>
            <ButtonLink href={ROUTES.account.orders} variant="secondary">View my orders</ButtonLink>
          </div>
        }>
        {done.ref ? <>Your order reference is <b>{done.ref}</b>. </> : null}
        Send the pre-filled message on WhatsApp and our team will confirm your order and how to pay.
        If WhatsApp didn’t open, use the button below.
      </EmptyState>
    </div>
  )
}

export default function CheckoutPage() {
  const cart = useCart()
  const promo = usePromo()
  const session = useSession()
  const { referralCode } = useReferral()
  const { currency, rate } = useCurrency()
  const [mounted, setMounted] = useState(false)
  const [msg, clearMsg] = useCartReconcile()
  const [c, setC] = useState<CustomerDetails>({ email: '', name: '', phone: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'' | 'paystack' | 'whatsapp'>('')
  const [done, setDone] = useState<Done | null>(null)

  useEffect(() => setMounted(true), [])

  // Pre-fill from the signed-in account; never overwrite what was typed.
  useEffect(() => {
    if (session.status !== 'signed_in' || !session.user) return
    const u = session.user
    setC(prev => ({ email: prev.email || u.email, name: prev.name || u.full_name, phone: prev.phone || u.phone }))
  }, [session.status, session.user])

  if (done) return <WhatsAppDone done={done} />

  const n = mounted ? cartCount(cart) : 0
  const t = computeTotals(cart, rate, promo)
  const args = { cart, customer: c, currency, fxRate: rate, discountCode: t.active?.code, referralCode }

  const pay = async () => {
    const v = validateDetails(c); setError(v); if (v) return
    setBusy('paystack')
    try {
      const r = await startPaystackCheckout(args)
      if (r.error) { toast.error(r.error); return }
      toast.success('Redirecting to payment…')
      window.location.href = r.url!
    } catch {
      toast.error('Something went wrong. Please try again. If the problem persists, please contact support.')
    } finally { setBusy('') }
  }

  const whatsapp = async () => {
    const v = validateDetails(c); setError(v); if (v) return
    setBusy('whatsapp')
    try {
      const r = await startWhatsAppOrder(args)
      if (r.error) { toast.error(r.error); return }
      window.open(r.url!, '_blank', 'noopener,noreferrer')
      clearCart()
      clearManualPromo()
      setDone({ url: r.url!, ref: r.ref })
    } catch {
      toast.error('Something went wrong. Please try again. If the problem persists, please contact support.')
    } finally { setBusy('') }
  }

  const set = (k: keyof CustomerDetails) => (e: React.ChangeEvent<HTMLInputElement>) => { setC(p => ({ ...p, [k]: e.target.value })); setError('') }

  return (
    <div className={s.page}>
      <PageHeader crumbs={[{ label: 'Shop', href: '/shop' }, { label: 'Cart', href: '/cart' }, { label: 'Checkout' }]} title="Checkout" />
      {msg && <Notice tone="warn" onClose={clearMsg}>{msg}</Notice>}
      {!mounted ? null : n === 0 ? <CartEmpty /> : (
        <div className={s.twoCol}>
          <div className={s.stack}>
            <Card>
              <h2 className={s.cardTitle}>Your details</h2>
              {session.status === 'signed_in'
                ? <p className={s.muted} style={{ marginBottom: 'var(--bs-space-4)' }}><Icon name="check" size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Signed in. We filled these in from your account.</p>
                : <p className={s.muted} style={{ marginBottom: 'var(--bs-space-4)' }}>Have an account? <Link className={s.inlineLink} href={`/login?next=${encodeURIComponent('/checkout')}`}>Sign in</Link> to track this order.</p>}
              <div className={s.formGrid}>
                <Field label="Email">{p => <Input {...p} type="email" autoComplete="email" inputMode="email" value={c.email} onChange={set('email')} placeholder="you@example.com" />}</Field>
                <Field label="Full name">{p => <Input {...p} autoComplete="name" value={c.name} onChange={set('name')} placeholder="Ada Okonkwo" />}</Field>
                <Field label="Phone (WhatsApp)" hint="We use this to deliver your subscription.">{p => <Input {...p} type="tel" autoComplete="tel" inputMode="tel" value={c.phone} onChange={set('phone')} placeholder="0803 000 0000" />}</Field>
              </div>
              {error && <p className={s.fieldError} role="alert">{error}</p>}
            </Card>
            <Card>
              <h2 className={s.cardTitle}>Payment</h2>
              <Button size="xl" full icon="lock" loading={busy === 'paystack'} disabled={!!busy} onClick={pay}>
                Pay {format(t.total, currency)} with Paystack
              </Button>
              <div className={s.orRow}><span /> or <span /></div>
              <Button size="xl" variant="secondary" full loading={busy === 'whatsapp'} disabled={!!busy} onClick={whatsapp}>
                <WhatsAppGlyph /> Order on WhatsApp
              </Button>
              <p className={s.muted} style={{ textAlign: 'center', marginTop: 'var(--bs-space-3)' }}>
                WhatsApp opens with your order filled in. Our team confirms it and tells you how to pay.
              </p>
            </Card>
          </div>
          <Card className={s.sticky}>
            <h2 className={s.cardTitle}>Order summary</h2>
            <CartLines compact />
            <Totals />
            <Link href="/cart" className={s.inlineLink}>Edit cart</Link>
          </Card>
        </div>
      )}
    </div>
  )
}
