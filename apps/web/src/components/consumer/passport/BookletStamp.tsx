import { useId } from 'react';
import type { HistoryShow } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { IdentityArt } from '@/components/consumer/identity-art/IdentityArt';
import { VenueTile, venueGlyphKey } from '@/components/consumer/venue-glyph';
import { GlyphShapes } from '@/components/consumer/venue-glyph/VenueGlyph';
import {
  stampColorsFor,
  stampDateParts,
  stampGlowFor,
} from '@/lib/passport/stamp';

const COPY = CONSUMER_COPY.passport;

// The booklet stamp as `addendum-2/04/passport-{m,d}` draw it, in the board's
// own 124-unit box (the board stamp is 124px), scaled to the slot.
const VIEWBOX = 124;
const CENTRE = VIEWBOX / 2;
const OUTER_RADIUS = 59;
const OUTER_STROKE = 2.4;
/** The dashed inner ring, in the ring colour. */
const INNER_RADIUS = 52;
const INNER_STROKE = 1;
export const BOOKLET_INNER_DASH = '3 3';
/** The artist's baseline, over the top. */
const ARTIST_RADIUS = 42.16;
/** The glyph's 24-unit grid, centred across and set slightly low. */
const GLYPH_BOX = 39.68;
const GLYPH_X = (VIEWBOX - GLYPH_BOX) / 2;
const GLYPH_Y = 44.64;
/** In glyph-grid units. */
const GLYPH_STROKE = 1.7;
/** The straight date's baseline. */
const DATE_Y = 104.16;
const STAMP_OPACITY = 0.95;
const GLOW_BLUR = 8;
/** Past this, an artist name no longer fits the top arc (9.3 mono at 1.5 tracking). */
const MAX_ARTIST_CHARS = 18;

const topArc = (radius: number): string =>
  `M ${CENTRE - radius} ${CENTRE} A ${radius} ${radius} 0 0 1 ${CENTRE + radius} ${CENTRE}`;

const fitArtist = (artist: string): string => {
  const upper = artist.toUpperCase();
  return upper.length > MAX_ARTIST_CHARS
    ? `${upper.slice(0, MAX_ARTIST_CHARS - 1).trimEnd()}…`
    : upper;
};

/**
 * The booklet's hand-stamped tilts, by slot (addendum 2 item 3, Hugh
 * 2026-11-12): round stamps stay straight everywhere except inside the
 * Passport booklet, where each slot keeps its tilt, repeating every four.
 */
export const BOOKLET_TILTS = [-8, 6, 4, -5] as const;

export const slotTilt = (slotIndex: number): number =>
  BOOKLET_TILTS[slotIndex % BOOKLET_TILTS.length] ?? 0;

const tiltStyle = (tilt: number) =>
  tilt === 0 ? undefined : `rotate(${tilt}deg)`;

interface BookletStampProps {
  show: HistoryShow;
  size: number;
  /** Degrees; the slot's booklet tilt. */
  tilt?: number;
}

/**
 * A night in the booklet, drawn as the passport boards draw it (B+ rule 4, in
 * the venue's colours): a solid outer ring and a dashed inner ring, the artist
 * on the top arc, the bare venue glyph, and a straight date beneath it. The
 * whole stamp takes its slot's booklet tilt; the straight date is what lets
 * the tilt read on a concentric face.
 */
export function BookletStamp({ show, size, tilt = 0 }: BookletStampProps) {
  const uid = useId().replace(/:/g, '');
  const colors = stampColorsFor(show.venueSlug);
  const glyphKey = venueGlyphKey(show.venueSlug);
  const date = stampDateParts(show.date);
  const topId = `bs${uid}t`;
  const scale = size / VIEWBOX;

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
        transform: tiltStyle(tilt),
        opacity: STAMP_OPACITY,
        filter: stampGlowFor(colors.ring, GLOW_BLUR),
      }}
    >
      {glyphKey === null && (
        <span
          data-booklet-stamp-fallback=""
          style={{
            position: 'absolute',
            left: GLYPH_X * scale,
            top: GLYPH_Y * scale,
            width: GLYPH_BOX * scale,
            height: GLYPH_BOX * scale,
            borderRadius: '50%',
            overflow: 'hidden',
          }}
        >
          <IdentityArt
            name={show.venueName}
            kind="venue"
            scale="tile"
            grain={0.08}
            width="100%"
            height="100%"
          />
        </span>
      )}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        aria-hidden="true"
        focusable="false"
        style={{ position: 'absolute', inset: 0, display: 'block' }}
      >
        <defs>
          <path id={topId} d={topArc(ARTIST_RADIUS)} />
        </defs>
        <circle
          data-booklet-ring=""
          cx={CENTRE}
          cy={CENTRE}
          r={OUTER_RADIUS}
          fill="none"
          stroke={colors.ring}
          strokeWidth={OUTER_STROKE}
        />
        <circle
          data-booklet-inner-ring=""
          cx={CENTRE}
          cy={CENTRE}
          r={INNER_RADIUS}
          fill="none"
          stroke={colors.ring}
          strokeWidth={INNER_STROKE}
          strokeDasharray={BOOKLET_INNER_DASH}
        />
        <text
          data-booklet-artist=""
          fill={colors.ring}
          fontFamily="var(--font-mono)"
          fontSize={9.3}
          fontWeight={700}
          letterSpacing={1.5}
        >
          <textPath href={`#${topId}`} startOffset="50%" textAnchor="middle">
            {fitArtist(show.artist)}
          </textPath>
        </text>
        {glyphKey !== null && (
          <svg
            x={GLYPH_X}
            y={GLYPH_Y}
            width={GLYPH_BOX}
            height={GLYPH_BOX}
            viewBox="0 0 24 24"
            data-venue-glyph={glyphKey}
          >
            <GlyphShapes
              glyphKey={glyphKey}
              paint={colors.glyph}
              strokeWidth={GLYPH_STROKE}
            />
          </svg>
        )}
        {date !== null && (
          <text
            data-booklet-date=""
            x={CENTRE}
            y={DATE_Y}
            textAnchor="middle"
            fill={colors.ring}
            fontFamily="var(--font-mono)"
            fontSize={10.5}
            fontWeight={700}
            letterSpacing={2}
          >
            {`${date.month} ${date.day}`}
          </text>
        )}
      </svg>
    </span>
  );
}

/**
 * The slot the next stamp lands in: a faint ring, its dashed stamp, the date.
 * Straight, never tilted: it has not been stamped yet, so there is no hand to
 * have tilted it (addendum 4 item 8, `passport-next-d`).
 */
export function NextSlot({ show, size }: Omit<BookletStampProps, 'tilt'>) {
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
      {/* The kit's `ghost_stamp`: the venue's own tile in greyscale, not yet
          stamped, so neither coloured nor tilted. */}
      <span
        data-booklet-ghost=""
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          filter: 'grayscale(1)',
          opacity: 0.75,
        }}
      >
        <VenueTile
          slug={show.venueSlug}
          name={show.venueName}
          size={Math.round(size * 0.36)}
        />
      </span>
      {date !== null && (
        <span className="font-mono text-[10px] tracking-[0.14em] text-fg-subtle">
          {`${date.month} ${date.day}`}
        </span>
      )}
    </span>
  );
}

/** A slot no night has reached yet. */
export function EmptySlot({ size, tilt = 0 }: { size: number; tilt?: number }) {
  return (
    <span
      aria-hidden="true"
      data-booklet-empty=""
      className="block rounded-full border border-dashed border-border"
      style={{ width: size, height: size, transform: tiltStyle(tilt) }}
    />
  );
}
