// Concert History summary stats (#70).
//
// Pure and server-side so the stat hero, the .ics export, and the future
// Passport surface (#85) all read one implementation. Ties are broken by most
// recent attendance rather than arbitrarily, so the output is stable across
// renders and safe for SSR.

import type { HistoryShow, HistoryStats } from '@concert-crawl/types'

const EMPTY_STATS: HistoryStats = {
  nights: 0,
  venues: 0,
  artists: 0,
  topGenre: null,
  topVenue: null,
  first: null,
  last: null,
  totalSpent: null,
}

/**
 * Highest-count key, ties broken by whichever key was most recently attended.
 * Input order is irrelevant — recency is computed per key.
 */
const topBy = (
  shows: HistoryShow[],
  pick: (show: HistoryShow) => string | null,
): string | null => {
  const counts = new Map<string, { count: number; recency: number }>()

  for (const show of shows) {
    const key = pick(show)
    if (!key) continue
    const stamp = Date.parse(show.attendingAt)
    const recency = Number.isNaN(stamp) ? 0 : stamp
    const existing = counts.get(key)
    if (existing) {
      existing.count += 1
      existing.recency = Math.max(existing.recency, recency)
    } else {
      counts.set(key, { count: 1, recency })
    }
  }

  let best: { key: string; count: number; recency: number } | null = null
  for (const [key, { count, recency }] of counts) {
    if (
      !best ||
      count > best.count ||
      (count === best.count && recency > best.recency)
    ) {
      best = { key, count, recency }
    }
  }

  return best?.key ?? null
}

export const computeHistoryStats = (shows: HistoryShow[]): HistoryStats => {
  if (shows.length === 0) return { ...EMPTY_STATS }

  const dates = shows.map((show) => show.date).sort()
  const priced = shows.filter((show) => show.priceFinal !== null)

  return {
    nights: shows.length,
    venues: new Set(shows.map((show) => show.venueSlug)).size,
    artists: new Set(shows.map((show) => show.artist)).size,
    topGenre: topBy(shows, (show) => show.genre),
    topVenue: topBy(shows, (show) => show.venueName),
    first: dates[0] ?? null,
    last: dates[dates.length - 1] ?? null,
    // null, not 0, so the UI can hide the tile instead of claiming a free year.
    totalSpent:
      priced.length === 0
        ? null
        : priced.reduce((sum, show) => sum + (show.priceFinal ?? 0), 0),
  }
}
