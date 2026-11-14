'use client';

import { useEffect } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

import { ErrorReport } from '@/components/consumer/error-report';

/**
 * A route error inside the (main) app layout (addendum-2 §18, board
 * `18-error-page/error-in-app-m`): the app header and bottom nav stay, and the
 * page between them is the standalone one. §18: "The error, the Tell us card
 * and the error ID are the same as the standalone page." So on a wide screen,
 * which no board draws, it is the standalone page's desktop layout under the
 * app header. Errors from the (main) layout itself, and every route outside
 * it, still reach the bare `(protected)/error.tsx`.
 */
export const InAppError = ({
  error,
  onRetry,
  logLabel,
}: {
  error: Error & { digest?: string };
  /**
   * The boundary's `useErrorBoundaryRetry(reset)`: each error.tsx calls the
   * hook itself, which the boundary sweep guard checks.
   */
  onRetry: () => void;
  /** Prefixes the console line, so a boundary's failures can be told apart. */
  logLabel: string;
}) => {
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    console.error(logLabel, error);
  }, [error, logLabel]);

  // (main) routes go public at launch, so a signed-out visitor gets the
  // signed-out layout here too (no card, Go home).
  return (
    <ErrorReport
      inApp
      error={error}
      onRetry={onRetry}
      signedIn={isSignedIn === true}
      onSignOut={() => void signOut(() => router.push('/'))}
    />
  );
};
