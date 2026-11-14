'use client';

import { useEffect } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

import { ErrorReport } from '@/components/consumer/error-report';
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry';
import { StandaloneError } from './StandaloneError';

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
  reset,
  logLabel,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** Prefixes the console line, so a boundary's failures can be told apart. */
  logLabel: string;
}) => {
  const { signOut } = useClerk();
  const router = useRouter();
  const retry = useErrorBoundaryRetry(reset);

  useEffect(() => {
    console.error(logLabel, error);
  }, [error, logLabel]);

  return (
    <StandaloneError
      inApp
      errorId={error.digest}
      onRetry={retry}
      onSignOut={() => void signOut(() => router.push('/'))}
    >
      <ErrorReport error={error} variant="card" />
    </StandaloneError>
  );
};
