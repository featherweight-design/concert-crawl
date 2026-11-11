'use client';

import { useEffect } from 'react';

import { CREWS_COPY } from '@/components/consumer/crews';
import {
  StandaloneError,
  useErrorId,
} from '@/components/consumer/standalone-error';
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry';

/**
 * Our failure, stated as ours. Deliberately not the expired or retired dead
 * end: those are normal outcomes of a link, and this is the connection.
 */
export default function CrewJoinError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const onRetry = useErrorBoundaryRetry(reset);
  const errorId = useErrorId(error);

  useEffect(() => {
    console.error('[crews] invite landing boundary', error);
  }, [error]);

  return (
    <StandaloneError
      errorId={errorId}
      onRetry={onRetry}
      eyebrow={CREWS_COPY.net.errInviteEyebrow}
      heading={CREWS_COPY.net.errInviteTitle}
      body={CREWS_COPY.net.errInviteBody}
    />
  );
}
