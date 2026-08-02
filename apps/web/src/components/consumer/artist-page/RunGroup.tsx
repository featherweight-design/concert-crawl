import type { ArtistShow } from '@concert-crawl/types'
import Link from 'next/link'
import React from 'react'

import { StatusPill } from '@/components/consumer/StatusPill'

import { AP_PILL_FONT_SIZE } from './definitions/constants'
import { ARTIST_COPY } from './definitions/copy'
import { fmtDate } from './DateStamp'
import { PriceChip } from './PriceChip'

interface RunGroupProps {
  venue: string
  city: string | null
  shows: ArtistShow[]
}

/** A residency reads as one booking with several nights, not several bookings. */
export const RunGroup = ({ venue, city, shows }: RunGroupProps) => (
  <div
    data-show-item=""
    style={{
      borderRadius: 12,
      border: '1px solid var(--border)',
      background: 'var(--surface-1)',
      padding: 12,
      margin: '2px 0',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <span
        style={{
          fontFamily: 'Inter, system-ui',
          fontWeight: 700,
          fontSize: 14,
          color: 'var(--fg)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {venue}
      </span>
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--signal)',
          background: 'color-mix(in oklab, var(--signal) 12%, transparent)',
          border:
            '1px solid color-mix(in oklab, var(--signal) 40%, transparent)',
          borderRadius: 6,
          padding: '2px 7px',
          flexShrink: 0,
        }}
      >
        {ARTIST_COPY.residencyRun(shows.length)}
      </span>
    </div>
    {city ? (
      <div
        style={{
          fontFamily: 'Inter, system-ui',
          fontSize: 11.5,
          color: 'var(--fg-muted)',
          marginTop: 2,
        }}
      >
        {city}
      </div>
    ) : null}
    <div style={{ marginTop: 8 }}>
      {shows.map((show) => {
        const { dow, mon, day } = fmtDate(show.iso)
        return (
          <Link
            key={show.eventId}
            href={`/events/${show.eventId}`}
            className="ap-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minHeight: 44,
              padding: '0 8px',
              margin: '0 -8px',
              borderRadius: 8,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: 'var(--fg-muted)',
                width: 92,
                flexShrink: 0,
                textDecoration:
                  show.status === 'cancelled' ? 'line-through' : 'none',
              }}
            >
              {`${dow} ${mon} ${day}`}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <StatusPill status={show.status} fontSize={AP_PILL_FONT_SIZE} />
            </span>
            <PriceChip price={show.price} />
          </Link>
        )
      })}
    </div>
  </div>
)
