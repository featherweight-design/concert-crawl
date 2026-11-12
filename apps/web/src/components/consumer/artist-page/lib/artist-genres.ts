import type { ArtistShow } from '@concert-crawl/types';

/** The board draws two chips under the name; more would wrap at 320px. */
export const ARTIST_GENRE_LIMIT = 2;

/**
 * The artist's genres, read off their upcoming shows: the payload carries no
 * artist-level genre, and the shows are what Browse colors them by, so the
 * page and the rows can never disagree. Most frequent first, ties broken by
 * first appearance (the soonest show). No shows means no chips and the
 * neutral ring, rather than a guessed genre.
 */
export const artistGenres = (
  shows: readonly ArtistShow[],
  limit = ARTIST_GENRE_LIMIT,
): string[] => {
  const counts = new Map<string, number>();
  for (const show of shows) {
    for (const genre of new Set(show.genres)) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  // Map iteration keeps insertion order and the sort is stable, so equal
  // counts stay in first-seen order.
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([genre]) => genre);
};
