import {
  bucketForGenre,
  type ArtistShow,
  type GenreBucket,
} from '@concert-crawl/types';

/** The board draws two chips under the name; more would wrap at 320px. */
export const ARTIST_GENRE_LIMIT = 2;

/**
 * The artist's genres, read off their upcoming shows and mapped to the 16
 * Vibe buckets (addendum 3): the payload carries no artist-level genre, and
 * the buckets are what Browse filters and colors by, so the page and the rows
 * can never disagree. Most frequent first, ties broken by first appearance
 * (the soonest show). A raw genre with no bucket is dropped rather than shown
 * uncolored. No shows means no chips and the neutral ring, rather than a
 * guessed genre.
 */
export const artistGenres = (
  shows: readonly ArtistShow[],
  limit = ARTIST_GENRE_LIMIT,
): GenreBucket[] => {
  const counts = new Map<GenreBucket, number>();
  for (const show of shows) {
    // A bucket counts once per show, however many of its sub-genres the show
    // carries ("soul" and "funk" are both jazz).
    const seen = new Set<GenreBucket>();
    for (const raw of show.genres) {
      const bucket = bucketForGenre(raw);
      if (bucket === null || seen.has(bucket)) continue;
      seen.add(bucket);
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }
  }
  // Map iteration keeps insertion order and the sort is stable, so equal
  // counts stay in first-seen order.
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([bucket]) => bucket);
};
