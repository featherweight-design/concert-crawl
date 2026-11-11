import type { EventStatus } from '@concert-crawl/types';
import React from 'react';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

// Labels come from CONSUMER_COPY (copy-rule). The pill span carries the
// `uppercase` class, so 'Cancelled'/'Postponed' still render all-caps.
const STATUS_PILL: Record<
  Exclude<EventStatus, 'upcoming'>,
  { label: string; token: string }
> = {
  cancelled: { label: CONSUMER_COPY.cancelledLabel, token: '--danger' },
  postponed: { label: CONSUMER_COPY.postponedLabel, token: '--warning' },
};

// No longer listed (B+ A5): neutral and dashed, never Cancelled's red, since
// nobody confirmed the show is off (README system rule: grey and dashed).
const NO_LONGER_LISTED_PILL = {
  label: CONSUMER_COPY.noLongerListedLabel,
  token: '--fg-muted',
} as const;

interface StatusPillProps {
  status: EventStatus;
  /** Matches the surrounding type ramp; every surface sizes its own pill. */
  fontSize: number;
  /**
   * The show is No longer listed rather than Cancelled. Callers resolve it
   * with `isDelisted`, the one web-side derivation.
   */
  delisted?: boolean;
}

/**
 * An upcoming show has no pill — the absence is the signal, so callers can pass
 * a status through unconditionally rather than branching at each call site.
 */
export const StatusPill = ({
  status,
  fontSize,
  delisted = false,
}: StatusPillProps) => {
  if (status === 'upcoming') return null;
  const pill = delisted ? NO_LONGER_LISTED_PILL : STATUS_PILL[status];

  return (
    <span
      data-testid={delisted ? 'status-pill-removed' : undefined}
      className={`inline-flex shrink-0 items-center rounded border font-mono font-bold uppercase tracking-widest ${delisted ? 'border-dashed' : ''}`}
      // Tinted like every B+ status chip (rule 3): the color with a wash, never
      // a bare full-strength outline.
      style={{
        fontSize,
        padding: '2px 7px',
        lineHeight: 1,
        color: `var(${pill.token})`,
        background: `color-mix(in oklch, var(${pill.token}) 10%, transparent)`,
        borderColor: `color-mix(in oklch, var(${pill.token}) 42%, transparent)`,
      }}
    >
      {pill.label}
    </span>
  );
};
