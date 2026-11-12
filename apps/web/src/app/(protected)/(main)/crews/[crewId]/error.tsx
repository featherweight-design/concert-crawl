'use client';

import { useEffect } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

import {
  StandaloneError,
  useErrorId,
} from '@/components/consumer/standalone-error';
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry';

// The crew home boundary renders inside the app shell, so the app header and
// bottom nav stay and the page drops its own logo (embedded). Addendum 2 item
// 18 (`error-in-app-m`) draws it with the standalone page's error, Tell us
// card and error ID unchanged: no crew wording, and Sign out when signed in.
export default function CrewError({
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
    console.error('[crews] crew home boundary', error);
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
