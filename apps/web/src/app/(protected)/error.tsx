'use client';

import { useEffect } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  StandaloneError,
  useErrorId,
} from '@/components/consumer/standalone-error';
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry';

interface ProtectedErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProtectedError({ error, reset }: ProtectedErrorProps) {
  const { signOut } = useClerk();
  const router = useRouter();
  const retry = useErrorBoundaryRetry(reset);
  const errorId = useErrorId(error);

  useEffect(() => {
    console.error('[app error]', error);
  }, [error]);

  return (
    <StandaloneError
      errorId={errorId}
      onRetry={retry}
      onSignOut={() => void signOut(() => router.push('/'))}
    />
  );
}
