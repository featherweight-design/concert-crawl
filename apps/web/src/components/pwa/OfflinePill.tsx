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
      // One line at any width. Under 1024 it reads just "Offline" (addendum-3
      // rule 1: header-640, header-900; offline-pill-320 at the narrowest) and
      // "· cached OK" returns from 1024 (header-1100). Every board draws a
      // 30px pill with 10px sides (11px at 1024+) and a 7px dot. The
      // aria-label above keeps the whole sentence.
      className="inline-flex h-[30px] items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface-2 px-2.5 text-[12px] font-semibold text-fg-muted lg:px-[11px]"
    >
      <span
        aria-hidden="true"
        data-testid="offline-pill-dot"
        className="h-[7px] w-[7px] shrink-0 rounded-full bg-warning"
        style={{
          boxShadow:
            '0 0 6px color-mix(in oklch, var(--warning) 60%, transparent)',
        }}
      />
      <span className="hidden lg:inline">{OFFLINE_COPY.pillLabel}</span>
      <span className="lg:hidden">{OFFLINE_COPY.pillLabelShort}</span>
    </div>
  );
};
