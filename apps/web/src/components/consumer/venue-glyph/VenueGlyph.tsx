import { useId } from 'react';

import { VENUE_GLYPHS, type VenueGlyphKey } from './definitions/glyphs';

interface VenueGlyphProps {
  glyphKey: VenueGlyphKey;
  size?: number;
}

/** The glyph alone, on a 24×24 grid, stroked in its venue's gradient. Decorative. */
export function VenueGlyph({ glyphKey, size = 24 }: VenueGlyphProps) {
  const gradientId = `vg${useId().replace(/:/g, '')}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      data-venue-glyph={glyphKey}
    >
      <defs>
        <GlyphGradient id={gradientId} glyphKey={glyphKey} />
      </defs>
      <GlyphShapes glyphKey={glyphKey} paint={`url(#${gradientId})`} />
    </svg>
  );
}

/**
 * The venue's two-stop gradient, corner to corner across a `span`-unit square
 * in user space: the 24-unit glyph grid by default, or the 96-unit tile edge.
 */
export function GlyphGradient({
  id,
  glyphKey,
  span = 24,
}: {
  id: string;
  glyphKey: VenueGlyphKey;
  span?: number;
}) {
  const { from, to } = VENUE_GLYPHS[glyphKey];
  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1="0"
      y1="0"
      x2={span}
      y2={span}
    >
      <stop offset="0" stopColor={from} />
      <stop offset="1" stopColor={to} />
    </linearGradient>
  );
}

export function GlyphShapes({
  glyphKey,
  paint,
  strokeWidth = 1.13,
}: {
  glyphKey: VenueGlyphKey;
  paint: string;
  /** In glyph-grid units. A caller drawing the glyph small thickens it to stay legible. */
  strokeWidth?: number;
}) {
  return (
    <g
      fill="none"
      stroke={paint}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {VENUE_GLYPHS[glyphKey].shapes.map((shape, i) =>
        shape.kind === 'circle' ? (
          <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.radius} />
        ) : (
          <path
            key={i}
            d={shape.pathData}
            transform={shape.transform}
            fill={shape.filled ? paint : undefined}
            stroke={shape.filled ? 'none' : undefined}
          />
        ),
      )}
    </g>
  );
}
