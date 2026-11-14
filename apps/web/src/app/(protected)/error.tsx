'use client';

import { useEffect } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry';
import { ErrorReport } from '@/components/consumer/error-report';

interface ProtectedErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProtectedError({ error, reset }: ProtectedErrorProps) {
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const retry = useErrorBoundaryRetry(reset);

  useEffect(() => {
    console.error('[app error]', error);
  }, [error]);

  return (
    <ErrorReport
      error={error}
      onRetry={retry}
      signedIn={isSignedIn === true}
      onSignOut={() => void signOut(() => router.push('/'))}
    />
  );
}
