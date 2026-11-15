'use client';

import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';

export const OFFLINE_BANNER_HEIGHT = 40;

/**
 * `07/offline-mobile`: a 40px warning banner above the page. It sits in the
 * shell's column and pushes the page down; it never covers it. It goes when the
 * browser is back online. The board draws it on the phone; the desktop shell
 * puts the same banner above the topbar.
 */
export const OfflineBanner = () => {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="admin-offline-banner"
      style={{
        flexShrink: 0,
        height: OFFLINE_BANNER_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '0 16px',
        fontSize: 13,
        color: 'var(--warning)',
        background: 'color-mix(in oklab, var(--warning) 14%, transparent)',
        borderBottom:
          '1px solid color-mix(in oklab, var(--warning) 40%, transparent)',
      }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M2 2l8 8M10 2l-8 8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span>{ADMIN_COPY.states.offline.banner}</span>
    </div>
  );
};
