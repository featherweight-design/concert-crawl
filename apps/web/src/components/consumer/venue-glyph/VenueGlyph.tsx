import { useId, useMemo } from 'react';
import {
  GLYPH_STROKE_WIDTH,
  validateGlyphSvg,
  type GlyphSvgShape,
} from '@concert-crawl/types';

import { VENUE_GLYPHS, type VenueGlyphKey } from './definitions/glyphs';
import { VENUE_NEON } from './definitions/venue-neon';

interface VenueGlyphProps {
  /** One of the drawn set; null for a venue outside it. */
  glyphKey: VenueGlyphKey | null;
  /**
   * The venue's own `glyph_svg` (admin 3d), drawn when it has no key. It is
   * checked again here and rendered from its parsed shapes, never as HTML.
   */
  glyphSvg?: string | null;
  size?: number;
}

/**
 * The glyph alone, on a 24×24 grid, stroked in its venue's gradient. A venue
 * outside the set draws its `glyph_svg` in the current text color; with
 * neither, nothing renders and the caller keeps its own fallback. Decorative.
 */
export function VenueGlyph({ glyphKey, glyphSvg, size = 24 }: VenueGlyphProps) {
  const gradientId = `vg${useId().replace(/:/g, '')}`;
  // Parsed once per string, not on every render of a long list of tiles.
  const checked = useMemo(
    () => (glyphKey === null && glyphSvg ? validateGlyphSvg(glyphSvg) : null),
    [glyphKey, glyphSvg],
  );
  if (glyphKey === null) {
    if (!checked?.ok) return null;
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        data-venue-glyph="custom"
        fill="none"
        stroke="currentColor"
        strokeWidth={GLYPH_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {checked.shapes.map((shape, i) => (
          <CustomShape key={i} shape={shape} />
        ))}
      </svg>
    );
  }
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

/** One validated shape of a custom glyph; it takes the stroke of its parent. */
export function CustomShape({ shape }: { shape: GlyphSvgShape }) {
  switch (shape.tag) {
    case 'path':
      return <path d={shape.d} />;
    case 'circle':
      return <circle cx={shape.cx} cy={shape.cy} r={shape.r} />;
    case 'ellipse':
      return (
        <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />
      );
    case 'line':
      return <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} />;
    case 'polyline':
      return <polyline points={shape.points} />;
    case 'rect':
      return (
        <rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={shape.rx}
        />
      );
  }
}
