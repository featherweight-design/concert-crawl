// The 7-day "Still going?" nudge window (#70).
//
// "Asking before is honest, asking after is interrogation" — the banner only
// ever appears while the night is still ahead, and never once the user has
// answered.
//
// WatchingShow carries no venue timezone, and every venue in the catalogue is
// Denver, so the day count is anchored to Mountain Time. Once shows span zones
// this needs `venue.timezone` on the payload rather than a module constant.

import type { WatchingShow } from '@concert-crawl/types'
import { DENVER_TIME_ZONE } from '@/lib/time'
import { GOING_COPY } from '@/components/consumer/going/definitions/copy'

const MS_PER_DAY = 86_400_000

const calendarDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: DENVER_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// formatToParts rather than parsing the formatted string, matching
// lib/time.ts:localDateString and settings/plan/lib/resolve-plan-card.ts —
// locale output is not a stable parse target across runtimes.
const zonedUtcMidnight = (at: Date): number => {
  const parts = calendarDayFormatter.formatToParts(at)
  const partValue = (type: 'year' | 'month' | 'day'): number => {
    const part = parts.find((candidate) => candidate.type === type)
    return part ? Number(part.value) : NaN
  }
  const year = partValue('year')
  const month = partValue('month')
  const day = partValue('day')
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    // Only reachable on an Intl anomaly. Fall back to the raw instant so the
    // day count stays finite — a NaN would make every window check false.
    return at.getTime()
  }
  return Date.UTC(year, month - 1, day)
}

// Both sides are anchored at UTC midnight before subtracting, so the result is
// a whole number of calendar days and never drifts across a DST boundary the
// way subtracting two wall-clock instants would.
export const daysUntilShow = (
  show: Pick<WatchingShow, 'date'>,
  now: Date = new Date(),
): number =>
  Math.round(
    (Date.parse(`${show.date}T00:00:00Z`) - zonedUtcMidnight(now)) / MS_PER_DAY,
  )

export const isInNudgeWindow = (
  show: Pick<WatchingShow, 'date' | 'attendingAt'>,
  now: Date = new Date(),
): boolean => {
  // An answered show is never re-asked, regardless of how close it is.
  if (show.attendingAt !== null) return false
  const days = daysUntilShow(show, now)
  return days >= 0 && days <= 7
}

export const daysUntilLabel = (
  show: Pick<WatchingShow, 'date'>,
  now: Date = new Date(),
): string => {
  const days = daysUntilShow(show, now)
  if (days === 0) return GOING_COPY.nudge.whenTonight
  if (days === 1) return GOING_COPY.nudge.whenTomorrow
  return GOING_COPY.nudge.whenInDays(days)
}
