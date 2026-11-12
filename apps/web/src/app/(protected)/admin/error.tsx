'use client';

import { useEffect } from 'react';
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry';
import { CouldntLoad } from '@/components/admin/primitives/CouldntLoad';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

/**
 * Any admin page that throws renders `02/couldnt-load` inside the shell: the
 * layout above this boundary keeps the sidebar and topbar, so only the content
 * area changes.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const retry = useErrorBoundaryRetry(reset);

  useEffect(() => {
    console.error('[admin] page error:', error);
  }, [error]);

  return (
    <>
      <CouldntLoad onRetry={retry} />
      {error.digest && (
        <p
          style={{
            margin: 0,
            textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: 'var(--fg-subtle)',
          }}
        >
          {ADMIN_COPY.states.couldntLoad.errorId(error.digest)}
        </p>
      )}
    </>
  );
}
