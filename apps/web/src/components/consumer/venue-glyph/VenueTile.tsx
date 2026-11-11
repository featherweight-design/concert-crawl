import { useId } from 'react';

import { VENUE_GLYPHS } from './definitions/glyphs';
import { venueGlyphKey } from './definitions/venue-glyph-keys';
import { GlyphGradient, GlyphShapes } from './VenueGlyph';

interface VenueTileProps {
  slug: string;
  /** The venue's display name. Its first letter marks the fallback tile. */
  name: string;
  size?: number;
  /**
   * Whether the tile names the venue to assistive tech. Off by default, since a
   * tile normally sits beside the venue's name, which already says it.
   */
  labelled?: boolean;
}

/**
 * The venue icon tile: a rounded square on the theme's `--surface-1`, edged in
 * the venue's gradient, with its glyph. A venue without a glyph gets a neutral
 * tile marked with its initial, never a broken image.
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
          fill="var(--surface-1)"
          stroke="var(--border-strong)"
          strokeWidth="1.6"
        />
        <text
          x="48"
          y="48"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="40"
          fontWeight="600"
          fill="var(--fg-muted)"
        >
          {name.trim().charAt(0).toUpperCase()}
        </text>
      </svg>
    );
  }

  const { from, to } = VENUE_GLYPHS[glyphKey];
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
        <linearGradient id={edgeId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <GlyphGradient id={glyphId} glyphKey={glyphKey} />
      </defs>
      <rect
        x="0.8"
        y="0.8"
        width="94.4"
        height="94.4"
        rx="22.2"
        fill="var(--surface-1)"
        stroke={`url(#${edgeId})`}
        strokeWidth="1.6"
      />
      <g transform="translate(12.48 12.48) scale(2.96)">
        <GlyphShapes glyphKey={glyphKey} paint={`url(#${glyphId})`} />
      </g>
    </svg>
  );
}
