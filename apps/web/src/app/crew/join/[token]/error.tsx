'use client';

import { useEffect } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

import { ErrorReport } from '@/components/consumer/error-report';
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry';

/**
 * The invite landing's failure: the bare error page (addendum-3 row 19, this
 * route is outside (main)), the same one `(protected)/error.tsx` draws. An
 * invite is often opened signed out, and then it is the signed-out layout: no
 * card, no Sign out, Go home.
 */
export default function CrewJoinError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const onRetry = useErrorBoundaryRetry(reset);

  useEffect(() => {
    console.error('[crews] invite landing boundary', error);
  }, [error]);

  return (
    <ErrorReport
      error={error}
      onRetry={onRetry}
      signedIn={isSignedIn === true}
      onSignOut={() => void signOut(() => router.push('/'))}
    />
  );
}
