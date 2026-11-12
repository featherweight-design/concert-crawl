import type { ArtistShow } from '@concert-crawl/types';
import Link from 'next/link';
import React from 'react';

import { DayTile } from '@/components/consumer/events-list/DayTile';
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
 */
export const ArtistShowRow = ({
  show,
  artist,
  photoUrl,
}: ArtistShowRowProps) => {
  const row = fromArtistShow(show, artist, photoUrl);
  const genre = genreColor(show.genres[0]) ?? NEUTRAL_GENRE_COLOR;
  const struck = isStruck(resolveRowStatus(row.lifecycle, row.status));
  const meta = [row.timeLabel, show.city].filter(Boolean).join(' · ');

  return (
    <div
      data-show-item=""
      data-testid="artist-show-row"
      className="relative flex items-center border border-border bg-surface-1"
      style={{ ...cardedEdge(genre), gap: 12, padding: '12px 12px 12px 14px' }}
    >
      <DayTile date={show.iso} today={false} month tint={genre} />
      <div className="min-w-0 flex-1">
        {/* The venue name is the row's link, stretched over the card by the
            shared `.event-row-stretch` rule, so the card is one target with one
            name. The tile is decorative, so the date rides in the name. */}
        <Link
          href={`/events/${show.eventId}`}
          className="event-row-stretch flex min-w-0 items-center"
          style={{ gap: 8, color: 'var(--fg)', textDecoration: 'none' }}
        >
          <VenueTile slug={show.venueSlug} name={show.venue} size={22} />
          <span className="sr-only">{`${row.dateLabel}, `}</span>
          <span
            className="truncate"
            style={{
              fontFamily: 'Inter, system-ui',
              fontWeight: 800,
              fontSize: 16.5,
              letterSpacing: '-0.01em',
              textDecoration: struck ? 'line-through' : 'none',
            }}
          >
            {show.venue}
          </span>
        </Link>
        {meta && (
          <div
            className="truncate"
            style={{
              marginTop: 5,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--fg-muted)',
            }}
          >
            {meta}
          </div>
        )}
      </div>
      <PriceStack show={row} surface="artist" narrow />
      {/* Above the stretched link, so the eye stays its own control. */}
      <div className="relative z-[2] flex shrink-0 items-center justify-center">
        <WatchShowButton eventId={show.eventId} artist={artist} />
      </div>
    </div>
  );
};
