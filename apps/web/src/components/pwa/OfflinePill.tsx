'use client';

import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { OFFLINE_COPY } from './definitions/copy';

export const OfflinePill = () => {
  const online = useOnlineStatus();
  if (online) return null;

  // `role=status` + `aria-live=polite` announces the state change without
  // being modal. `aria-label` carries the full sentence — the dot color is
  // aria-hidden because color must never be the only signal (WCAG 1.4.1).
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={OFFLINE_COPY.pillAria}
      // One line at any width: at 320 the header has no room for the full label,
      // so it ellipsises rather than wrapping into the wordmark. The aria-label
      // above keeps the whole sentence for screen readers.
      className="inline-flex min-h-[36px] min-w-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface-2 px-3 text-[12px] font-semibold text-fg-muted"
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full bg-warning"
      />
      <span className="truncate">{OFFLINE_COPY.pillLabel}</span>
    </div>
  );
};
