// Crew-home formatting. Every date the crew home renders is a `YYYY-MM-DD`
// string straight from `events.date`, so a stub reading "AUG 14" for a show on
// the 15th is the visible half of the #596 drift.

import { stampDateParts } from '@/lib/passport/stamp'

import { CREWS_COPY } from '../definitions/copy'

export interface StubDate {
  month: string
  day: string
  year: string
}

/**
 * "AUG" / "14" from `YYYY-MM-DD`. The month and day come from the passport's
 * UTC-noon-anchored formatter rather than a second month table, so the stub and
 * the passport punch can never disagree about the same date. The day loses its
 * leading zero: the stub sets it at 19px, where "05" reads as a typo.
 */
export const stubDate = (iso: string): StubDate => {
  const [year = ''] = iso.split('-')
  const punch = stampDateParts(iso)
  return {
    month: punch?.month ?? '',
    day: punch === null ? '' : String(Number(punch.day) || ''),
    year,
  }
}

export interface DateGroup<T> {
  key: string
  items: T[]
}

/**
 * Group in list order rather than by sorting: the API already returns upcoming
 * ascending and nights descending, and re-sorting here would be a second
 * opinion about ordering that could disagree with it.
 */
export const groupInOrder = <T>(
  items: T[],
  keyOf: (item: T) => string,
): DateGroup<T>[] => {
  const groups: DateGroup<T>[] = []
  for (const item of items) {
    const key = keyOf(item)
    const last = groups[groups.length - 1]
    if (last !== undefined && last.key === key) last.items.push(item)
    else groups.push({ key, items: [item] })
  }
  return groups
}

/** The year a `YYYY-MM-DD` falls in, for the Been there headers. */
export const isoYear = (iso: string): string => iso.slice(0, 4)

const DAY_MS = 86_400_000

/**
 * A joined date, relative while that is still the more useful reading and
 * absolute once it isn't. `now` is injectable so the test does not depend on
 * the day it runs.
 *
 * Not `formatRelativeTime`: that one flips to absolute at 7 days, which on a
 * roster would put a month-and-year stamp beside someone who joined last week.
 */
export const joinedLabel = (
  joinedAt: string,
  now: Date = new Date(),
): string => {
  const then = new Date(joinedAt)
  if (Number.isNaN(then.getTime())) return ''
  const days = Math.floor((now.getTime() - then.getTime()) / DAY_MS)
  if (days <= 0) return CREWS_COPY.roster.joinedToday
  if (days === 1) return CREWS_COPY.roster.joinedYesterday
  if (days < 30) return CREWS_COPY.roster.joinedDaysAgo(days)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Denver',
  }).format(then)
}

/** Whole days until an invite expires, floored at zero. */
export const daysUntil = (
  expiresAt: string,
  now: Date = new Date(),
): number => {
  const end = new Date(expiresAt)
  if (Number.isNaN(end.getTime())) return 0
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY_MS))
}
