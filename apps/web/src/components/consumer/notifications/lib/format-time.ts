// Time formatting + day grouping for the notification panel (#737), ported
// from design_handoff_in_app_notifications/notifications-data.jsx.
//
// TWO FORMS, ONE SOURCE. `relTime` is what the eye reads ("2h"); `relTimeLong`
// is what a screen reader hears ("2 hours ago"). Both cross the same three
// thresholds, so the two can never disagree about which bucket a row is in.
// `itemLabel` is the single source of a row's accessible name for the same
// reason — display and speech must not drift.
//
// TIMEZONE. Absolute dates and calendar-day boundaries are rendered in
// Mountain Time, like every other date in the app: a notification written at
// 11pm Denver on Thursday belongs under Thursday for a Denver user regardless
// of where the browser thinks it is.

import { RELATIVE_TIME_COPY } from '@/lib/definitions/copy'
import type { ConsumerNotification } from '@/lib/notifications'
import { NOTIFICATIONS_COPY } from '../definitions/copy'
import { categoryFor } from '../definitions/categories'
import { crewRowIdentity } from './crew-meta'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

const DISPLAY_TIME_ZONE = 'America/Denver'

const SHORT_DATE = new Intl.DateTimeFormat('en-US', {
  timeZone: DISPLAY_TIME_ZONE,
  month: 'short',
  day: 'numeric',
})

const LONG_DATE = new Intl.DateTimeFormat('en-US', {
  timeZone: DISPLAY_TIME_ZONE,
  month: 'long',
  day: 'numeric',
})

const DIVIDER_DATE = new Intl.DateTimeFormat('en-US', {
  timeZone: DISPLAY_TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

// Module scope like the three above: `dayKey` calls this twice per row, so
// constructing a formatter inside it would allocate one per row per render.
const DAY_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: DISPLAY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Compact, for the metadata row. Sub-minute floors to "1m" rather than "0m" —
 * a notification that just landed reads as one minute old, not as nothing.
 * At seven days it stops counting and names the date.
 */
export const relTime = (iso: string, now: Date = new Date()): string => {
  const then = new Date(iso)
  const diff = now.getTime() - then.getTime()
  if (diff < 55 * MIN) return `${Math.max(1, Math.round(diff / MIN))}m`
  if (diff < 22 * HOUR) return `${Math.round(diff / HOUR)}h`
  if (diff < 7 * DAY) return `${Math.round(diff / DAY)}d`
  return SHORT_DATE.format(then)
}

/**
 * The spoken form. Pluralization goes through the shared `RELATIVE_TIME_COPY`
 * rather than an unconditional "s", so a one-minute-old row is not announced
 * as "1 minutes ago". The thresholds stay the panel's own (55m/22h).
 */
export const relTimeLong = (iso: string, now: Date = new Date()): string => {
  const then = new Date(iso)
  const diff = now.getTime() - then.getTime()
  const { ago, units } = RELATIVE_TIME_COPY
  if (diff < 55 * MIN)
    return ago(Math.max(1, Math.round(diff / MIN)), units.minute)
  if (diff < 22 * HOUR) return ago(Math.round(diff / HOUR), units.hour)
  if (diff < 7 * DAY) return ago(Math.round(diff / DAY), units.day)
  return LONG_DATE.format(then)
}

/** Midnight-in-Denver for an instant, as a UTC-anchored millisecond count. */
const startOfDenverDay = (date: Date): number => {
  const parts = DAY_PARTS.formatToParts(date)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)
  return Date.UTC(year, month - 1, day)
}

/**
 * The sticky divider's label. Compares calendar-day STARTS, not elapsed time:
 * 11pm yesterday and 2am today are three hours apart and still belong to
 * different headers.
 *
 * A future-dated row folds into "Today" (the guard is `<= 0`) rather than
 * inventing a "Tomorrow" header the design never drew.
 */
export const dayKey = (iso: string, now: Date = new Date()): string => {
  const then = new Date(iso)
  const delta = Math.round(
    (startOfDenverDay(now) - startOfDenverDay(then)) / DAY,
  )
  if (delta <= 0) return NOTIFICATIONS_COPY.today
  if (delta === 1) return NOTIFICATIONS_COPY.yesterday
  return DIVIDER_DATE.format(then)
}

export interface NotificationDayGroup {
  key: string
  items: ConsumerNotification[]
}

/**
 * Groups adjacent rows that share a day label.
 *
 * Deliberately does NOT sort and does NOT merge non-adjacent same-day runs:
 * the API returns `createdAt DESC`, and silently re-ordering here would hide a
 * server-side ordering bug behind a tidy-looking list. Unsorted input showing
 * a repeated header is the correct, visible failure.
 *
 * Grouping therefore starts at "Today" only when a today row exists — a stale
 * panel opens on e.g. "Thu, Jul 20" rather than on an empty Today header.
 */
export const groupByDay = (
  items: ConsumerNotification[],
  now: Date = new Date(),
): NotificationDayGroup[] => {
  const groups: NotificationDayGroup[] = []
  for (const item of items) {
    const key = dayKey(item.createdAt, now)
    const current = groups.at(-1)
    if (current === undefined || current.key !== key) {
      groups.push({ key, items: [item] })
      continue
    }
    current.items.push(item)
  }
  return groups
}

export const isUnread = (item: ConsumerNotification): boolean =>
  item.readAt === null

/**
 * The row's one accessible name. Everything visible in the row is spoken here
 * in the same order, plus the unread state — which is otherwise carried only
 * by colour, weight and a decorative dot.
 */
export const itemLabel = (
  item: ConsumerNotification,
  now: Date = new Date(),
): string => {
  // A crew row shows the crew's name where every other row shows the category
  // label, so the name has to be spoken too — otherwise "hugh joined The
  // Regulars" and a second crew's identical row are indistinguishable by ear.
  const crew = crewRowIdentity(item.category, item.metadata)
  const lead =
    crew === null
      ? categoryFor(item.category).verb
      : `${categoryFor(item.category).verb}, ${crew.crewName}`
  return `${lead}. ${item.title} ${item.body} ${relTimeLong(
    item.createdAt,
    now,
  )}${isUnread(item) ? '. Unread' : ''}`
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Unread rows in a page. Note this is the count of what is LOADED — the
 * header's count comes from the API's `unreadCount`, which spans the whole
 * backfill window.
 */
export const unreadCount = (items: ConsumerNotification[]): number =>
  items.filter(isUnread).length
