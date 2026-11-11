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

interface StatusPillProps {
  status: EventStatus;
  /** Matches the surrounding type ramp; every surface sizes its own pill. */
  fontSize: number;
}

/**
 * An upcoming show has no pill — the absence is the signal, so callers can pass
 * a status through unconditionally rather than branching at each call site.
 */
export const StatusPill = ({ status, fontSize }: StatusPillProps) => {
  if (status === 'upcoming') return null;
  const pill = STATUS_PILL[status];

  return (
    <span
      className="inline-flex shrink-0 items-center rounded border font-mono font-bold uppercase tracking-widest"
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
