import type { ArtistHistory } from '@concert-crawl/types'

import { CRAWL_SINCE } from '../definitions/constants'
import { ARTIST_COPY } from '../definitions/copy'

/** "A", "A & B", "A, B & C" — never an Oxford-comma-free three-way ambiguity. */
export const joinList = (values: string[]): string => {
  if (!values.length) return ''
  if (values.length === 1) return values[0]
  if (values.length === 2) return `${values[0]} & ${values[1]}`
  return `${values.slice(0, -1).join(', ')} & ${values[values.length - 1]}`
}

/**
 * Source-agnostic: takes a count + a venue list + the crawl-window label. A
 * licensed backfill changes `since` and `count`; the treatment is untouched.
 */
export const historyLine = (
  history: ArtistHistory | null | undefined,
  since: string = CRAWL_SINCE,
): string => {
  const count = history ? history.count : 0
  const venues = history?.venues ?? []
  if (!count) return ARTIST_COPY.historyNone(since)
  // No venue on a count of 1 → fall back to the zero phrasing rather than
  // emitting "We've caught them once — once."
  if (count === 1 && !venues[0]) return ARTIST_COPY.historyNone(since)
  if (count === 1) return ARTIST_COPY.historyOne(venues[0], since)
  return ARTIST_COPY.historyMany(count, joinList(venues), since)
}
