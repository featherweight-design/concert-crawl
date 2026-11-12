import { useId } from 'react';

import { cn } from '@/lib/utils';

import { VENUE_GLYPHS, type VenueGlyphKey } from './definitions/glyphs';
import {
  VENUE_HERO_SETTINGS,
  type VenueHeroSetting,
} from './definitions/venue-settings';
import { VenueBackdrop } from './VenueBackdrop';
import { GlyphGradient, GlyphShapes } from './VenueGlyph';

/**
 * The night the sign hangs in. Fixed rather than the theme's ground for the
 * same reason as the tile's ground (`VenueTile`): the neon is the venue's
 * sign, and its pale gradients vanish on the Light theme's ground. The page
 * blends the panel into the theme with its own scrim.
 */
const NIGHT_GROUND = '#0B0D1F'; // fwd-allow-hex: board art colour

interface VenueNeonArtProps {
  glyphKey: VenueGlyphKey;
  /**
   * Edge of the glyph's square, px (the svg draws a 28-unit box around the
   * 24-unit grid, so the grid itself is 24/28 of this).
   */
  glyphSize: number;
  /** A larger edge from `sm` up; omit to keep `glyphSize` at every width. */
  glyphSizeSm?: number;
  /**
   * Where the sign sits: always centred, or centred on a phone and toward the
   * right from `sm` up, where the page title takes the left; or toward the
   * right at every width (the phone flagship card, which keeps its badge on
   * the left).
   */
  align?: 'center' | 'endFromSm' | 'end';
  /** The backdrop family; defaults to the board's assignment for this venue. */
  setting?: VenueHeroSetting;
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
  glyphSizeSm,
  align = 'center',
  setting = VENUE_HERO_SETTINGS[glyphKey],
  className,
}: VenueNeonArtProps) {
  const uid = useId().replace(/:/g, '');
  const gradientId = `vn${uid}g`;
  const glowId = `vn${uid}f`;
  const softId = `vn${uid}s`;
  const { from, to } = VENUE_GLYPHS[glyphKey];
  // The venue page hero passes the sm size too; the flagship cards do not. The
  // audit's halo and neon-fill rows are for the hero, so the cards keep the soft
  // halo and the flat glyph fill they have always had.
  const responsive = glyphSizeSm !== undefined;

  return (
    <div
      aria-hidden="true"
      data-venue-neon={glyphKey}
      data-venue-setting={setting}
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
      <VenueBackdrop setting={setting} from={from} to={to} uid={uid} />
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center',
          align === 'endFromSm' && 'sm:justify-end sm:pr-[14%]',
          align === 'end' && 'justify-end pr-[13%]',
        )}
      >
        <svg
          width={glyphSize}
          height={glyphSize}
          viewBox="-2 -2 28 28"
          focusable="false"
          data-venue-glyph={glyphKey}
          className={
            responsive ? 'w-(--vn-size) sm:w-(--vn-size-sm)' : undefined
          }
          style={{
            overflow: 'visible',
            ...(responsive
              ? {
                  '--vn-size': `${glyphSize}px`,
                  '--vn-size-sm': `${glyphSizeSm}px`,
                  height: 'auto',
                  aspectRatio: '1',
                }
              : null),
          }}
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
            {!responsive && (
              <radialGradient id={softId}>
                <stop offset="0" stopColor={to} stopOpacity={0.22} />
                <stop offset="0.88" stopColor={from} stopOpacity={0.12} />
                <stop offset="1" stopColor={from} stopOpacity={0} />
              </radialGradient>
            )}
          </defs>
          {responsive ? (
            <>
              {/* Two flat halo discs spanning the glyph box (r210 and r130 of
                  the board's 420). */}
              <circle
                data-venue-halo="outer"
                cx={12}
                cy={12}
                r={14}
                fill={to}
                fillOpacity={0.1}
              />
              <circle
                data-venue-halo="inner"
                cx={12}
                cy={12}
                r={8.67}
                fill={from}
                fillOpacity={0.1}
              />
            </>
          ) : (
            // The cards' soft halo: 1.45x the glyph box, fading out at its edge.
            <circle
              data-venue-halo="soft"
              cx={12}
              cy={12}
              r={20.3}
              fill={`url(#${softId})`}
            />
          )}
          <g filter={`url(#${glowId})`}>
            <GlyphShapes
              glyphKey={glyphKey}
              paint={`url(#${gradientId})`}
              strokeWidth={0.9}
              neonFilled={responsive}
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
