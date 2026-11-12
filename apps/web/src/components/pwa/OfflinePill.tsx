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
      // One line at any width. Below 360 it reads just "Offline" in the 320
      // board's smaller pill (30px tall, 10px sides), so search keeps its
      // spot. The dot is 7px at every width (offline-pill-320 draws 7px).
      // The aria-label above keeps the whole sentence.
      className="inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface-2 px-3 text-[12px] font-semibold text-fg-muted max-[360px]:min-h-[30px] max-[360px]:px-2.5"
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
      <span className="max-[360px]:hidden">{OFFLINE_COPY.pillLabel}</span>
      <span className="hidden max-[360px]:inline">
        {OFFLINE_COPY.pillLabelShort}
      </span>
    </div>
  );
};
