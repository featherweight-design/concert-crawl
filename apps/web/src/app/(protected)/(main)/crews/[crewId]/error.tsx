'use client';

// The crew home boundary is the same standalone error page as every other
// route (README B20a). A bad crew id never lands here: the page maps it to
// not-found, so this only ever means a real failure.
import { useEffect } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

import { ErrorReport } from '@/components/consumer/error-report';
import { StandaloneError } from '@/components/standalone-error/StandaloneError';
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry';

export default function CrewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { signOut } = useClerk();
  const router = useRouter();
  const retry = useErrorBoundaryRetry(reset);

  useEffect(() => {
    console.error('[crews] crew home boundary', error);
  }, [error]);

  return (
    <StandaloneError
      errorId={error.digest}
      onRetry={retry}
      onSignOut={() => void signOut(() => router.push('/'))}
    >
      <ErrorReport error={error} variant="card" />
    </StandaloneError>
  );
}
