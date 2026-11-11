import { useId } from 'react';
import type { HistoryShow } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { VenueStamp, stampInkFor } from '@/components/consumer/venue-stamp';
import { stampDateParts } from '@/lib/passport/stamp';

const COPY = CONSUMER_COPY.passport;

const VIEWBOX = 120;
const CENTRE = VIEWBOX / 2;
const OUTER_RADIUS = 57;
// The band runs from the venue ring (r 34) to the outer ring (r 57). Both
// lines sit on an alphabetic baseline, and a glyph's top points along the
// path's left normal: outward on the clockwise top arc, inward on the
// anticlockwise bottom one. So the top baseline sits low in the band and the
// bottom baseline high, with the caps (about 7 units) inside the band.
/** Caps reach outward to about r 52. */
const TOP_TEXT_RADIUS = 45.5;
/** Caps reach inward to about r 43. */
const BOTTOM_TEXT_RADIUS = 50;
/** The venue ring at the centre, in viewBox units. */
const VENUE_STAMP_BOX = 74;
/** Past this, an artist name no longer fits the top arc. */
const MAX_ARTIST_CHARS = 22;

const arc = (radius: number, overTop: boolean): string =>
  `M ${CENTRE - radius} ${CENTRE} A ${radius} ${radius} 0 0 ${overTop ? 1 : 0} ${CENTRE + radius} ${CENTRE}`;

const fitArtist = (artist: string): string => {
  const upper = artist.toUpperCase();
  return upper.length > MAX_ARTIST_CHARS
    ? `${upper.slice(0, MAX_ARTIST_CHARS - 1).trimEnd()}…`
    : upper;
};

interface BookletStampProps {
  show: HistoryShow;
  size: number;
}

/**
 * A night in the booklet: the one Passport stamp (B+ rule 4, the venue ring
 * with its glyph, never tilted) inside an ink band that prints who played and
 * the date. The band is the booklet's frame around the stamp, not a second
 * stamp, so it takes the stamp's own ink.
 */
export function BookletStamp({ show, size }: BookletStampProps) {
  const uid = useId().replace(/:/g, '');
  const ink = stampInkFor(show.artist);
  const date = stampDateParts(show.date);
  const topId = `bs${uid}t`;
  const bottomId = `bs${uid}b`;
  const stampSize = Math.round((size * VENUE_STAMP_BOX) / VIEWBOX);

  return (
    <span
      role="img"
      aria-label={`${show.artist}, ${show.venueName}, ${show.dateLabel}`}
      data-booklet-stamp={show.eventId}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        aria-hidden="true"
        focusable="false"
        style={{ position: 'absolute', inset: 0, display: 'block' }}
      >
        <defs>
          <path id={topId} d={arc(TOP_TEXT_RADIUS, true)} />
          <path id={bottomId} d={arc(BOTTOM_TEXT_RADIUS, false)} />
        </defs>
        <circle
          cx={CENTRE}
          cy={CENTRE}
          r={OUTER_RADIUS}
          fill="none"
          stroke={ink}
          strokeWidth={2.2}
        />
        <text
          fill={ink}
          fontFamily="var(--font-mono)"
          fontSize={8.5}
          fontWeight={700}
          letterSpacing="0.14em"
        >
          <textPath href={`#${topId}`} startOffset="50%" textAnchor="middle">
            {fitArtist(show.artist)}
          </textPath>
        </text>
        {date !== null && (
          <text
            fill={ink}
            fontFamily="var(--font-mono)"
            fontSize={9.5}
            fontWeight={700}
            letterSpacing="0.16em"
          >
            <textPath
              href={`#${bottomId}`}
              startOffset="50%"
              textAnchor="middle"
            >
              {`${date.month} ${date.day}`}
            </textPath>
          </text>
        )}
      </svg>
      <span
        style={{
          position: 'absolute',
          top: (size - stampSize) / 2,
          left: (size - stampSize) / 2,
          display: 'flex',
        }}
      >
        <VenueStamp
          venueSlug={show.venueSlug}
          venueName={show.venueName}
          seed={show.artist}
          size={stampSize}
        />
      </span>
    </span>
  );
}

/** The slot the next stamp lands in: a faint ring, its dashed stamp, the date. */
export function NextSlot({ show, size }: BookletStampProps) {
  const date = stampDateParts(show.date);
  return (
    <span
      data-booklet-next={show.eventId}
      aria-label={`${COPY.nextStamp}: ${show.artist}, ${show.venueName}, ${show.dateLabel}`}
      role="img"
      className="flex flex-col items-center justify-center gap-1.5 rounded-full border border-dashed border-border-strong"
      style={{ width: size, height: size }}
    >
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-signal">
        {COPY.nextSlot}
      </span>
      <VenueStamp
        venueSlug={show.venueSlug}
        venueName={show.venueName}
        seed={show.artist}
        variant="dashed"
        size={Math.round(size * 0.32)}
      />
      {date !== null && (
        <span className="font-mono text-[10px] tracking-[0.14em] text-fg-subtle">
          {`${date.month} ${date.day}`}
        </span>
      )}
    </span>
  );
}

/** A slot no night has reached yet. */
export function EmptySlot({ size }: { size: number }) {
  return (
    <span
      aria-hidden="true"
      data-booklet-empty=""
      className="block rounded-full border border-dashed border-border"
      style={{ width: size, height: size }}
    />
  );
}
