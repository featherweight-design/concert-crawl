'use client';

// One attended night (#70), ported from
// design_handoff_concert_history/history-screens.jsx:119-187.
//
// Deliberately mirrors the Watching row's grid so the two lists read as siblings,
// but the right column is the venue stamp where Watching puts the price delta.
// B+ (rule 4): a night you went to gets the solid Passport stamp, and a night
// still ahead gets the dashed stamp it will become. Rule 2: the lead genre
// colours the image ring and the card's left edge, as on every carded row.
// There is no remove affordance — past attendance isn't editable in v1
// (handoff §Deliberate exclusions).

import Link from 'next/link';
import type { HistoryShow } from '@concert-crawl/types';
import { Panel } from '@/components/consumer/image-slot';
import {
  VenueStamp,
  type VenueStampVariant,
} from '@/components/consumer/venue-stamp';
import { genreColor, NEUTRAL_GENRE_COLOR } from '@/lib/genre-color';
import { HISTORY_COPY } from './definitions/copy';
import {
  HISTORY_DENSITY_CONFIG,
  type HistoryDensity,
} from './definitions/constants';

export type { HistoryDensity } from './definitions/constants';

export const HistoryItem = ({
  show,
  density,
  stamp = 'solid',
}: {
  show: HistoryShow;
  density: HistoryDensity;
  /** `dashed` for an upcoming night: the stamp it will become. */
  stamp?: VenueStampVariant;
}) => {
  const cfg = HISTORY_DENSITY_CONFIG[density];
  const genre = genreColor(show.genre) ?? NEUTRAL_GENRE_COLOR;

  // dateLabel and showTime arrive pre-formatted in Mountain Time — the API
  // treats date presentation as data on this surface.
  const meta = [show.venueName, show.dateLabel, show.showTime]
    .filter((part): part is string => Boolean(part))
    .join(' · ');

  const detail =
    density === 'roomy'
      ? [
          show.genre,
          show.priceFinal !== null
            ? HISTORY_COPY.item.paid(show.priceFinal)
            : null,
        ].filter((part): part is string => Boolean(part))
      : [];

  return (
    <Link
      href={`/events/${show.eventId}`}
      data-testid="history-item"
      className="history-item grid items-center rounded-xl border border-border bg-surface-1 no-underline transition-colors hover:bg-surface-2"
      style={{
        gridTemplateColumns: `${cfg.artSize}px 1fr auto`,
        gap: cfg.gap,
        padding: `${cfg.padY}px ${cfg.padR}px ${cfg.padY}px ${cfg.padL}px`,
        borderLeftWidth: 2,
        borderLeftColor: genre,
        backgroundImage: `linear-gradient(90deg, color-mix(in oklch, ${genre} 7%, transparent), transparent 45%)`,
      }}
    >
      {/* The headliner's portrait, falling through to the generated artist
          mark when there is none. `surface="artist"` on purpose, and it is a
          shorter chain than Browse and Watching draw: those are `event`
          surfaces that try the event's own artwork first. A night is filed
          under who played it, so that stage is deliberately absent here. */}
      <span
        data-testid="history-image-ring"
        className="block overflow-hidden rounded-md"
        style={{
          width: cfg.artSize,
          height: cfg.artSize,
          // A box-shadow, so the clip never cuts the ring.
          boxShadow: `0 0 0 1.25px ${genre}, 0 0 10px color-mix(in oklch, ${genre} 35%, transparent)`,
        }}
      >
        <Panel
          surface="artist"
          name={show.artist}
          photoUrl={show.artistPhotoUrl}
          size={cfg.artSize}
        />
      </span>

      <span
        style={{
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: density === 'roomy' ? 4 : 2,
        }}
      >
        <span
          className="truncate"
          style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 700,
            fontSize: cfg.titleSize,
            letterSpacing: '-0.01em',
            color: 'var(--fg)',
          }}
        >
          {show.artist}
        </span>
        <span
          className="truncate"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: cfg.metaSize,
            letterSpacing: '0.02em',
            color: 'var(--fg-muted)',
          }}
        >
          {meta}
        </span>
        {detail.length > 0 && (
          <span
            className="truncate"
            style={{
              marginTop: 4,
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              letterSpacing: '0.02em',
              color: 'var(--fg-subtle)',
            }}
          >
            {detail.join(' · ')}
          </span>
        )}
      </span>

      {/* Decorative; the row's text already names the venue. */}
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <VenueStamp
          venueSlug={show.venueSlug}
          venueName={show.venueName}
          seed={show.artist}
          variant={stamp}
          size={cfg.stampSize}
        />
      </span>
    </Link>
  );
};
