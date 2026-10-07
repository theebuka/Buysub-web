import { Suspense } from 'react';
import VerifyContent, { VerifyLoading } from './VerifyContent';

// VerifyContent reads useSearchParams, so it needs a Suspense boundary; the
// fallback is the same "confirming" state it starts in.
export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyLoading />}>
      <VerifyContent />
    </Suspense>
  );
}
