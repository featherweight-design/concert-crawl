import type { EventStatus } from '@concert-crawl/types'
import React from 'react'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

// Labels come from CONSUMER_COPY (copy-rule). The pill span carries the
// `uppercase` class, so 'Cancelled'/'Postponed' still render all-caps.
const STATUS_PILL: Record<
  Exclude<EventStatus, 'upcoming'>,
  { label: string; tone: string }
> = {
  cancelled: {
    label: CONSUMER_COPY.cancelledLabel,
    tone: 'text-danger border-danger',
  },
  postponed: {
    label: CONSUMER_COPY.postponedLabel,
    tone: 'text-warning border-warning',
  },
}

interface StatusPillProps {
  status: EventStatus
  /** Matches the surrounding type ramp; every surface sizes its own pill. */
  fontSize: number
}

/**
 * An upcoming show has no pill — the absence is the signal, so callers can pass
 * a status through unconditionally rather than branching at each call site.
 */
export const StatusPill = ({ status, fontSize }: StatusPillProps) => {
  if (status === 'upcoming') return null
  const pill = STATUS_PILL[status]

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border font-mono font-bold uppercase tracking-widest ${pill.tone}`}
      style={{ fontSize, padding: '2px 7px', lineHeight: 1 }}
    >
      {pill.label}
    </span>
  )
}
