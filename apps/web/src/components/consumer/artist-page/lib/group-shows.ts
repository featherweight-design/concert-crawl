import type { ArtistShow } from '@concert-crawl/types'

import { RESIDENCY_MIN, RESIDENCY_WINDOW } from '../definitions/constants'
import { firstIso, type ShowItem } from '../definitions/types'

const DAY = 86_400_000

/** Midnight-local epoch for a `YYYY-MM-DD` date, so gaps are whole days. */
const dayStart = (iso: string): number => new Date(`${iso}T00:00:00`).getTime()

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
  const byVenue = new Map<string, ArtistShow[]>()
  for (const show of shows) {
    const bucket = byVenue.get(show.venue)
    if (bucket) bucket.push(show)
    else byVenue.set(show.venue, [show])
  }

  const items: ShowItem[] = []

  for (const [venue, list] of byVenue) {
    const sorted = [...list].sort(
      (one, two) => dayStart(one.iso) - dayStart(two.iso),
    )
    let cluster: ArtistShow[] = [sorted[0]]

    // Two tests, not one. The GAP test below decides where a cluster ENDS;
    // this SPAN test decides whether the cluster earns the word "run".
    const isRun = (): boolean =>
      cluster.length >= RESIDENCY_MIN &&
      (dayStart(cluster[cluster.length - 1].iso) - dayStart(cluster[0].iso)) /
        DAY <=
        RESIDENCY_WINDOW

    const flush = (): void => {
      if (isRun()) {
        items.push({
          kind: 'run',
          venue,
          venueSlug: cluster[0].venueSlug,
          city: cluster[0].city,
          shows: cluster,
        })
      } else {
        for (const show of cluster) items.push({ kind: 'one', ...show })
      }
    }

    for (let i = 1; i < sorted.length; i++) {
      if (
        (dayStart(sorted[i].iso) - dayStart(sorted[i - 1].iso)) / DAY <=
        RESIDENCY_WINDOW
      ) {
        cluster.push(sorted[i])
      } else {
        flush()
        cluster = [sorted[i]]
      }
    }
    flush()
  }

  return items.sort(
    (one, two) => dayStart(firstIso(one)) - dayStart(firstIso(two)),
  )
}
