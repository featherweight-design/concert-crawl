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
  /**
   * The edge's weight in rendered pixels. Unset keeps the tile's 1.6-unit edge
   * in its 96 viewBox (about 0.57px at 34px); the invite landing's proof row
   * sets 1.2 so the edge renders at the board's weight at any size.
   */
  edgeWeight?: number;
  /**
   * Draws each glyph shape in its own neon colour (`VENUE_NEON`, as the hero
   * and the Where popover boards do) instead of one gradient across the glyph.
   */
  multicolour?: boolean;
}

/**
 * The corner radius, in viewBox units, of the 1.2px-edge board tile: 22% of the
 * tile (6.6px at 30). The viewBox scales with `size`, so the rendered radius is
 * always 0.22 * size px (the stroke centreline; the outer edge adds half the edge).
 */
const WEIGHTED_RADIUS = 21.12;

/**
 * The venue icon tile: a rounded square edged in the venue's gradient, with its
 * glyph. A venue without a glyph gets the same square with no glyph.
 */
export function VenueTile({
  slug,
  name,
  size = 40,
  labelled = false,
  edgeWeight,
  multicolour = false,
}: VenueTileProps) {
  const weighted = edgeWeight !== undefined;
  const edge = weighted ? (edgeWeight * 96) / size : 1.6;
  const inset = edge / 2;
  const side = 96 - edge;
  const radius = weighted ? WEIGHTED_RADIUS : 22.2;
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
          x={inset}
          y={inset}
          width={side}
          height={side}
          rx={radius}
          fill={TILE_GROUND}
          strokeWidth={edge}
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
        x={inset}
        y={inset}
        width={side}
        height={side}
        rx={radius}
        fill={TILE_GROUND}
        stroke={`url(#${edgeId})`}
        strokeWidth={edge}
      />
      <g transform="translate(12.48 12.48) scale(2.96)">
        <GlyphShapes
          glyphKey={glyphKey}
          paint={`url(#${glyphId})`}
          multicolour={multicolour}
        />
      </g>
    </svg>
  );
}
