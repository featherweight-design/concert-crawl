import { useId } from 'react';

import { venueGlyphKey } from './definitions/venue-glyph-keys';
import { GlyphGradient, GlyphShapes } from './VenueGlyph';

/**
 * The tile ground the glyphs were drawn on. Fixed rather than the theme's
 * surface: the tile is the venue's icon, like an app icon, and its pale glyph
 * gradients vanish on a light theme's ground.
 */
const TILE_GROUND = '#11162E'; // fwd-allow-hex: board art colour

interface VenueTileProps {
  slug: string;
  /** The venue's display name, for the label and a venue with no glyph. */
  name: string;
  size?: number;
  /**
   * Whether the tile names the venue to assistive tech. Off by default, since a
   * tile normally sits beside the venue's name, which already says it.
   */
  labelled?: boolean;
}

/**
 * The venue icon tile: a rounded square edged in the venue's gradient, with its
 * glyph. A venue without a glyph gets the same square with no glyph.
 */
export function VenueTile({
  slug,
  name,
  size = 40,
  labelled = false,
}: VenueTileProps) {
  const uid = useId().replace(/:/g, '');
  const glyphKey = venueGlyphKey(slug);
  const a11y = labelled
    ? { role: 'img', 'aria-label': name }
    : { 'aria-hidden': true };

  if (glyphKey === null) {
    // The README's "neutral fallback tile for any future venue": the same
    // rounded square as the glyph tiles, with no glyph and a quiet edge.
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 96 96"
        focusable="false"
        data-venue-tile="fallback"
        {...a11y}
      >
        <rect
          x="0.8"
          y="0.8"
          width="94.4"
          height="94.4"
          rx="22.2"
          fill={TILE_GROUND}
          strokeWidth="1.6"
          style={{ stroke: 'var(--border-strong)' }}
        />
      </svg>
    );
  }

  const edgeId = `vt${uid}e`;
  const glyphId = `vt${uid}g`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      focusable="false"
      data-venue-tile={glyphKey}
      {...a11y}
    >
      <defs>
        <GlyphGradient id={edgeId} glyphKey={glyphKey} span={96} />
        <GlyphGradient id={glyphId} glyphKey={glyphKey} />
      </defs>
      <rect
        x="0.8"
        y="0.8"
        width="94.4"
        height="94.4"
        rx="22.2"
        fill={TILE_GROUND}
        stroke={`url(#${edgeId})`}
        strokeWidth="1.6"
      />
      <g transform="translate(12.48 12.48) scale(2.96)">
        <GlyphShapes glyphKey={glyphKey} paint={`url(#${glyphId})`} />
      </g>
    </svg>
  );
}
