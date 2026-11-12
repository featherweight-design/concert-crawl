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
  // Keyed by a normalised form so "Soul", "soul " and "soul" count as one
  // genre; the chip shows the first spelling we met.
  const counts = new Map<string, { label: string; count: number }>();
  for (const show of shows) {
    const seen = new Set<string>();
    for (const raw of show.genres) {
      const label = raw.trim();
      const key = label.toLowerCase();
      if (key === '' || seen.has(key)) continue;
      seen.add(key);
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { label, count: 1 });
    }
  }
  // Map iteration keeps insertion order and the sort is stable, so equal
  // counts stay in first-seen order.
  return [...counts.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, limit)
    .map(({ label }) => label);
};
