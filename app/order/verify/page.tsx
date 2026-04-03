'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { verifyPayment } from '@/lib/api';

function VerifyContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [orderRef, setOrderRef] = useState('');

  useEffect(() => {
    if (!reference) {
      setStatus('failed');
      return;
    }
    verifyPayment(reference).then((res) => {
      if (res.ok && res.data?.verified) {
        setStatus('success');
        setOrderRef(res.data.order_ref || '');
      } else {
        setStatus('failed');
      }
    }).catch(() => setStatus('failed'));
  }, [reference]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif',
      background: 'var(--bs-bg-base)',
      color: 'var(--bs-text-primary)',
      padding: 24,
    }}>
      <div style={{
        background: 'var(--bs-bg-card)',
        borderRadius: 20,
        padding: '48px 40px',
        textAlign: 'center',
        maxWidth: 440,
        width: '100%',
        border: '1px solid var(--bs-border-default)',
      }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Verifying payment...</h1>
            <p style={{ fontSize: 14, color: 'var(--bs-text-secondary)' }}>
              Please wait while we confirm your payment.
            </p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Payment confirmed!</h1>
            <p style={{ fontSize: 14, color: 'var(--bs-text-secondary)', marginBottom: 8 }}>
              Your order has been placed successfully.
            </p>
            {orderRef && (
              <p style={{ fontSize: 16, fontWeight: 600, color: '#7C5CFF', marginBottom: 24 }}>
                Order Ref: {orderRef}
              </p>
            )}
            <p style={{ fontSize: 13, color: 'var(--bs-text-muted)', marginBottom: 24 }}>
              A confirmation email has been sent to your inbox.
              Our team will process your subscription shortly.
            </p>
            <a
              href="/shop"
              style={{
                display: 'inline-block',
                height: 44,
                lineHeight: '44px',
                padding: '0 28px',
                borderRadius: 10,
                background: '#7C5CFF',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Continue shopping
            </a>
          </>
        )}
        {status === 'failed' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Payment not verified</h1>
            <p style={{ fontSize: 14, color: 'var(--bs-text-secondary)', marginBottom: 24 }}>
              We couldn&apos;t verify your payment. If you were charged, please contact support
              and we&apos;ll resolve this immediately.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <a
                href="/shop"
                style={{
                  display: 'inline-block',
                  height: 44,
                  lineHeight: '44px',
                  padding: '0 24px',
                  borderRadius: 10,
                  background: 'var(--bs-bg-input)',
                  border: '1px solid var(--bs-border-default)',
                  color: 'var(--bs-text-primary)',
                  fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                Back to shop
              </a>
              <a
                href={`https://wa.me/2348107872916?text=${encodeURIComponent(`Hi, I need help with a payment. Reference: ${reference || 'unknown'}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  height: 44,
                  lineHeight: '44px',
                  padding: '0 24px',
                  borderRadius: 10,
                  background: '#25D366',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Contact support
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
        background: 'var(--bs-bg-base)',
        color: 'var(--bs-text-primary)',
      }}>
        <div style={{ fontSize: 48 }}>⏳</div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}