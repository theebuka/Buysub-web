'use client'

// /checkout: who is buying, then pay with Paystack or order on WhatsApp.
// Same payloads as the old cart drawer (lib/checkout.ts). Paystack keeps the
// cart until /order/verify confirms payment; a WhatsApp order clears it once
// the order exists, as before.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button, ButtonLink, Card, EmptyState, Field, Icon, Input, PageHeader, Switch, WhatsAppGlyph } from '@/components/ui'
import { useCart, cartCount, clearCart } from '@/lib/cart'
import { useCurrency } from '@/lib/currency'
import { usePromo, computeTotals, validateDetails, startPaystackCheckout, startWhatsAppOrder, clearManualPromo, type CustomerDetails } from '@/lib/checkout'
import { loadWallet, useSession } from '@/lib/useSession'
import { useSiteStatus } from '@/lib/siteStatus'
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
  const router = useRouter()
  const status = useSiteStatus()
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
  const [useWallet, setUseWallet] = useState(false)

  useEffect(() => setMounted(true), [])

  // Pre-fill from the signed-in account; never overwrite what was typed.
  useEffect(() => {
    if (session.status !== 'signed_in' || !session.user) return
    const u = session.user
    // The email is the account's, always: the order is filed under it, and
    // the wallet can only pay for the account's own orders. Browser autofill
    // used to put another address here, which quietly switched the wallet off.
    setC(prev => ({ email: u.email, name: prev.name || u.full_name, phone: prev.phone || u.phone }))
    if (status.services.wallet_pay) loadWallet()
  }, [session.status, session.user, status.services.wallet_pay])

  if (done) return <WhatsAppDone done={done} />

  const n = mounted ? cartCount(cart) : 0
  const t = computeTotals(cart, rate, promo)
  const args = { cart, customer: c, currency, fxRate: rate, discountCode: t.active?.code, referralCode }

  // The wallet can pay only for an order placed under the account's own
  // email: the API matches the order's customer to the signed-in user.
  const balance = session.walletNGN ?? 0
  const sameEmail = !!session.user && c.email.trim().toLowerCase() === session.user.email.toLowerCase()
  const walletAvailable = status.services.wallet_pay && session.status === 'signed_in' && balance > 0
  const walletApplied = walletAvailable && useWallet && sameEmail ? balance : 0
  const totalNGN = rate > 0 ? t.total / rate : t.total
  const coveredByWallet = walletApplied > 0 && walletApplied >= totalNGN
  const toPay = Math.max(0, t.total - walletApplied * rate)
  const canPay = coveredByWallet || status.services.paystack
  const nothingOpen = !canPay && !status.services.whatsapp

  const pay = async () => {
    const v = validateDetails(c); setError(v); if (v) return
    setBusy('paystack')
    try {
      const r = await startPaystackCheckout(args, walletApplied > 0)
      if (r.error) { toast.error(r.error); return }
      if (r.paidRef) {
        clearCart()
        clearManualPromo()
        loadWallet()
        toast.success('Paid from your wallet')
        router.push(`${ROUTES.account.order(r.paidRef)}`)
        return
      }
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
                {session.status === 'signed_in' && session.user
                  ? <Field label="Email" hint="Orders are filed under your account's email.">{p => <Input {...p} type="email" value={session.user!.email} readOnly />}</Field>
                  : <Field label="Email">{p => <Input {...p} type="email" autoComplete="email" inputMode="email" value={c.email} onChange={set('email')} placeholder="you@example.com" />}</Field>}
                <Field label="Full name">{p => <Input {...p} autoComplete="name" value={c.name} onChange={set('name')} placeholder="Ada Okonkwo" />}</Field>
                <Field label="Phone (WhatsApp)" hint="We use this to deliver your subscription.">{p => <Input {...p} type="tel" autoComplete="tel" inputMode="tel" value={c.phone} onChange={set('phone')} placeholder="0803 000 0000" />}</Field>
              </div>
              {error && <p className={s.fieldError} role="alert">{error}</p>}
            </Card>
            <Card>
              <h2 className={s.cardTitle}>Payment</h2>
              {walletAvailable && (
                <div className={s.walletRow}>
                  <div style={{ minWidth: 0 }}>
                    <div className={s.walletTitle}><Icon name="wallet" size={16} /> Use wallet balance</div>
                    <div className={s.muted}>
                      {sameEmail
                        ? <>{format(balance * rate, currency)} available{currency !== 'NGN' ? ' (estimate)' : ''}</>
                        : <>Only for orders placed with {session.user?.email}</>}
                    </div>
                  </div>
                  <Switch label="Use wallet balance" checked={useWallet && sameEmail} disabled={!sameEmail || !!busy} onChange={setUseWallet} />
                </div>
              )}
              {nothingOpen && (
                <Notice tone="warn">Checkout is paused right now. Please try again shortly.</Notice>
              )}
              {canPay && (
                <Button size="xl" full icon={coveredByWallet ? 'wallet' : 'lock'} loading={busy === 'paystack'} disabled={!!busy} onClick={pay}>
                  {coveredByWallet
                    ? `Pay ${format(t.total, currency)} from wallet`
                    : `Pay ${format(toPay, currency)} with Paystack`}
                </Button>
              )}
              {!canPay && status.services.whatsapp && (
                <p className={s.muted} style={{ marginBottom: 'var(--bs-space-3)' }}>Card and bank payments are paused right now. You can still order on WhatsApp.</p>
              )}
              {canPay && status.services.whatsapp && <div className={s.orRow}><span /> or <span /></div>}
              {status.services.whatsapp && <>
                <Button size="xl" variant="secondary" full loading={busy === 'whatsapp'} disabled={!!busy} onClick={whatsapp}>
                  <WhatsAppGlyph /> Order on WhatsApp
                </Button>
                <p className={s.muted} style={{ textAlign: 'center', marginTop: 'var(--bs-space-3)' }}>
                  WhatsApp opens with your order filled in. Our team confirms it and tells you how to pay.
                </p>
              </>}
            </Card>
          </div>
          <Card className={s.sticky}>
            <h2 className={s.cardTitle}>Order summary</h2>
            <CartLines compact />
            <Totals walletNGN={walletApplied} />
            <Link href="/cart" className={s.inlineLink}>Edit cart</Link>
          </Card>
        </div>
      )}
    </div>
  )
}
