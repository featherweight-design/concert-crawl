import { useId, useMemo } from 'react';
import { GLYPH_STROKE_WIDTH, validateGlyphSvg } from '@concert-crawl/types';

import { CUSTOM_NEON, customStrokeColour } from './definitions/custom-neon';
import type { VenueHeroSetting } from './definitions/venue-settings';
import { VenueBackdrop } from './VenueBackdrop';
import { CustomShape } from './VenueGlyph';

interface CustomNeonHeroProps {
  /** The venue's own `glyph_svg`; checked again here, never drawn as HTML. */
  glyphSvg: string;
  /** The backdrop family the glyph hangs in front of. */
  setting: VenueHeroSetting;
  /** Edge of the glyph's square, px. */
  glyphSize: number;
}

/**
 * The venue page hero for a venue whose glyph is its own (not one of the drawn
 * 21): the glyph in neon, one colour per stroke from `CUSTOM_NEON`, over the
 * backdrop for its setting. The Icon step previews it before the glyph is
 * saved. Fills its positioned parent. Decorative.
 */
export function CustomNeonHero({
  glyphSvg,
  setting,
  glyphSize,
}: CustomNeonHeroProps) {
  const uid = useId().replace(/:/g, '');
  const glowId = `cn${uid}f`;
  const checked = useMemo(() => validateGlyphSvg(glyphSvg), [glyphSvg]);
  const { ground, from, to, halo } = CUSTOM_NEON;
  return (
    <div
      aria-hidden="true"
      data-venue-neon="custom"
      data-venue-setting={setting}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: ground,
      }}
    >
      <VenueBackdrop
        setting={setting}
        from={from}
        to={to}
        ground={ground}
        uid={uid}
        wide
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked.ok && (
          <svg
            width={glyphSize}
            height={glyphSize}
            viewBox="-2 -2 28 28"
            focusable="false"
            data-venue-glyph="custom"
            style={{ overflow: 'visible' }}
          >
            <defs>
              <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="0.45" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <circle
              cx={12}
              cy={12}
              r={14}
              fill={halo.outer}
              fillOpacity={0.1}
            />
            <circle
              cx={12}
              cy={12}
              r={8.67}
              fill={halo.inner}
              fillOpacity={0.1}
            />
            <g
              filter={`url(#${glowId})`}
              fill="none"
              strokeWidth={GLYPH_STROKE_WIDTH * 0.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {checked.shapes.map((shape, i) => (
                <g key={i} stroke={customStrokeColour(i)}>
                  <CustomShape shape={shape} />
                </g>
              ))}
            </g>
          </svg>
        )}
      </div>
    </div>
  );
}
