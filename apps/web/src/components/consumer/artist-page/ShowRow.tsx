import type { ArtistShow } from '@concert-crawl/types'
import Link from 'next/link'
import React from 'react'

import { StatusPill } from '@/components/consumer/StatusPill'
import { WatchShowButton } from '@/components/consumer/watch-show-button/WatchShowButton'

import { AP_PILL_FONT_SIZE } from './definitions/constants'
import { DateStamp } from './DateStamp'
import { PriceChip } from './PriceChip'

interface ShowRowProps {
  show: ArtistShow
  /** Headliner name — only used to build the Watch control's signed-out name. */
  artist: string
}

/**
 * The row is one link plus one Watch control beside it. The link still covers
 * everything the eye reads, so the 60px tap area is intact — but the Watch
 * button is a SIBLING of the anchor, never a child: a button inside an anchor
 * is invalid HTML and would swallow the row's own tap.
 */
export const ShowRow = ({ show, artist }: ShowRowProps) => {
  const off = show.status !== 'upcoming'
  return (
    <div
      data-show-item=""
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 60,
        margin: '0 -8px',
        padding: '0 8px',
      }}
    >
      <Link
        href={`/events/${show.eventId}`}
        className="ap-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flex: 1,
          minWidth: 0,
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
      <WatchShowButton eventId={show.eventId} artist={artist} />
    </div>
  )
}
