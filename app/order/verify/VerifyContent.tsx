'use client';

// ================================================================
// BUYSUB — PAYSTACK CALLBACK LANDING
// File: app/order/verify/VerifyContent.tsx
//
// Three states: loading · success · failed. Renders without the app shell
// (isNoShell in components/AppShell.tsx), so it carries its own top bar.
//
// Success follows the usual order-confirmation shape: order number you can
// copy, a personal headline, where the receipt went, what happens next, and
// the summary of what was paid. The summary comes from /v2/pay/verify
// (`summary`); when it's missing the page still confirms, in one column.
//
// An order paid in full from the wallet never goes to Paystack: checkout
// sends it here as ?order=REF, and the summary comes from the owner-only
// /v2/me/orders/:ref/confirmation.
// ================================================================

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { verifyPayment } from '@/lib/api';
import { authFetch } from '@/lib/apiAuth';
import { WHATSAPP_NUMBER } from '@/lib/constants';
import { clearCart } from '@/lib/cart';
import { fmtDateTime, fmtNGN } from '@/lib/format';
import { ROUTES } from '@/lib/routes';
import { LogoFull } from '@/components/brand/Logo';
import { ButtonLink, Icon, ProductLogo, WhatsAppGlyph, copyText } from '@/components/ui';
import s from './verify.module.css';

type SummaryItem = {
  name: string; period: string | null; billing_type: string | null; months: number | null
  quantity: number; total_ngn: number
  slug: string | null; domain: string | null; image_url: string | null; delivery_time: string | null
};
type Summary = {
  first_name: string | null; email_masked: string | null; paid_at: string
  subtotal_ngn: number; discount_ngn: number; wallet_ngn: number; total_ngn: number
  items: SummaryItem[]
};

const waLink = (text: string) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.page}>
      <header className={s.bar}>
        <Link href="/" aria-label="BuySub home"><LogoFull height={26} /></Link>
      </header>
      <main className={s.main}>{children}</main>
    </div>
  );
}

function OrderNumber({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    if (await copyText(value)) { setDone(true); window.setTimeout(() => setDone(false), 1500); }
  };
  return (
    <div className={s.refRow}>
      Order <span className={s.ref}>{value}</span>
      <button type="button" className={s.copyBtn} onClick={copy} aria-label={done ? 'Copied' : 'Copy order number'}>
        <Icon name={done ? 'check' : 'copy'} size={14} />
      </button>
    </div>
  );
}

function itemMeta(i: SummaryItem): string {
  const parts: string[] = [];
  if (i.period && i.billing_type !== 'one_time' && i.period !== 'One-time') parts.push(i.period);
  if (i.quantity > 1) parts.push(`Qty ${i.quantity}`);
  return parts.join(' · ') || 'One-time purchase';
}

// The slowest stated delivery time among the items, or a default.
function deliveryText(items: SummaryItem[] | undefined): string {
  const times = (items || []).map(i => i.delivery_time).filter(Boolean) as string[];
  return times.length ? `Usually ${times[0].charAt(0).toLowerCase()}${times[0].slice(1)}.` : 'Usually within a few hours.';
}

function NextSteps({ summary }: { summary: Summary | null }) {
  return (
    <section className={s.section} aria-labelledby="next-title">
      <h2 id="next-title" className={s.sectionTitle}>What happens next</h2>
      <ol className={s.steps}>
        <li className={`${s.step} ${s.stepDone}`}>
          <span className={s.dot}><Icon name="check" size={12} /></span>
          <div>
            <div className={s.stepTitle}>Payment received</div>
            <div className={s.stepText}>{summary ? fmtDateTime(summary.paid_at) : 'Just now'}</div>
          </div>
        </li>
        <li className={`${s.step} ${s.stepNow}`} aria-current="step">
          <span className={s.dot} />
          <div>
            <div className={s.stepTitle}>We set up your subscription</div>
            <div className={s.stepText}>{deliveryText(summary?.items)} You don&apos;t need to do anything.</div>
          </div>
        </li>
        <li className={s.step}>
          <span className={s.dot} />
          <div>
            <div className={s.stepTitle}>Access details sent to you</div>
            <div className={s.stepText}>On WhatsApp and by email. You&apos;ll also find them under your orders.</div>
          </div>
        </li>
      </ol>
    </section>
  );
}

function OrderSummary({ summary }: { summary: Summary }) {
  // total_ngn is what Paystack charged; the order's total includes the wallet part.
  const card = summary.total_ngn
  const wallet = summary.wallet_ngn
  return (
    <aside className={s.summary} aria-labelledby="summary-title">
      <div className={s.summaryHead}>
        <h2 id="summary-title" className={s.summaryTitle}>Order summary</h2>
        <span className={s.summaryDate}>{fmtDateTime(summary.paid_at)}</span>
      </div>
      <ul className={s.items}>
        {summary.items.map((i, n) => (
          <li key={n} className={s.item}>
            <ProductLogo product={{ name: i.name, domain: i.domain, image_url: i.image_url }} size={40} radius="var(--bs-radius-md)" />
            <div style={{ minWidth: 0 }}>
              <div className={s.itemName}>{i.slug ? <Link href={`/shop/${i.slug}`}>{i.name}</Link> : i.name}</div>
              <div className={s.itemMeta}>{itemMeta(i)}</div>
            </div>
            <div className={s.itemAmt}>{fmtNGN(i.total_ngn)}</div>
          </li>
        ))}
      </ul>
      <div className={s.rows}>
        <div className={s.row}><span>Subtotal</span><span>{fmtNGN(summary.subtotal_ngn)}</span></div>
        {summary.discount_ngn > 0 && <div className={`${s.row} ${s.rowMinus}`}><span>Discount</span><span>−{fmtNGN(summary.discount_ngn)}</span></div>}
      </div>
      <div className={s.total}>
        <span className={s.totalLabel}>Total</span>
        <span className={s.totalAmt}>{fmtNGN(card + wallet)}</span>
      </div>
      {wallet > 0 ? (
        <div className={s.paidRows}>
          <div className={s.row}><span>Paid from wallet</span><span>{fmtNGN(wallet)}</span></div>
          {card > 0 && <div className={s.row}><span>Paid by card or bank</span><span>{fmtNGN(card)}</span></div>}
        </div>
      ) : (
        <div className={s.paidWith}>Paid by card or bank via Paystack</div>
      )}
    </aside>
  );
}

function Success({ orderRef, summary }: { orderRef: string; summary: Summary | null }) {
  const name = summary?.first_name;
  const left = (
    <div>
      <div className={s.mark}><Icon name="check" size={22} /></div>
      {orderRef && <OrderNumber value={orderRef} />}
      <h1 className={s.title}>{name ? `Thanks, ${name}. Your order is confirmed.` : 'Thanks. Your order is confirmed.'}</h1>
      <p className={s.lead}>
        {summary?.email_masked
          ? <>We&apos;ve emailed your receipt to <b>{summary.email_masked}</b>.</>
          : <>We&apos;ve emailed your receipt.</>}
        {' '}Keep your order number in case you need to reach us.
      </p>

      <NextSteps summary={summary} />

      <div className={s.actions}>
        {orderRef && <ButtonLink href={ROUTES.account.order(orderRef)} size="lg">Track your order</ButtonLink>}
        <ButtonLink href="/shop" size="lg" variant="secondary">Continue shopping</ButtonLink>
      </div>

      <p className={s.help}>
        Questions about this order?{' '}
        <a href={waLink(`Hi, I have a question about my order ${orderRef}.`)} target="_blank" rel="noopener noreferrer">Message us on WhatsApp</a>
      </p>
    </div>
  );

  if (!summary || summary.items.length === 0) return <div className={s.single}>{left}</div>;
  return <div className={s.grid}>{left}<OrderSummary summary={summary} /></div>;
}

function Failed({ reference, message }: { reference: string | null; message: string }) {
  return (
    <div className={s.single}>
      <div className={`${s.mark} ${s.markError}`}><Icon name="alert" size={22} /></div>
      {reference && <div className={s.refRow}>Reference <span className={s.ref}>{reference}</span></div>}
      <h1 className={s.title}>We couldn&apos;t confirm this payment</h1>
      <p className={s.lead}>
        {message} If money left your account, it isn&apos;t lost: message us{reference ? ' with the reference above' : ''} and we&apos;ll sort it out.
      </p>
      <div className={s.actions}>
        <ButtonLink href={waLink(`Hi, I need help with a payment. Reference: ${reference || 'unknown'}`)} external size="lg" variant="secondary">
          <WhatsAppGlyph /> Contact support
        </ButtonLink>
        <ButtonLink href="/checkout" size="lg" variant="ghost">Back to checkout</ButtonLink>
      </div>
    </div>
  );
}

export function VerifyLoading() {
  return (
    <Frame>
      <div className={s.single} role="status" aria-live="polite">
        <div className={`${s.mark} ${s.markPending}`}><span className={s.spinner} /></div>
        <h1 className={s.title}>Confirming your payment</h1>
        <p className={s.lead}>This usually takes a few seconds. Please don&apos;t close this page.</p>
      </div>
    </Frame>
  );
}

export default function VerifyContent() {
  const searchParams = useSearchParams();
  const walletRef = searchParams.get('order');
  const reference = walletRef || searchParams.get('reference') || searchParams.get('trxref');

  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'success'; orderRef: string; summary: Summary | null } | { kind: 'failed'; message: string }
  >({ kind: 'loading' });

  useEffect(() => {
    if (!reference) { setState({ kind: 'failed', message: 'This page was opened without a payment reference.' }); return; }
    const check: Promise<any> = walletRef
      ? authFetch(`/v2/me/orders/${encodeURIComponent(walletRef)}/confirmation`, { redirectOnAuth: false })
      : verifyPayment(reference);
    check
      .then((res: any) => {
        if (res.ok && res.data?.verified) {
          // clearCart, not removeItem, so the account copy empties too (lib/cartSync.ts).
          clearCart();
          setState({ kind: 'success', orderRef: res.data.order_ref || '', summary: res.data.summary || null });
        } else {
          setState({ kind: 'failed', message: res.error && res.error !== 'Payment not verified' ? res.error : 'Paystack hasn’t confirmed this payment.' });
        }
      })
      .catch(() => setState({ kind: 'failed', message: 'We couldn’t reach our server.' }));
  }, [reference, walletRef]);

  if (state.kind === 'loading') return <VerifyLoading />;
  return (
    <Frame>
      {/* The outcome has to reach assistive tech. */}
      <div role="status" aria-live="polite">
        {state.kind === 'success'
          ? <Success orderRef={state.orderRef} summary={state.summary} />
          : <Failed reference={reference} message={state.message} />}
      </div>
    </Frame>
  );
}
