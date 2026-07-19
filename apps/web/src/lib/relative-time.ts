// Compact relative timestamps ("2 hours ago") for the Connections card's
// "Last synced" row (#763 PR 5). Falls back to a short absolute date once
// the moment is over a week old — "43 days ago" reads worse than "Jun 5".

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const WEEK_MS = 7 * DAY_MS

const plural = (count: number, unit: string): string =>
  `${count} ${unit}${count === 1 ? '' : 's'} ago`

export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ''
  const elapsed = now.getTime() - then.getTime()

  if (elapsed < MINUTE_MS) return 'Just now'
  if (elapsed < HOUR_MS)
    return plural(Math.floor(elapsed / MINUTE_MS), 'minute')
  if (elapsed < DAY_MS) return plural(Math.floor(elapsed / HOUR_MS), 'hour')
  if (elapsed < WEEK_MS) return plural(Math.floor(elapsed / DAY_MS), 'day')

  const sameYear = then.getFullYear() === now.getFullYear()
  return then.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}
