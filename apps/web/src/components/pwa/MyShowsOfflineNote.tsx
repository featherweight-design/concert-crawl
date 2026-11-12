'use client';

import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { OFFLINE_COPY } from './definitions/copy';

const GHOST_ROWS = 3;

// B+ `bp-s-offline_account_m`: My shows needs the account, which needs a
// connection. A dashed note says so, and three dimmed placeholder rows hold
// the place of the list that will be back with the signal. Nothing renders
// online.
export const MyShowsOfflineNote = () => {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="mb-4 flex flex-col gap-3">
      <p
        role="status"
        className="m-0 flex items-start gap-3.5 rounded-2xl border border-dashed border-border-strong bg-surface-1 px-4 py-3.5 text-[15px] leading-snug text-fg-muted"
      >
        <span
          aria-hidden="true"
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-warning"
        />
        {OFFLINE_COPY.fallback.authNote}
      </p>
      <div aria-hidden="true" className="flex flex-col gap-2.5 opacity-40">
        {Array.from({ length: GHOST_ROWS }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface-1 p-3.5"
          >
            <SkeletonBlock width={48} height={48} radius={12} />
            <span className="flex flex-1 flex-col gap-2">
              <SkeletonBlock width="60%" height={12} radius={6} />
              <SkeletonBlock width="42%" height={9} radius={5} />
              <SkeletonBlock width="26%" height={14} radius={7} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
