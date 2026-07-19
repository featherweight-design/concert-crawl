// Compact relative timestamps ("2 hours ago") for the Connections card's
// "Last synced" row (#763 PR 5). Falls back to a short absolute date once
// the moment is over a week old — "43 days ago" reads worse than "Jun 5".

import { RELATIVE_TIME_COPY } from './definitions/copy'

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const WEEK_MS = 7 * DAY_MS

const { justNow, ago, units } = RELATIVE_TIME_COPY

export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ''
  const elapsed = now.getTime() - then.getTime()

  if (elapsed < MINUTE_MS) return justNow
  if (elapsed < HOUR_MS)
    return ago(Math.floor(elapsed / MINUTE_MS), units.minute)
  if (elapsed < DAY_MS) return ago(Math.floor(elapsed / HOUR_MS), units.hour)
  if (elapsed < WEEK_MS) return ago(Math.floor(elapsed / DAY_MS), units.day)

  const sameYear = then.getFullYear() === now.getFullYear()
  return then.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}
