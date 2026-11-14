'use client';

// The crew home boundary is the in-app error page, the one (main)/error.tsx
// renders (addendum-2 §18: the drawn in-app board is a crew page). It stays
// only to keep its own console label; it draws nothing of its own. A bad crew
// id never lands here: the page maps it to not-found, so this only ever means
// a real failure.
import { InAppError } from '@/components/standalone-error/InAppError';
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry';

export default function CrewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const retry = useErrorBoundaryRetry(reset);
  return (
    <InAppError
      error={error}
      onRetry={retry}
      logLabel="[crews] crew home boundary"
    />
  );
}
