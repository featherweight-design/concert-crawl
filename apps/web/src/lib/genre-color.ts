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

/** The ring, edge and dot color for a neutral or ungenred show. */
export const NEUTRAL_GENRE_COLOR = 'var(--border-strong)';
