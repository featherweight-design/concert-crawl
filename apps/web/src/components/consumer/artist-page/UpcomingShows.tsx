'use client'

import type { ArtistShow } from '@concert-crawl/types'
import React, { useMemo, useState } from 'react'

import { SHOWS_VISIBLE } from './definitions/constants'
import { ARTIST_COPY } from './definitions/copy'
import { firstIso, showsInItem } from './definitions/types'
import { groupShows } from './lib/group-shows'
import { RunGroup } from './RunGroup'
import { SectionHead } from './SectionHead'
import { ShowRow } from './ShowRow'

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
      <SectionHead
        id="upcoming"
        title={ARTIST_COPY.upcomingTitle}
        count={ARTIST_COPY.showCount(showCount)}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visible.map((item, index) => (
          <React.Fragment
            key={
              item.kind === 'run'
                ? `run-${item.venueSlug}-${firstIso(item)}`
                : item.eventId
            }
          >
            {/* A hairline only between two consecutive one-offs — a run card
                already carries its own edge. */}
            {index > 0 &&
            item.kind === 'one' &&
            visible[index - 1]?.kind === 'one' ? (
              <div
                aria-hidden="true"
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
              />
            ) : (
              <ShowRow show={item} />
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
            marginTop: 12,
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
