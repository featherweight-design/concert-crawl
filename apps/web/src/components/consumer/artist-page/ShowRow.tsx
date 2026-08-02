import type { ArtistShow } from '@concert-crawl/types'
import Link from 'next/link'
import React from 'react'

import { StatusPill } from '@/components/consumer/StatusPill'

import { AP_PILL_FONT_SIZE } from './definitions/constants'
import { DateStamp } from './DateStamp'
import { PriceChip } from './PriceChip'

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
          <StatusPill status={show.status} fontSize={AP_PILL_FONT_SIZE} />
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
