import { IdentityArt } from '@/components/consumer/identity-art/IdentityArt';
import { venueGlyphKey } from '@/components/consumer/venue-glyph';
import { GlyphShapes } from '@/components/consumer/venue-glyph/VenueGlyph';
import { stampColorsFor, stampGlowFor } from '@/lib/passport/stamp';

export type VenueStampVariant = 'solid' | 'dashed';

// The geometry is the B+ boards' (`addendum-3/04/one-stamp-m`,
// `addendum-2/03/concerts-round-stamps-{d,m}`), in px. The rings keep a fixed
// inset and weight at every size; the glyph scales with the stamp.

/** The outer ring sits this far inside the stamp's edge. */
const OUTER_INSET = 1.5;
const OUTER_STROKE = 2;
/** The dashed inner ring sits this far inside the outer one. */
const INNER_GAP = 4.5;
const INNER_STROKE = 0.9;
export const INNER_DASH = '2.5 2.5';

/** An upcoming show's single ring: `--border-strong`, dashed. */
export const DASHED_RING = '3 3';
const DASHED_STROKE = 1.5;
/** How faint an upcoming show's grey glyph is. */
export const DASHED_GLYPH_OPACITY = 0.38;

/** The glyph's 24-unit grid as a share of the stamp. */
const GLYPH_SHARE = 0.4;
/** In glyph-grid units. */
const GLYPH_STROKE = 1.8;
/** The glow's blur, in px. */
const GLOW_BLUR = 5;

/**
 * The glyph's stroke in grid units: the boards' 1.8, thickened so it never
 * renders thinner than 1 CSS px on a small stamp.
 */
export const glyphStrokeFor = (size: number): number => {
  const onePx = 24 / (size * GLYPH_SHARE);
  // Rounded up to 0.01 so the stroke lands on or above 1px, never just under.
  return Math.max(GLYPH_STROKE, Math.ceil(onePx * 100) / 100);
};

/** The radii of a stamp's rings at a given size, in px. */
export const stampRings = (size: number): { outer: number; inner: number } => {
  const outer = size / 2 - OUTER_INSET;
  return { outer, inner: outer - INNER_GAP };
};

interface VenueStampProps {
  /** The venue's slug, which picks its glyph and its colours. */
  venueSlug: string;
  /** The venue's display name, for the label and a venue with no glyph. */
  venueName: string;
  /** `solid` for an attended show, `dashed` for the stamp an upcoming show will become. */
  variant?: VenueStampVariant;
  size?: number;
  /**
   * Whether the stamp names the venue to assistive tech. Off by default, since
   * the stamp sits beside text that already says it.
   */
  labelled?: boolean;
}

/**
 * The Passport ink stamp (B+ rule 4), drawn as the boards draw it: a solid
 * outer ring and a dashed inner ring in the venue's ring colour, no fill, and
 * the bare venue glyph in its glyph colour, with a soft glow. Never tilted.
 *
 * An upcoming show's stamp is one grey dashed ring around a faint grey glyph.
 * A venue without a glyph gets its identity art clipped inside the rings, so
 * venue imagery stays on one chain.
 */
export function VenueStamp({
  venueSlug,
  venueName,
  variant = 'solid',
  size = 28,
  labelled = false,
}: VenueStampProps) {
  const colors = stampColorsFor(venueSlug);
  const glyphKey = venueGlyphKey(venueSlug);
  const dashed = variant === 'dashed';
  const a11y = labelled
    ? { role: 'img', 'aria-label': venueName }
    : { 'aria-hidden': true };
  const centre = size / 2;
  const rings = stampRings(size);
  const glyphBox = size * GLYPH_SHARE;
  const glyphOffset = (size - glyphBox) / 2;
  const artInset = centre - (dashed ? rings.outer : rings.inner);
  const faint = dashed
    ? { opacity: DASHED_GLYPH_OPACITY, filter: 'grayscale(1)' }
    : undefined;

  return (
    <span
      data-venue-stamp={variant}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: size,
        height: size,
        flexShrink: 0,
      }}
      {...a11y}
    >
      {glyphKey === null && (
        <span
          data-venue-stamp-fallback=""
          style={{
            position: 'absolute',
            inset: artInset,
            borderRadius: '50%',
            overflow: 'hidden',
            ...faint,
          }}
        >
          <IdentityArt
            name={venueName}
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
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        focusable="false"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block',
          filter: dashed ? undefined : stampGlowFor(colors.ring, GLOW_BLUR),
        }}
      >
        {dashed ? (
          <circle
            data-venue-stamp-ring=""
            cx={centre}
            cy={centre}
            r={rings.outer}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth={DASHED_STROKE}
            strokeDasharray={DASHED_RING}
          />
        ) : (
          <>
            <circle
              data-venue-stamp-ring=""
              cx={centre}
              cy={centre}
              r={rings.outer}
              fill="none"
              stroke={colors.ring}
              strokeWidth={OUTER_STROKE}
            />
            <circle
              data-venue-stamp-inner-ring=""
              cx={centre}
              cy={centre}
              r={rings.inner}
              fill="none"
              stroke={colors.ring}
              strokeWidth={INNER_STROKE}
              strokeDasharray={INNER_DASH}
            />
          </>
        )}
        {glyphKey !== null && (
          <g data-venue-stamp-glyph="" style={faint}>
            <svg
              x={glyphOffset}
              y={glyphOffset}
              width={glyphBox}
              height={glyphBox}
              viewBox="0 0 24 24"
              data-venue-glyph={glyphKey}
            >
              <GlyphShapes
                glyphKey={glyphKey}
                paint={dashed ? 'var(--fg-subtle)' : colors.glyph}
                strokeWidth={glyphStrokeFor(size)}
              />
            </svg>
          </g>
        )}
      </svg>
    </span>
  );
}
