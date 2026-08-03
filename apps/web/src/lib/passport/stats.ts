/**
 * Every number the Passport prints derives from this module.
 *
 * Ported from the `h_stats` prototype in
 * `design/design_handoff_shareable_cards/history-data.jsx`. The prototype read
 * a global fixture array; this takes a typed input so the card, the PNG route
 * and Concert History all compute the same totals from real rows.
 */

export interface AttendedShow {
  id: string
  artist: string
  venue: string
  genre: string | null
  /** The event's local calendar date, `YYYY-MM-DD`. */
  date: string
  /** What the user actually paid, when known. */
  priceFinal: number | null
}

export interface PassportTally {
  name: string
  count: number
}

export interface PassportStats {
  nights: number
  venues: number
  artists: number
  topGenre: PassportTally | null
  topVenue: PassportTally | null
  first: AttendedShow | null
  last: AttendedShow | null
  totalSpent: number
}

const EMPTY: PassportStats = {
  nights: 0,
  venues: 0,
  artists: 0,
  topGenre: null,
  topVenue: null,
  first: null,
  last: null,
  totalSpent: 0,
}

/**
 * Highest count wins; an exact tie resolves to whichever name was seen first.
 * A `Map` is what makes that true — insertion order is the input order, so the
 * result is stable across renders instead of depending on key ordering.
 */
const topOf = (counts: Map<string, number>): PassportTally | null => {
  let top: PassportTally | null = null
  for (const [name, count] of counts) {
    if (top === null || count > top.count) top = { name, count }
  }
  return top
}

export const passportStats = (shows: AttendedShow[]): PassportStats => {
  if (shows.length === 0) return EMPTY

  const venues = new Set<string>()
  const artists = new Set<string>()
  const genreCounts = new Map<string, number>()
  const venueCounts = new Map<string, number>()
  let totalSpent = 0
  // `YYYY-MM-DD` compares lexicographically, so the extremes need no `Date` at
  // all and no host-timezone drift can reach them (#596). Tracked in the same
  // pass as the tallies rather than by sorting a copy of the whole history.
  let first: AttendedShow | null = null
  let last: AttendedShow | null = null

  for (const show of shows) {
    venues.add(show.venue)
    artists.add(show.artist)
    venueCounts.set(show.venue, (venueCounts.get(show.venue) ?? 0) + 1)
    // A show with no genre is not a genre called "null" — it simply does not
    // vote. The prototype counted `undefined` as a bucket and could print it.
    if (show.genre !== null && show.genre !== '') {
      genreCounts.set(show.genre, (genreCounts.get(show.genre) ?? 0) + 1)
    }
    if (show.priceFinal !== null) totalSpent += show.priceFinal
    // Strict on `first` and loose on `last` keeps the ties resolving the way a
    // stable sort did: the earliest-listed row of a shared date wins `first`,
    // the latest-listed wins `last`.
    if (first === null || show.date < first.date) first = show
    if (last === null || show.date >= last.date) last = show
  }

  return {
    nights: shows.length,
    venues: venues.size,
    artists: artists.size,
    topGenre: topOf(genreCounts),
    topVenue: topOf(venueCounts),
    first,
    last,
    totalSpent,
  }
}
