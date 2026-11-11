'use client';

import { useEffect } from 'react';

import { CREWS_COPY } from '@/components/consumer/crews';
import {
  StandaloneError,
  useErrorId,
} from '@/components/consumer/standalone-error';
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry';

// The crew home boundary catches before the app one, so it carries the same
// page, Tell us card included, with the crew's own wording.
export default function CrewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const onRetry = useErrorBoundaryRetry(reset);
  const errorId = useErrorId(error);

  useEffect(() => {
    console.error('[crews] crew home boundary', error);
  }, [error]);

  return (
    <StandaloneError
      errorId={errorId}
      onRetry={onRetry}
      eyebrow={CREWS_COPY.net.errCrewEyebrow}
      heading={CREWS_COPY.net.errCrewTitle}
      body={CREWS_COPY.net.errCrewBody}
    />
  );
}
