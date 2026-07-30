// Reverse-chronological month buckets for the History list.
//
// Watching's grouper (WatchingContent.groupShows) buckets *forward* — tonight /
// this week / next week, then month names. History only ever looks backwards, so
// the relative buckets are meaningless here; the shape is the same
// (insertion-ordered groups with a mono label and a count) and the API already
// returns rows newest-first, so this preserves the server's order rather than
// re-sorting.

import type { HistoryShow } from '@concert-crawl/types'

export interface HistoryBucket {
  key: string
  label: string
  shows: HistoryShow[]
}

// `date` is a YYYY-MM-DD event-local date, so it's parsed as local midnight to
// keep the month label from sliding a day backwards in Mountain Time.
const monthKeyOf = (date: string): { key: string; label: string } => {
  const parsed = new Date(`${date}T00:00:00`)
  const year = parsed.getFullYear()
  const currentYear = new Date().getFullYear()
  const month = parsed.toLocaleDateString('en-US', { month: 'long' })
  return {
    key: `${year}-${parsed.getMonth()}`,
    // The year is only worth the pixels once it isn't the current one.
    label: year === currentYear ? month : `${month} ${year}`,
  }
}

export const groupHistoryByMonth = (
  shows: readonly HistoryShow[],
): HistoryBucket[] => {
  const byKey = new Map<string, HistoryBucket>()
  const order: string[] = []

  for (const show of shows) {
    const { key, label } = monthKeyOf(show.date)
    let bucket = byKey.get(key)
    if (!bucket) {
      bucket = { key, label, shows: [] }
      byKey.set(key, bucket)
      order.push(key)
    }
    bucket.shows.push(show)
  }

  return order.flatMap((key) => {
    const bucket = byKey.get(key)
    return bucket ? [bucket] : []
  })
}
