import type { CSSProperties } from 'react';
import { NEUTRAL_GENRE_COLOR } from '@/lib/genre-color';

// The ★ Tonight spotlight's drawn layers, from addendum-2 `shelf-see-all-m`
// and `15-320px/browse-active-320` (the hero block). Board rgba(14,18,38,…) is
// `--bg-elevated`, written as a color-mix so the themes carry it.

/**
 * The spotlight's outer glow: 40px in its lead genre at 18%. An ungenred show
 * gets none, the rule `genreRing` and `stageRing` follow (addendum-2 item 23).
 */
export const spotlightGlow = (genre: string): string =>
  genre === NEUTRAL_GENRE_COLOR
    ? 'none'
    : `0 0 40px color-mix(in oklch, ${genre} 18%, transparent)`;

/**
 * The card: the elevated fill, a 1px edge running genre into accent into the
 * border by 135deg, and the genre glow.
 */
export const heroFrame = (genre: string): CSSProperties => ({
  border: '1px solid transparent',
  background: `linear-gradient(var(--bg-elevated), var(--bg-elevated)) padding-box, linear-gradient(135deg, ${genre}, var(--accent) 50%, var(--border)) border-box`,
  boxShadow: spotlightGlow(genre),
});

/** The photo behind the card: 40px past every edge, blurred and saturated. */
export const HERO_BACKDROP_STYLE: CSSProperties = {
  top: -40,
  right: -40,
  bottom: -40,
  left: -40,
  filter: 'blur(36px) saturate(1.5)',
  opacity: 0.3,
};

/**
 * Over the photo: a genre radial at 30% off the art side, and a left-to-right
 * fade into the elevated fill so the text column reads.
 */
export const heroWash = (genre: string): string =>
  `radial-gradient(ellipse 80% 140% at 12% 50%, color-mix(in oklch, ${genre} 42%, transparent), transparent 75%), linear-gradient(90deg, transparent, color-mix(in oklch, var(--bg-elevated) 88%, transparent) 60%)`;
