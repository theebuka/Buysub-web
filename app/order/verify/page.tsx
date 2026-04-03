import { Suspense } from 'react';
import VerifyContent from './VerifyContent';

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter, system-ui, sans-serif',
            background: 'var(--bs-bg-base)',
            color: 'var(--bs-text-primary)',
          }}
        >
          <div style={{ fontSize: 48 }}>⏳</div>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}