import { ia_getInitials } from '@/components/consumer/identity-art/IdentityArt';
import { venueGlyphKey } from '@/components/consumer/venue-glyph';
import { GlyphShapes } from '@/components/consumer/venue-glyph/VenueGlyph';
import { stampAccentFor } from '@/lib/stamp-accent';

export type VenueStampVariant = 'solid' | 'dashed';

/** The dash pattern an upcoming show's ring is drawn with, in viewBox units. */
export const DASHED_RING = '3.2 2.6';

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
 * The stamp's ink colour. "Yes, going" is filled with it (B+ rule 4), so a
 * caller can match the stamp without rendering one.
 */
export const stampColor = (seed: string): string => stampAccentFor(seed);

/**
 * The Passport ink stamp (B+ rule 4): a venue ring with the venue's glyph,
 * inked in the show's accent and never tilted. A venue without a glyph gets the
 * ring with its initials instead.
 */
export function VenueStamp({
  venueSlug,
  venueName,
  seed,
  variant = 'solid',
  size = 28,
  labelled = false,
}: VenueStampProps) {
  const ink = stampColor(seed);
  const glyphKey = venueGlyphKey(venueSlug);
  const dashed = variant === 'dashed';
  const a11y = labelled
    ? { role: 'img', 'aria-label': venueName }
    : { 'aria-hidden': true };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      focusable="false"
      style={{ display: 'block', flexShrink: 0 }}
      data-venue-stamp={variant}
      {...a11y}
    >
      <circle
        cx="20"
        cy="20"
        r="18.4"
        fill="none"
        stroke={ink}
        strokeWidth="1.6"
        strokeDasharray={dashed ? DASHED_RING : undefined}
        strokeLinecap={dashed ? 'round' : undefined}
      />
      <g opacity={dashed ? 0.7 : 1}>
        {glyphKey === null ? (
          <text
            x="20"
            y="20"
            dy="0.35em"
            textAnchor="middle"
            fill={ink}
            fontSize="13"
            fontWeight="700"
            fontFamily="var(--font-mono, ui-monospace, monospace)"
            data-venue-stamp-fallback=""
          >
            {ia_getInitials(venueName, 2)}
          </text>
        ) : (
          <g
            transform="translate(9.2 9.2) scale(0.9)"
            data-venue-glyph={glyphKey}
          >
            <GlyphShapes glyphKey={glyphKey} paint={ink} />
          </g>
        )}
      </g>
    </svg>
  );
}
