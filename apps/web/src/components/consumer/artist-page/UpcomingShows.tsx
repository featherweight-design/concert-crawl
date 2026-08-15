'use client'

import type { ArtistShow } from '@concert-crawl/types'
import React, { useMemo, useState } from 'react'

import { SHOWS_VISIBLE } from './definitions/constants'
import { ARTIST_COPY } from './definitions/copy'
import { firstIso, showsInItem } from './definitions/types'
import { groupShows } from './lib/group-shows'
import { RunGroup } from './RunGroup'
import { SectionHead } from './SectionHead'
import { EventRow } from '@/components/consumer/event-row/EventRow'
import { fromArtistShow } from '@/components/consumer/event-row/lib/row-model'
import { WatchShowButton } from '@/components/consumer/watch-show-button/WatchShowButton'

interface UpcomingShowsProps {
  name: string
  shows: ArtistShow[]
}

export const UpcomingShows = ({ name, shows }: UpcomingShowsProps) => {
  const [expanded, setExpanded] = useState(false)
  const items = useMemo(() => groupShows(shows), [shows])

  // SHOWS_VISIBLE caps ITEMS — a run is one item. Every label counts SHOWS,
  // so a page can render five items above a "Show all 13 shows" control.
  const showCount = items.reduce((total, item) => total + showsInItem(item), 0)
  const visible = expanded ? items : items.slice(0, SHOWS_VISIBLE)
  const truncated = items.length > SHOWS_VISIBLE

  return (
    <section aria-label={ARTIST_COPY.showsListAria(name)}>
      {/* No count. In a short list "Upcoming" and "2 SHOWS" say the same thing
          twice, and the mono count is the string that clips at 320px. The
          number still appears where it does work: the "Show all N shows"
          control below, which is the only place it is news. */}
      <SectionHead id="upcoming" title={ARTIST_COPY.upcomingTitle} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visible.map((item, index) => (
          <React.Fragment
            key={
              item.kind === 'run'
                ? `run-${item.venueSlug}-${firstIso(item)}`
                : item.eventId
            }
          >
            {/* A hairline under any one-off that has something below it. A run
                card is a card — it needs no rule above another card, but a
                one-off still needs its own bottom edge. */}
            {index > 0 && visible[index - 1]?.kind === 'one' ? (
              <div
                aria-hidden="true"
                data-show-divider=""
                style={{
                  height: 1,
                  background: 'var(--border)',
                  marginLeft: 56,
                }}
              />
            ) : null}
            {item.kind === 'run' ? (
              <RunGroup
                venue={item.venue}
                city={item.city}
                shows={item.shows}
                artist={name}
              />
            ) : (
              <EventRow
                show={fromArtistShow(item, name)}
                surface="artist"
                action={
                  <WatchShowButton eventId={item.eventId} artist={name} />
                }
              />
            )}
          </React.Fragment>
        ))}
      </div>
      {truncated ? (
        <button
          type="button"
          onClick={() => setExpanded((prior) => !prior)}
          aria-expanded={expanded}
          style={{
            marginTop: 10,
            width: '100%',
            minHeight: 44,
            borderRadius: 10,
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            color: 'var(--fg-muted)',
            fontFamily: 'Inter, system-ui',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {expanded ? ARTIST_COPY.showFewer : ARTIST_COPY.showAll(showCount)}
        </button>
      ) : null}
      {/* EXTENSION POINT (Item 3): when history outgrows a single response,
          this control is where pagination lands — the API caps at 50 rows and
          `history.count` is derived from them, so the number never lies. */}
    </section>
  )
}
