'use client';

import type { ArtistShow } from '@concert-crawl/types';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';

import { DayTile } from '@/components/consumer/events-list/DayTile';
import { EVENT_ROW_COPY } from '@/components/consumer/event-row/definitions/copy';
import { cardedEdge } from '@/components/consumer/event-row/lib/carded-edge';
import { fromArtistShow } from '@/components/consumer/event-row/lib/row-model';
import {
  isStruck,
  resolveRowStatus,
} from '@/components/consumer/event-row/lib/row-status';
import { PriceStack } from '@/components/consumer/event-row/PriceStack';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { WatchShowButton } from '@/components/consumer/watch-show-button/WatchShowButton';
import { genreColor, NEUTRAL_GENRE_COLOR } from '@/lib/genre-color';

/** The shared EventRow's narrow threshold, measured on the row itself. */
export const ARTIST_ROW_NARROW_AT = 360;

/**
 * Below this the right-hand price slot costs the venue its name: at a 320
 * viewport (a 292px row) "tba" and the eye leave the name about 90px, so it
 * read "Red Rocks / Amphithe…". A 360 viewport (a 328px row) is the same
 * story. A 390 viewport is a 358px row and keeps the board's layout as is.
 */
export const ARTIST_ROW_TIGHT_AT = 340;

const SEPARATOR = EVENT_ROW_COPY.glyphs.separator;

interface ArtistShowRowProps {
  show: ArtistShow;
  /** The artist's name: the page carries it, so the row never prints it. */
  artist: string;
  photoUrl: string | null;
}

/**
 * One upcoming show on the artist page (B+ `09-artist`). The page carries the
 * artist, so the row leads with WHEN and WHERE instead: the date tile, then the
 * venue's icon and name, then the time and city. The card, its genre edge and
 * the price slot are Browse's carded row, so a show reads the same here as it
 * does on Browse.
 *
 * Narrow rows (a 320 viewport leaves the text column under 100px) follow the
 * shared EventRow's rules rather than ellipsising everything: the row is
 * measured, the left inset and gaps tighten, the venue name steps down to the
 * narrow head size and WRAPS to a second line, and the meta line keeps the
 * time whole and DROPS the city, the way WhenWhere's ladder drops a unit
 * before it lets a fixed one shrink.
 *
 * At the tightest widths (a 320 or 360 viewport) the price leaves its column
 * and joins the meta line, the way EventRow moves a wide status chip under the
 * title rather than crushing the title column. That hands the venue the slot's
 * width, so the name wraps whole and is never clamped.
 */
export const ArtistShowRow = ({
  show,
  artist,
  photoUrl,
}: ArtistShowRowProps) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [tight, setTight] = useState(false);

  // Measured, not passed in, exactly as EventRow does it.
  useEffect(() => {
    const node = rowRef.current;
    if (!node) return;
    const remeasure = () => {
      const { width } = node.getBoundingClientRect();
      // A zero width is an unlaid-out row, not a 0px one.
      if (width <= 0) return;
      setNarrow(width <= ARTIST_ROW_NARROW_AT);
      setTight(width <= ARTIST_ROW_TIGHT_AT);
    };
    remeasure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(remeasure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const row = fromArtistShow(show, artist, photoUrl);
  const genre = genreColor(show.genres[0]) ?? NEUTRAL_GENRE_COLOR;
  const struck = isStruck(resolveRowStatus(row.lifecycle, row.status));
  const time = row.timeLabel || null;
  // The city is the droppable unit; with no time it is all the line has.
  const city = show.city && (!narrow || time === null) ? show.city : null;
  const gap = narrow ? 10 : 12;

  return (
    <div
      ref={rowRef}
      data-show-item=""
      data-testid="artist-show-row"
      data-narrow={narrow || undefined}
      className="relative flex items-center border border-border bg-surface-1"
      style={{
        ...cardedEdge(genre),
        gap,
        padding: `12px 12px 12px ${narrow ? 10 : 14}px`,
      }}
    >
      <DayTile date={show.iso} today={false} month tint={genre} />
      <div className="min-w-0 flex-1">
        {/* The venue name is the row's link, stretched over the card by the
            shared `.event-row-stretch` rule, so the card is one target with one
            name. The tile is decorative, so the date rides in the name. */}
        <Link
          href={`/events/${show.eventId}`}
          className={`event-row-stretch flex min-w-0 ${narrow ? 'items-start' : 'items-center'}`}
          style={{
            gap: narrow ? 6 : 8,
            color: 'var(--fg)',
            textDecoration: 'none',
          }}
        >
          <VenueTile slug={show.venueSlug} name={show.venue} size={22} />
          <span className="sr-only">{`${row.dateLabel}, `}</span>
          <span
            data-testid="artist-show-venue"
            data-lines={tight ? 'all' : narrow ? 2 : 1}
            className={narrow ? 'min-w-0' : 'truncate'}
            style={{
              fontFamily: 'Inter, system-ui',
              fontWeight: 800,
              fontSize: narrow ? 14.5 : 16.5,
              lineHeight: narrow ? 1.2 : undefined,
              letterSpacing: '-0.01em',
              textDecoration: struck ? 'line-through' : 'none',
              // Tight: the price has moved under the name, so the name has
              // the room to wrap whole. Nothing clamps it.
              ...(tight && {
                overflowWrap: 'break-word',
                hyphens: 'auto',
              }),
              // Narrow: two whole lines of name beat one clipped one.
              ...(narrow &&
                !tight && {
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                  overflow: 'hidden',
                  overflowWrap: 'break-word',
                  hyphens: 'auto',
                }),
            }}
          >
            {show.venue}
          </span>
        </Link>
        {(time !== null || city !== null || tight) && (
          <div
            data-testid="artist-show-meta"
            className="flex min-w-0 items-baseline"
            style={{
              gap: 5,
              marginTop: 5,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--fg-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            {/* The time never shrinks; only the city may ellipsis. */}
            {time !== null && (
              <span data-testid="artist-show-time" style={{ flexShrink: 0 }}>
                {time}
              </span>
            )}
            {time !== null && city !== null && (
              <span aria-hidden style={{ flexShrink: 0 }}>
                {SEPARATOR}
              </span>
            )}
            {city !== null && (
              <span data-testid="artist-show-city" className="min-w-0 truncate">
                {city}
              </span>
            )}
            {/* The price keeps its own type; only the line it sits on moves.
                It takes the line's trailing edge, under where its column was. */}
            {tight && (
              <div
                data-testid="artist-show-price-under"
                className="ml-auto flex shrink-0 font-sans normal-case tracking-normal"
              >
                <PriceStack show={row} surface="artist" narrow />
              </div>
            )}
          </div>
        )}
      </div>
      {!tight && <PriceStack show={row} surface="artist" narrow />}
      {/* Above the stretched link, so the eye stays its own control. */}
      <div className="relative z-[2] flex shrink-0 items-center justify-center">
        <WatchShowButton eventId={show.eventId} artist={artist} />
      </div>
    </div>
  );
};
