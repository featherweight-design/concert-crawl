// The two groups on My shows ▸ Artists.
//
// The split is by USEFULNESS, not by alphabet: an artist with a Denver date on
// the books is the reason the list exists, so they come first and in the order
// you'll see them. Everyone else is a reference list, so they go alphabetical,
// which is the only ordering you can navigate by eye.
//
// Follow order (`followedAt`) is deliberately not used on either group. It is
// the order the rows arrived in, which after a Spotify import is arbitrary.

import type { FollowedArtist } from '@concert-crawl/types'

export interface FollowGroups {
  /** Has an upcoming Denver date. Soonest first. */
  dated: FollowedArtist[]
  /** Nothing announced. Alphabetical by display name. */
  undated: FollowedArtist[]
}

export const groupFollows = (follows: FollowedArtist[]): FollowGroups => {
  const dated: FollowedArtist[] = []
  const undated: FollowedArtist[] = []

  for (const follow of follows) {
    if (follow.nextShow === null) {
      undated.push(follow)
    } else {
      dated.push(follow)
    }
  }

  // `iso` is `YYYY-MM-DD`, so a string compare IS a date compare — no Date
  // parsing, and therefore no timezone to get wrong.
  dated.sort((first, second) => {
    const byDate = (first.nextShow?.iso ?? '').localeCompare(
      second.nextShow?.iso ?? '',
    )
    return byDate === 0 ? compareNames(first, second) : byDate
  })

  undated.sort(compareNames)

  return { dated, undated }
}

// Locale-aware so "Ø" and "É" sort where a reader expects rather than after Z,
// and case-insensitive so "the xx" doesn't land in a lowercase ghetto.
const compareNames = (first: FollowedArtist, second: FollowedArtist): number =>
  first.name.localeCompare(second.name, undefined, { sensitivity: 'base' })

/** How many follows came in from Spotify. Zero means no footnote is owed. */
export const spotifyFollowCount = (follows: FollowedArtist[]): number =>
  follows.filter((follow) => follow.source !== 'manual').length
