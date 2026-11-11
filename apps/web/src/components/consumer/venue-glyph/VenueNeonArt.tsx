import { useId } from 'react';

import { cn } from '@/lib/utils';

import { VENUE_GLYPHS, type VenueGlyphKey } from './definitions/glyphs';
import { GlyphGradient, GlyphShapes } from './VenueGlyph';

/**
 * The night the sign hangs in. Fixed rather than the theme's ground for the
 * same reason as the tile's ground (`VenueTile`): the neon is the venue's
 * sign, and its pale gradients vanish on the Light theme's ground. The page
 * blends the panel into the theme with its own scrim.
 */
const NIGHT_GROUND = '#0B0D1F';

interface VenueNeonArtProps {
  glyphKey: VenueGlyphKey;
  /** Edge of the glyph's square, px. */
  glyphSize: number;
  /**
   * Where the sign sits: always centred, or centred on a phone and toward the
   * right from `sm` up, where the page title takes the left.
   */
  align?: 'center' | 'endFromSm';
  className?: string;
}

/**
 * The venue page hero art (B+ README rule 5, `10-venue-art`): the venue's own
 * glyph drawn large in neon on a quiet backdrop tinted in its two colours.
 * Built from the same glyph shapes as the tile rather than the handoff's
 * per-venue hero HTML, so a glyph fix lands in both. Fills its positioned
 * parent. Decorative: the page states the venue's name.
 */
export function VenueNeonArt({
  glyphKey,
  glyphSize,
  align = 'center',
  className,
}: VenueNeonArtProps) {
  const uid = useId().replace(/:/g, '');
  const gradientId = `vn${uid}g`;
  const glowId = `vn${uid}f`;
  const { from, to } = VENUE_GLYPHS[glyphKey];
  const discSize = Math.round(glyphSize * 1.45);

  return (
    <div
      aria-hidden="true"
      data-venue-neon={glyphKey}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: [
          `radial-gradient(70% 90% at 15% 15%, color-mix(in oklch, ${from} 22%, transparent), transparent)`,
          `linear-gradient(180deg, ${NIGHT_GROUND}, color-mix(in oklch, ${to} 18%, ${NIGHT_GROUND}))`,
        ].join(', '),
      }}
    >
      {/* Brick courses, the quiet backdrop the boards draw behind every sign. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.07,
          backgroundImage: [
            `repeating-linear-gradient(0deg, transparent 0 12px, ${NIGHT_GROUND} 12px 16px)`,
            `repeating-linear-gradient(90deg, ${to} 0 40px, transparent 40px 44px)`,
          ].join(', '),
          maskImage: 'linear-gradient(180deg, transparent, #000)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent, #000)',
        }}
      />
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center',
          align === 'endFromSm' && 'sm:justify-end sm:pr-[14%]',
        )}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: discSize,
            height: discSize,
            borderRadius: '50%',
            background: `radial-gradient(circle, color-mix(in oklch, ${to} 22%, transparent) 0%, color-mix(in oklch, ${from} 12%, transparent) 62%, transparent 72%)`,
          }}
        >
          <svg
            width={glyphSize}
            height={glyphSize}
            viewBox="-2 -2 28 28"
            focusable="false"
            data-venue-glyph={glyphKey}
            style={{ overflow: 'visible' }}
          >
            <defs>
              <GlyphGradient id={gradientId} glyphKey={glyphKey} />
              <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="0.45" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g filter={`url(#${glowId})`}>
              <GlyphShapes
                glyphKey={glyphKey}
                paint={`url(#${gradientId})`}
                strokeWidth={0.9}
              />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
