'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry';
import {
  CouldntLoad,
  CouldntLoadPage,
} from '@/components/admin/primitives/CouldntLoad';
import { adminPageName } from '@/components/admin/shell/page-name';

/**
 * Any admin page that throws renders `02/couldnt-load` inside the shell: the
 * layout above this boundary keeps the sidebar and topbar, so only the content
 * area changes. The heading names the page (addendum-2 item 10).
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const retry = useErrorBoundaryRetry(reset);
  const page = adminPageName(usePathname());

  useEffect(() => {
    console.error('[admin] page error:', error);
  }, [error]);

  return (
    <CouldntLoadPage>
      <CouldntLoad fill page={page} onRetry={retry} />
    </CouldntLoadPage>
  );
}
