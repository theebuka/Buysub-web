'use client';

// ================================================================
// BUYSUB — PAYSTACK CALLBACK LANDING
// File: app/order/verify/VerifyContent.tsx
//
// Three states: loading · success · failed.
// Renders without the app shell — see isNoShell in components/AppShell.tsx.
// Tokens come from CSS_VARS via `T`. Customer density, mobile-first.
// ================================================================

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { verifyPayment } from '@/lib/api';
import { T, WHATSAPP_NUMBER } from '@/lib/constants';

// ── Icons (module level, house style: 24×24, currentColor, stroke 2) ──
type IconProps = { size?: number };
const svgBase = (size: number) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

const IconCheck = ({ size = 28 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
);
const IconAlert = ({ size = 28 }: IconProps) => (
  <svg {...svgBase(size)} aria-hidden="true">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <path d="M12 9v4" /><path d="M12 17h.01" />
  </svg>
);
const IconWhatsApp = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.116 1.523 5.847L.057 23.57a.75.75 0 0 0 .92.92l5.723-1.466A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.93 0-3.736-.518-5.287-1.42l-.379-.225-3.932 1.007 1.007-3.932-.225-.379A9.953 9.953 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
  </svg>
);

// ── Shared styles (module level) ──
const btnBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: T.space[2],
  minHeight: 'var(--bs-control-lg)',
  padding: `0 ${T.space[6]}`,
  borderRadius: T.radius.md,
  fontSize: T.text.base,
  fontWeight: T.weight.semibold as any,
  fontFamily: 'inherit',
  textDecoration: 'none',
  cursor: 'pointer',
  transition: `background var(--bs-dur-1) var(--bs-ease-inout), border-color var(--bs-dur-1) var(--bs-ease-inout)`,
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: T.color.accentFill,
  border: 'none',
  color: '#fff',
};

const btnSecondary: React.CSSProperties = {
  ...btnBase,
  background: 'transparent',
  border: `1px solid ${T.color.borderDefault}`,
  color: T.color.textPrimary,
  fontWeight: T.weight.medium as any,
};

// Text on the WhatsApp fill stays #fff — #25D366 is pinned by the brief.
const btnWhatsApp: React.CSSProperties = {
  ...btnBase,
  background: '#25D366',
  border: 'none',
  color: '#fff',
};

function StatusIcon({ tone, children }: { tone: 'accent' | 'success' | 'error'; children: React.ReactNode }) {
  const rgb = tone === 'success' ? '--bs-success-rgb'
            : tone === 'error'   ? '--bs-error-rgb'
            : '--bs-accent-rgb';
  const fg = tone === 'success' ? T.color.success
           : tone === 'error'   ? T.color.error
           : T.color.accentOnSurface;
  return (
    <div style={{
      width: 64, height: 64, borderRadius: T.radius.full,
      background: `rgba(var(${rgb}), 0.12)`,
      color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: `0 auto ${T.space[5]}`,
    }}>
      {children}
    </div>
  );
}

export default function VerifyContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');

  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [orderRef, setOrderRef] = useState('');

  useEffect(() => {
    if (!reference) {
      setStatus('failed');
      return;
    }

    verifyPayment(reference)
      .then((res) => {
        if (res.ok && res.data?.verified) {
          setStatus('success');
          setOrderRef(res.data.order_ref || '');
        } else {
          setStatus('failed');
        }
      })
      .catch(() => setStatus('failed'));
  }, [reference]);

  return (
    <>
      <VerifyStyles />
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: T.color.bgBase,
          // This was `var(--bs-text-primary` — an unclosed paren, so the
          // declaration was dropped and the page inherited from body by luck.
          color: T.color.textPrimary,
          padding: T.space[4],
        }}
      >
        <div
          className="bs-verify-card"
          style={{
            background: T.color.bgCard,
            borderRadius: T.radius.xl,
            padding: `${T.space[8]} ${T.space[6]}`,
            textAlign: 'center',
            maxWidth: 440,
            width: '100%',
            border: `1px solid ${T.color.borderSubtle}`,
          }}
        >
          {/* The whole point of this page is to announce an outcome, so the
              transition has to reach assistive tech. */}
          <div role="status" aria-live="polite">
            {status === 'loading' && (
              <>
                <StatusIcon tone="accent"><span className="bs-verify-spinner" /></StatusIcon>
                <h1 style={{
                  fontSize: T.text.xl, fontWeight: T.weight.bold as any,
                  marginBottom: T.space[2], lineHeight: T.leading.tight,
                }}>
                  Verifying payment
                </h1>
                <p style={{
                  fontSize: T.text.base, color: T.color.textSecondary,
                  lineHeight: T.leading.relaxed,
                }}>
                  Please wait while we confirm your payment. This usually takes a few seconds.
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <StatusIcon tone="success"><IconCheck /></StatusIcon>
                <h1 style={{
                  fontSize: T.text.xl, fontWeight: T.weight.bold as any,
                  marginBottom: T.space[2], lineHeight: T.leading.tight,
                }}>
                  Payment confirmed
                </h1>
                <p style={{
                  fontSize: T.text.base, color: T.color.textSecondary,
                  lineHeight: T.leading.relaxed, marginBottom: orderRef ? T.space[4] : T.space[5],
                }}>
                  Your order has been placed successfully.
                </p>

                {orderRef && (
                  <div style={{
                    display: 'inline-flex', flexDirection: 'column', gap: 2,
                    padding: `${T.space[2]} ${T.space[4]}`,
                    borderRadius: T.radius.md,
                    background: T.color.bgElevated,
                    border: `1px solid ${T.color.borderSubtle}`,
                    marginBottom: T.space[5],
                  }}>
                    <span style={{ fontSize: T.text.xs, color: T.color.textMuted }}>Order reference</span>
                    {/* The one string a customer may need to quote to support. */}
                    <span style={{
                      fontSize: T.text.lg, fontWeight: T.weight.semibold as any,
                      color: T.color.accentOnSurface,
                      fontFamily: 'ui-monospace, Menlo, monospace',
                      userSelect: 'all',
                    }}>{orderRef}</span>
                  </div>
                )}

                <p style={{
                  fontSize: T.text.xs, color: T.color.textMuted,
                  lineHeight: T.leading.relaxed, marginBottom: T.space[5],
                }}>
                  A confirmation email has been sent to your inbox.
                  Our team will process your subscription shortly.
                </p>

                <a href="/shop" className="bs-verify-primary" style={btnPrimary}>
                  Continue shopping
                </a>
              </>
            )}

            {status === 'failed' && (
              <>
                <StatusIcon tone="error"><IconAlert /></StatusIcon>
                <h1 style={{
                  fontSize: T.text.xl, fontWeight: T.weight.bold as any,
                  marginBottom: T.space[2], lineHeight: T.leading.tight,
                }}>
                  Payment not verified
                </h1>
                <p style={{
                  fontSize: T.text.base, color: T.color.textSecondary,
                  lineHeight: T.leading.relaxed, marginBottom: T.space[5],
                }}>
                  We couldn&apos;t verify your payment. If you were charged, please contact support
                  and we&apos;ll resolve this immediately.
                </p>

                <div style={{
                  display: 'flex', gap: T.space[3],
                  justifyContent: 'center', flexWrap: 'wrap',
                }}>
                  <a href="/shop" className="bs-verify-secondary" style={btnSecondary}>
                    Back to shop
                  </a>
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                      `Hi, I need help with a payment. Reference: ${reference || 'unknown'}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bs-verify-wa"
                    style={btnWhatsApp}
                  >
                    <IconWhatsApp />
                    Contact support
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ================================================================
// Pseudo-classes and keyframes
// ================================================================
export function VerifyStyles() {
  return (
    <style>{`
      @media (min-width: 768px) {
        .bs-verify-card { border-radius: var(--bs-radius-2xl); }
      }
      .bs-verify-primary:hover { background: var(--bs-accent-hover); }
      .bs-verify-secondary:hover { border-color: var(--bs-border-strong); }
      .bs-verify-wa:hover { background: #1EBF5A; }
      .bs-verify-primary:focus-visible,
      .bs-verify-secondary:focus-visible,
      .bs-verify-wa:focus-visible {
        outline: none;
        box-shadow: var(--bs-ring);
      }

      @keyframes bsVerifySpin { to { transform: rotate(360deg); } }
      .bs-verify-spinner {
        width: 26px; height: 26px; display: inline-block;
        border: 2.5px solid rgba(var(--bs-accent-rgb), 0.25);
        border-top-color: var(--bs-accent);
        border-radius: var(--bs-radius-full);
        animation: bsVerifySpin 0.7s linear infinite;
      }
    `}</style>
  );
}
