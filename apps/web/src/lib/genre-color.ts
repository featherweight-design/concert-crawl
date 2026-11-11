import { bucketForGenre } from '@concert-crawl/types';

/**
 * The color of a raw genre (as stored on `events.genre`), as a CSS value: the
 * `--genre-<bucket>` token its Vibe bucket owns. An unbucketed genre has no
 * color, so callers fall back to a neutral rather than guessing one.
 */
export function genreColor(rawGenre: string | null | undefined): string | null {
  if (!rawGenre) return null;
  const bucket = bucketForGenre(rawGenre);
  return bucket ? `var(--genre-${bucket})` : null;
}

/**
 * The ring and edge color for an ungenred show. A chip's dot falls back to
 * `--fg-subtle` instead: this hairline token would vanish on the chip's fill.
 */
export const NEUTRAL_GENRE_COLOR = 'var(--border-strong)';
