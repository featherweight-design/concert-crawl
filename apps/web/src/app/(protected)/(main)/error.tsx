'use client';

import { useEffect } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

import {
  StandaloneError,
  useErrorId,
} from '@/components/consumer/standalone-error';
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry';

// A route error inside the app renders inside the app layout, so the header
// and bottom nav stay (addendum 2 item 18, `error-in-app-m`). The error, the
// Tell us card and the error ID are the standalone page's. A throw in this
// layout itself still reaches the (protected) boundary, and only
// global-error is the bare page.
export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { signOut } = useClerk();
  const router = useRouter();
  const onRetry = useErrorBoundaryRetry(reset);
  const errorId = useErrorId(error);

  useEffect(() => {
    console.error('[app error] in-app route', error);
  }, [error]);

  return (
    <StandaloneError
      errorId={errorId}
      onRetry={onRetry}
      onSignOut={() => void signOut(() => router.push('/'))}
      embedded
    />
  );
}
