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

/** A user-space gradient across the 24×24 glyph grid, as in the assets. */
export function GlyphGradient({
  id,
  glyphKey,
}: {
  id: string;
  glyphKey: VenueGlyphKey;
}) {
  const { from, to } = VENUE_GLYPHS[glyphKey];
  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1="0"
      y1="0"
      x2="24"
      y2="24"
    >
      <stop offset="0" stopColor={from} />
      <stop offset="1" stopColor={to} />
    </linearGradient>
  );
}

export function GlyphShapes({
  glyphKey,
  paint,
}: {
  glyphKey: VenueGlyphKey;
  paint: string;
}) {
  return (
    <g
      fill="none"
      stroke={paint}
      strokeWidth={1.13}
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
            {...(shape.filled === true && { fill: paint, stroke: 'none' })}
          />
        ),
      )}
    </g>
  );
}
