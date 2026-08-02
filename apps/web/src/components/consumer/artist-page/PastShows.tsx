import type { ArtistPastShow } from '@concert-crawl/types'
import React from 'react'

import { CRAWL_SINCE } from './definitions/constants'
import { ARTIST_COPY } from './definitions/copy'
import { fmtDate } from './DateStamp'
import { SectionHead } from './SectionHead'

interface PastShowsProps {
  name: string
  past: ArtistPastShow[]
}

/**
 * Deliberately modest: no price, no link out, no artwork, and no setlist.
 * `events.setlist` exists but has never carried real data — #1170 owns deep
 * history, and until it lands this block only claims what the crawl saw.
 */
export const PastShows = ({ name, past }: PastShowsProps) => {
  if (!past.length) return null

  return (
    <section aria-label={ARTIST_COPY.pastListAria(name)}>
      <SectionHead title={ARTIST_COPY.pastTitle} />
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {past.map((show, index) => {
          const { mon, day } = fmtDate(show.iso)
          return (
            <li
              key={show.eventId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minHeight: 38,
                borderTop: index === 0 ? undefined : '1px solid var(--border)',
              }}
            >
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  color: 'var(--fg-subtle)',
                  width: 74,
                  flexShrink: 0,
                }}
              >
                {`${mon} ${day}`}
              </span>
              <span
                style={{
                  fontFamily: 'Inter, system-ui',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--fg-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {show.venue}
              </span>
            </li>
          )
        })}
      </ul>
      <p
        style={{
          margin: '12px 0 0',
          fontFamily: 'Inter, system-ui',
          fontSize: 11.5,
          lineHeight: 1.5,
          color: 'var(--fg-subtle)',
        }}
      >
        {ARTIST_COPY.pastNote(CRAWL_SINCE)}
      </p>
    </section>
  )
}
