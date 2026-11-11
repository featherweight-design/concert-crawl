import { IdentityArt } from '@/components/consumer/identity-art/IdentityArt';
import { venueGlyphKey } from '@/components/consumer/venue-glyph';
import { GlyphShapes } from '@/components/consumer/venue-glyph/VenueGlyph';
import { stampAccentFor } from '@/lib/passport/stamp';

export type VenueStampVariant = 'solid' | 'dashed';

/** The dash pattern an upcoming show's ring is drawn with, in viewBox units. */
export const DASHED_RING = '3.2 2.6';

/** How far an upcoming show's whole stamp is dimmed. */
export const DASHED_OPACITY = 0.7;

const VIEWBOX = 40;
const RING_RADIUS = 18.4;
const RING_STROKE = 1.6;
/** The glyph's 24-unit grid drawn at 21.6 units, centred in the ring. */
const GLYPH_BOX = 21.6;
const GLYPH_OFFSET = (VIEWBOX - GLYPH_BOX) / 2;
const GLYPH_STROKE = 1.13;

/**
 * The glyph's stroke in grid units, thickened so it never renders thinner
 * than 1 CSS px at small sizes.
 */
export const glyphStrokeFor = (size: number): number => {
  const onePx = 1 / ((size / VIEWBOX) * (GLYPH_BOX / 24));
  // Rounded up to 0.01 so the stroke lands on or above 1px, never just under.
  return Math.max(GLYPH_STROKE, Math.ceil(onePx * 100) / 100);
};

/**
 * The accent pulled toward the theme's text colour: 55% accent holds at least
 * 3.7:1 against `--surface-2` on all nine themes, where the pale accents on
 * their own wash out on the light theme.
 */
const inkFor = (accent: string): string =>
  `color-mix(in oklch, ${accent} 55%, var(--fg))`;

interface VenueStampProps {
  /** The venue's slug, which picks its glyph. */
  venueSlug: string;
  /** The venue's display name, for the label and a venue with no glyph. */
  venueName: string;
  /** What the accent hashes on: the same seed StubStamp takes (the artist). */
  seed: string;
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
 * The Passport ink stamp (B+ rule 4): a venue ring with the venue's glyph,
 * inked in the show's accent and never tilted. A venue without a glyph gets
 * its identity art clipped to the ring, so venue imagery stays on one chain.
 */
export function VenueStamp({
  venueSlug,
  venueName,
  seed,
  variant = 'solid',
  size = 28,
  labelled = false,
}: VenueStampProps) {
  const ink = inkFor(stampAccentFor(seed));
  const glyphKey = venueGlyphKey(venueSlug);
  const dashed = variant === 'dashed';
  const a11y = labelled
    ? { role: 'img', 'aria-label': venueName }
    : { 'aria-hidden': true };
  const artInset = (size * (VIEWBOX / 2 - RING_RADIUS)) / VIEWBOX;

  return (
    <span
      data-venue-stamp={variant}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: size,
        height: size,
        flexShrink: 0,
        opacity: dashed ? DASHED_OPACITY : undefined,
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
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        aria-hidden="true"
        focusable="false"
        style={{ position: 'absolute', inset: 0, display: 'block' }}
      >
        <circle
          data-venue-stamp-ring=""
          cx={VIEWBOX / 2}
          cy={VIEWBOX / 2}
          r={RING_RADIUS}
          fill={glyphKey === null ? 'none' : 'var(--surface-2)'}
          stroke={ink}
          strokeWidth={RING_STROKE}
          strokeDasharray={dashed ? DASHED_RING : undefined}
          strokeLinecap={dashed ? 'round' : undefined}
        />
        {glyphKey !== null && (
          <svg
            x={GLYPH_OFFSET}
            y={GLYPH_OFFSET}
            width={GLYPH_BOX}
            height={GLYPH_BOX}
            viewBox="0 0 24 24"
            data-venue-glyph={glyphKey}
          >
            <GlyphShapes
              glyphKey={glyphKey}
              paint={ink}
              strokeWidth={glyphStrokeFor(size)}
            />
          </svg>
        )}
      </svg>
    </span>
  );
}
