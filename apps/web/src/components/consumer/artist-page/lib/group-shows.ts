import type { ArtistShow } from '@concert-crawl/types'

import { RESIDENCY_MIN, RESIDENCY_WINDOW } from '../definitions/constants'
import { firstIso, type ShowItem } from '../definitions/types'

const DAY = 86_400_000

/**
 * Epoch for a `YYYY-MM-DD` date, parsed as a pure calendar day. UTC, not local:
 * this runs on the client, and a local parse would make residency clustering
 * depend on the viewer's timezone and drift an hour across a DST boundary —
 * enough to split or merge a cluster whose gap sits on RESIDENCY_WINDOW.
 */
const dayStart = (iso: string): number => Date.parse(`${iso}T00:00:00Z`)

/**
 * Chronological is the default. A residency auto-groups: RESIDENCY_MIN+ shows
 * at the same venue on consecutive-ish dates collapse into one item, so a
 * five-night stand doesn't read as five unrelated shows.
 *
 * CLUSTERED, not first-vs-last: a band can play a five-night stand in August
 * and come back to the same room in November. Measuring the whole venue's span
 * would fail to group either one. We walk each venue's dates in order and cut
 * a new cluster whenever the GAP between consecutive dates exceeds the window;
 * each cluster is then judged on its own, on BOTH count and total span.
 */
export const groupShows = (shows: ArtistShow[]): ShowItem[] => {
  // Keyed by slug, not name: only `venues.slug` is unique in the schema, so two
  // distinct rooms sharing a name would otherwise merge into one residency. The
  // display name comes off the rows in the bucket.
  const byVenue = new Map<string, ArtistShow[]>()
  for (const show of shows) {
    const bucket = byVenue.get(show.venueSlug)
    if (bucket) bucket.push(show)
    else byVenue.set(show.venueSlug, [show])
  }

  const items: ShowItem[] = []

  for (const list of byVenue.values()) {
    const sorted = [...list].sort(
      (one, two) => dayStart(one.iso) - dayStart(two.iso),
    )
    const first = sorted[0]
    if (!first) continue
    let cluster: ArtistShow[] = [first]

    // Two tests, not one. The GAP test below decides where a cluster ENDS;
    // this SPAN test decides whether the cluster earns the word "run".
    const isRun = (head: ArtistShow, tail: ArtistShow): boolean =>
      cluster.length >= RESIDENCY_MIN &&
      (dayStart(tail.iso) - dayStart(head.iso)) / DAY <= RESIDENCY_WINDOW

    const flush = (): void => {
      const head = cluster[0]
      const tail = cluster[cluster.length - 1]
      if (!head || !tail) return
      if (isRun(head, tail)) {
        items.push({
          kind: 'run',
          venue: head.venue,
          venueSlug: head.venueSlug,
          city: head.city,
          shows: cluster,
        })
      } else {
        for (const show of cluster) items.push({ kind: 'one', ...show })
      }
    }

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i]
      const previous = sorted[i - 1]
      if (!current || !previous) continue
      if (
        (dayStart(current.iso) - dayStart(previous.iso)) / DAY <=
        RESIDENCY_WINDOW
      ) {
        cluster.push(current)
      } else {
        flush()
        cluster = [current]
      }
    }
    flush()
  }

  return items.sort(
    (one, two) => dayStart(firstIso(one)) - dayStart(firstIso(two)),
  )
}
