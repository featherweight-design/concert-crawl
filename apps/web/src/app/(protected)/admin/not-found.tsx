import Link from 'next/link';
import { Search } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { StateMessage } from '@/components/admin/primitives/StateMessage';

const copy = ADMIN_COPY.states.notFound;

/**
 * `07/not-found`, inside the shell. The board's page-specific wording ("That
 * show isn't here any more") arrives with each page's own `notFound()` in its
 * phase; this is the admin-wide fallback.
 */
export default function AdminNotFound() {
  return (
    <StateMessage
      testId="admin-not-found"
      icon={Search}
      tone="var(--signal)"
      title={copy.title}
      body={copy.body}
      actions={
        <Link
          href="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 32,
            padding: '0 12px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            color: 'var(--fg-on-accent)',
            background: 'var(--signal)',
          }}
        >
          {copy.back}
        </Link>
      }
    />
  );
}
