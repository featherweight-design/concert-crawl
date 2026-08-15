/** The pair is an identity ("a funk/soul act"), not a tag list. */
const MAX_GENRES = 2

const normalise = (genre: string) => genre.trim().toLowerCase()

/**
 * Order a row's genres so the one the active Vibe filter matched leads, then
 * cap the result at a pair.
 *
 * `bucketMembers` is the expanded sub-genre set from `bucketMembersFor`, so the
 * test is membership rather than equality: the filter passes a bucket label
 * ("rock") and no genre stored on a row is ever equal to it. A `null` set means
 * the filter resolved to no bucket, and the safe answer there is to leave the
 * order alone rather than guess at a lead.
 */
export function orderGenres(
  genres: readonly string[],
  bucketMembers: readonly string[] | null,
): string[] {
  if (bucketMembers === null) return genres.slice(0, MAX_GENRES)

  const members = new Set(bucketMembers.map(normalise))
  const matchIndex = genres.findIndex((genre) => members.has(normalise(genre)))
  if (matchIndex <= 0) return genres.slice(0, MAX_GENRES)

  const matched = genres[matchIndex]
  if (matched === undefined) return genres.slice(0, MAX_GENRES)
  const rest = genres.filter((_, index) => index !== matchIndex)
  return [matched, ...rest].slice(0, MAX_GENRES)
}
