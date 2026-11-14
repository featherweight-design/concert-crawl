import { useId } from 'react';

import { cn } from '@/lib/utils';

import { VENUE_GLYPHS, type VenueGlyphKey } from './definitions/glyphs';
import {
  VENUE_HERO_SETTINGS,
  type VenueHeroSetting,
} from './definitions/venue-settings';
import { VENUE_NEON } from './definitions/venue-neon';
import { VenueBackdrop } from './VenueBackdrop';
import { GlyphShapes } from './VenueGlyph';

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
 * Each stroke carries its own board colour (`VENUE_NEON`, read off the
 * handoff's per-venue hero HTML), the way the boards draw it; the tile keeps
 * its two-stop gradient. Built from the same glyph shapes as the tile, so a
 * glyph fix lands in both. Fills its positioned
 * parent. Decorative: the page states the venue's name.
 *
 * The night the sign hangs in is the venue's own near-black
 * (`VENUE_NEON[key].ground`), fixed rather than the theme's ground for the same
 * reason as the tile's ground (`VenueTile`): the neon is the venue's sign, and
 * its pale colours vanish on the Light theme's ground. The page blends the
 * panel into the theme with its own scrim. The tints are the board's: the
 * venue's `to` at 22% by the bottom edge, and its `from` at 28% in a radial
 * centred 15% across and 20% down, reaching 0 at 0.7 of the box.
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
  const glowId = `vn${uid}f`;
  const skyId = `vn${uid}k`;
  const glowTintId = `vn${uid}r`;
  const { from, to } = VENUE_GLYPHS[glyphKey];
  const { ground, halo } = VENUE_NEON[glyphKey];
  // The venue page hero passes the sm size too; the flagship cards do not. The
  // audit's neon-fill row is for the hero, so the cards keep the flat glyph
  // fill they have always had. Both draw the board's two halo discs.
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
        background: ground,
      }}
    >
      {/* The board's two tint rects, stretched over the box: an svg gradient
          rather than a css one, so the stops interpolate the way the board's do. */}
      <svg
        viewBox="0 0 1200 420"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
        data-venue-ground={ground}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      >
        <defs>
          <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={ground} />
            <stop offset="1" stopColor={to} stopOpacity={0.22} />
          </linearGradient>
          <radialGradient id={glowTintId} cx="0.15" cy="0.2" r="0.7">
            <stop offset="0" stopColor={from} stopOpacity={0.28} />
            <stop offset="1" stopColor={from} stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width="1200" height="420" fill={ground} />
        <rect width="1200" height="420" fill={`url(#${skyId})`} />
        <rect width="1200" height="420" fill={`url(#${glowTintId})`} />
      </svg>
      <VenueBackdrop
        setting={setting}
        from={from}
        to={to}
        ground={ground}
        uid={uid}
        wide={responsive}
      />
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center',
          align === 'endFromSm' && 'lg:justify-end lg:pr-[14%]',
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
            responsive ? 'w-(--vn-size) lg:w-(--vn-size-sm)' : undefined
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
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.45" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Two flat halo discs spanning the glyph box (r210 and r130 of the
              board's 420), in the pair the venue's hero board draws. The
              venues-index boards draw the same pair, at the same size in glyph
              units, behind the flagship card's sign. */}
          <circle
            data-venue-halo="outer"
            cx={12}
            cy={12}
            r={14}
            fill={halo.outer}
            fillOpacity={0.1}
          />
          <circle
            data-venue-halo="inner"
            cx={12}
            cy={12}
            r={8.67}
            fill={halo.inner}
            fillOpacity={0.1}
          />
          <g filter={`url(#${glowId})`}>
            {/* Every shape strokes in its own board colour, so the group's
                paint is `none`: a shape with no colour would not draw, and the
                test that every glyph is covered catches it. The glow takes each
                stroke's colour because it blurs the source graphic. */}
            <GlyphShapes
              glyphKey={glyphKey}
              paint="none"
              strokeWidth={0.9}
              neonFilled={responsive}
              multicolour
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
