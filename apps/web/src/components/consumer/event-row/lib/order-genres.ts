import { bucketMembersFor } from '@concert-crawl/types';

/** The pair is an identity ("a funk/soul act"), not a tag list. */
const MAX_GENRES = 2;

const normalise = (genre: string) => genre.trim().toLowerCase();

/**
 * Resolve every chosen Vibe to one membership set, the union of each value's
 * bucket (Design addendum 3, lane a6 row 41: highlight every chosen vibe).
 * Values that resolve to no bucket add nothing; when none resolves the result
 * is null, which `orderGenres` reads as "leave the order alone".
 */
export function vibeBucketMembers(
  filterVibes: readonly string[],
): readonly string[] | null {
  const members = filterVibes.flatMap((value) => bucketMembersFor(value) ?? []);
  return members.length > 0 ? members : null;
}

/**
 * Order a row's genres so the ones the active Vibe filter matched lead, in
 * their own order, then cap the result at a pair. With several vibes chosen, a
 * row matching two of them shows both.
 *
 * `bucketMembers` is the expanded sub-genre set from `bucketMembersFor` (or
 * `vibeBucketMembers` for several vibes), so the test is membership rather
 * than equality: the filter passes a bucket label ("rock") and no genre stored
 * on a row is ever equal to it. A `null` set means the filter resolved to no
 * bucket, and the safe answer there is to leave the order alone rather than
 * guess at a lead.
 */
export function orderGenres(
  genres: readonly string[],
  bucketMembers: readonly string[] | null,
): string[] {
  if (bucketMembers === null) return genres.slice(0, MAX_GENRES);

  const members = new Set(bucketMembers.map(normalise));
  const isMatch = (genre: string) => members.has(normalise(genre));
  const matched = genres.filter(isMatch);
  const rest = genres.filter((genre) => !isMatch(genre));
  return [...matched, ...rest].slice(0, MAX_GENRES);
}
