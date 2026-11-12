'use client';

import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { OFFLINE_COPY } from './definitions/copy';

export const OfflinePill = () => {
  const online = useOnlineStatus();

  // The live region stays mounted while online (empty) so the text appearing
  // inside it is announced; a region that mounts already holding its text is
  // announced unreliably. It is `sr-only`, so it takes no room in the header
  // row. It carries the full sentence; the visible pill is `aria-hidden` so the
  // short and full labels are never read twice, and the dot colour is never
  // the only signal (WCAG 1.4.1).
  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">
        {online ? null : OFFLINE_COPY.pillAria}
      </div>
      {online ? null : (
        <div
          aria-hidden="true"
          data-testid="offline-pill"
          // One line at any width. The label reads in full on the phone bar
          // from 360 up and from 1024 (header-1100); it is the short "Offline"
          // under 360 (offline-pill-320) and from 640 to 1023 (addendum-3
          // rule 1: header-640, header-900). The 640 and wider boards draw a
          // 30px pill with 10px sides (11px at 1024+), as does the 320 board.
          className="inline-flex h-[36px] items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface-2 px-3 text-[12px] font-semibold text-fg-muted max-[359px]:h-[30px] max-[359px]:px-2.5 sm:h-[30px] sm:px-2.5 lg:px-[11px]"
        >
          <span
            data-testid="offline-pill-dot"
            className="h-[7px] w-[7px] shrink-0 rounded-full bg-warning"
            style={{
              boxShadow:
                '0 0 6px color-mix(in oklch, var(--warning) 60%, transparent)',
            }}
          />
          <span className="max-[359px]:hidden sm:max-lg:hidden">
            {OFFLINE_COPY.pillLabel}
          </span>
          <span className="hidden max-[359px]:inline sm:max-lg:inline">
            {OFFLINE_COPY.pillLabelShort}
          </span>
        </div>
      )}
    </>
  );
};
