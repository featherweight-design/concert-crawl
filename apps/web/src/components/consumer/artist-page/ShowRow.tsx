import type { ArtistShow, EventStatus } from '@concert-crawl/types'
import Link from 'next/link'
import React from 'react'

import { CONSUMER_COPY } from '../definitions/copy'

import { DateStamp } from './DateStamp'
import { PriceChip } from './PriceChip'

/** Same treatment the events list uses, so one show reads the same everywhere. */
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

export const StatusPill = ({ status }: { status: EventStatus }) => {
  if (status === 'upcoming') return null
  const pill = STATUS_PILL[status]
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border font-mono font-bold uppercase tracking-widest ${pill.tone}`}
      style={{ fontSize: 9.5, padding: '2px 7px', lineHeight: 1 }}
    >
      {pill.label}
    </span>
  )
}

/** The whole row is one link — no nested targets, one 60px tap area. */
export const ShowRow = ({ show }: { show: ArtistShow }) => {
  const off = show.status !== 'upcoming'
  return (
    <Link
      href={`/events/${show.eventId}`}
      className="ap-row"
      data-show-item=""
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 60,
        padding: '8px 8px',
        margin: '0 -8px',
        borderRadius: 8,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <DateStamp iso={show.iso} dim={off} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontFamily: 'Inter, system-ui',
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--fg)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textDecoration:
                show.status === 'cancelled' ? 'line-through' : 'none',
            }}
          >
            {show.venue}
          </span>
          <StatusPill status={show.status} />
        </div>
        {show.city ? (
          <div
            style={{
              fontFamily: 'Inter, system-ui',
              fontSize: 11.5,
              color: 'var(--fg-muted)',
              marginTop: 2,
            }}
          >
            {show.city}
          </div>
        ) : null}
      </div>
      <PriceChip price={show.price} />
    </Link>
  )
}
