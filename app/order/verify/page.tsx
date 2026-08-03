import { Suspense } from 'react';
import VerifyContent, { VerifyStyles } from './VerifyContent';
import { T } from '@/lib/constants';

// The fallback stands in for VerifyContent's own loading state, so it uses the
// same card, the same spinner and the same copy. Anything else reads as two
// different components flashing in sequence.
function VerifyFallback() {
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
          <div style={{
            width: 64, height: 64, borderRadius: T.radius.full,
            background: 'rgba(var(--bs-accent-rgb), 0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: `0 auto ${T.space[5]}`,
          }}>
            <span className="bs-verify-spinner" />
          </div>
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
        </div>
      </div>
    </>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyFallback />}>
      <VerifyContent />
    </Suspense>
  );
}
