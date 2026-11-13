'use client';

import { useEffect } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry';
import { ErrorReport } from '@/components/consumer/error-report';
import { StandaloneError } from '@/components/standalone-error/StandaloneError';

interface ProtectedErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProtectedError({ error, reset }: ProtectedErrorProps) {
  const { signOut } = useClerk();
  const router = useRouter();
  const retry = useErrorBoundaryRetry(reset);

  useEffect(() => {
    console.error('[app error]', error);
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
