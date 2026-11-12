'use client';

import type { ArtistShow } from '@concert-crawl/types';
import React, { useMemo, useState } from 'react';

import { SHOWS_VISIBLE } from './definitions/constants';
import { ARTIST_COPY } from './definitions/copy';
import { firstIso, showsInItem } from './definitions/types';
import { groupShows } from './lib/group-shows';
import { ArtistShowRow } from './ArtistShowRow';
import { RunGroup } from './RunGroup';
import { SectionHead } from './SectionHead';

interface UpcomingShowsProps {
  name: string;
  photoUrl: string | null;
  shows: ArtistShow[];
  /** The dashed line under the rows; the page picks it by follow state. */
  note?: string | null;
}

export const UpcomingShows = ({
  name,
  photoUrl,
  shows,
  note = null,
}: UpcomingShowsProps) => {
  const [expanded, setExpanded] = useState(false);
  const items = useMemo(() => groupShows(shows), [shows]);

  // SHOWS_VISIBLE caps ITEMS — a run is one item. Every label counts SHOWS,
  // so a page can render five items above a "Show all 13 shows" control.
  const showCount = items.reduce((total, item) => total + showsInItem(item), 0);
  const visible = expanded ? items : items.slice(0, SHOWS_VISIBLE);
  const truncated = items.length > SHOWS_VISIBLE;

  return (
    <section aria-label={ARTIST_COPY.showsListAria(name)}>
      {/* B+ `09-artist` puts the count beside the title, before the rule, so
          the rule takes the slack and the count never clips at 320px. */}
      <SectionHead
        id="upcoming"
        title={ARTIST_COPY.upcomingTitle}
        count={ARTIST_COPY.showCount(showCount)}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map((item) =>
          item.kind === 'run' ? (
            <RunGroup
              key={`run-${item.venueSlug}-${firstIso(item)}`}
              venue={item.venue}
              city={item.city}
              shows={item.shows}
              artist={name}
            />
          ) : (
            <ArtistShowRow
              key={item.eventId}
              show={item}
              artist={name}
              photoUrl={photoUrl}
            />
          ),
        )}
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
      {note ? (
        <p
          data-upcoming-note=""
          style={{
            margin: '12px 0 0',
            padding: '13px 16px',
            borderRadius: 12,
            border: '1px dashed var(--border-strong)',
            fontFamily: 'Inter, system-ui',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--fg-muted)',
            textWrap: 'pretty',
          }}
        >
          {note}
        </p>
      ) : null}
      {/* EXTENSION POINT (Item 3): when history outgrows a single response,
          this control is where pagination lands — the API caps at 50 rows and
          `history.count` is derived from them, so the number never lies. */}
    </section>
  );
};
