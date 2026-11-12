'use client';

import Link from 'next/link';
import { RefreshCw, X } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton } from './AdminButton';
import { StateMessage } from './StateMessage';

const copy = ADMIN_COPY.states.couldntLoad;

/**
 * `02/couldnt-load`: the chrome stays, only the content area changes, and
 * nothing the admin decided is lost. Try again re-runs the page; Open Health
 * is the way out when it keeps failing.
 */
export const CouldntLoad = ({
  page,
  onRetry,
}: {
  /** The page's name, e.g. "Needs you". Omitted, the title stays generic. */
  page?: string;
  onRetry: () => void;
}) => (
  <StateMessage
    testId="couldnt-load"
    role="alert"
    icon={X}
    tone="var(--danger)"
    title={page ? copy.title(page) : copy.titleGeneric}
    body={copy.body}
    actions={
      <>
        <AdminButton
          type="button"
          variant="primary"
          icon={RefreshCw}
          onClick={onRetry}
        >
          {copy.tryAgain}
        </AdminButton>
        <Link
          href="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0 12px',
            height: 32,
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            color: 'var(--fg)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border-strong)',
          }}
        >
          {copy.openHealth}
        </Link>
      </>
    }
  />
);
