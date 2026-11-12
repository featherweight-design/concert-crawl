import { useId } from 'react';

import { VENUE_GLYPHS, type VenueGlyphKey } from './definitions/glyphs';
import { VENUE_NEON } from './definitions/venue-neon';

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
  neonFilled = false,
  multicolour = false,
}: {
  glyphKey: VenueGlyphKey;
  paint: string;
  /** In glyph-grid units. A caller drawing the glyph small thickens it to stay legible. */
  strokeWidth?: number;
  /**
   * The hero's treatment of a `filled` shape: a 30% fill in the venue's second
   * colour under a solid 5.25px stroke in its first, a tube rather than the
   * tile's flat silhouette.
   */
  neonFilled?: boolean;
  /**
   * The neon boards' treatment: every shape strokes in its own colour from
   * `VENUE_NEON` (a filled shape fills in the venue's `fillColor`) instead of
   * all of them sharing `paint`. The tile and the stamps leave it off.
   */
  multicolour?: boolean;
}) {
  const { from, to } = VENUE_GLYPHS[glyphKey];
  const neon = multicolour ? VENUE_NEON[glyphKey] : null;
  return (
    <g
      fill="none"
      stroke={paint}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {VENUE_GLYPHS[glyphKey].shapes.map((shape, i) => {
        const colour = neon?.shapeColors[i];
        if (shape.kind === 'circle') {
          return (
            <circle
              key={i}
              cx={shape.cx}
              cy={shape.cy}
              r={shape.radius}
              stroke={colour}
            />
          );
        }
        if (shape.filled && neonFilled) {
          return (
            <path
              key={i}
              d={shape.pathData}
              transform={shape.transform}
              fill={neon?.fillColor ?? to}
              fillOpacity={0.3}
              stroke={colour ?? from}
              strokeWidth={5.25}
              vectorEffect="non-scaling-stroke"
            />
          );
        }
        return (
          <path
            key={i}
            d={shape.pathData}
            transform={shape.transform}
            fill={shape.filled ? (neon?.fillColor ?? paint) : undefined}
            stroke={shape.filled ? 'none' : colour}
          />
        );
      })}
    </g>
  );
}
