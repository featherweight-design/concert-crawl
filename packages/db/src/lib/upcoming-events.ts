import { eq, gte, inArray, isNull, type SQL } from 'drizzle-orm'
import { events } from '../schema/events.js'

/**
 * `event_status` has no terminal value — nothing moves a show out of
 * `upcoming` once it has happened, so the column means "was scheduled at some
 * point," not "is in the future" (#1212). The date column is the real source
 * of truth, and every correct query therefore pairs a status filter with a
 * date bound.
 *
 * That pairing was a convention rather than a constraint, and forgetting it
 * has already produced one false reading: a status-only query during the #1201
 * validation reported ~590 events as missing ticket links, all of them past
 * rows correctly excluded from every real surface.
 *
 * `from` is required so the date bound cannot be dropped by omission.
 */

/**
 * A show still on the calendar, including one that was cancelled or postponed.
 * Consumer surfaces that list shows use this: a cancelled show has to keep
 * rendering so a watcher learns it was cancelled.
 */
export const SCHEDULED_STATUSES = [
  'upcoming',
  'cancelled',
  'postponed',
] as const

interface UpcomingEventsOptions {
  /**
   * Inclusive lower bound on `events.date`, as a `YYYY-MM-DD` string or a SQL
   * expression. Callers own the timezone: consumer routes bound on UTC, the
   * crawler on Denver local.
   */
  from: string | SQL
  /**
   * Defaults to `['upcoming']` — the strict catalogue. Pass
   * `SCHEDULED_STATUSES` for surfaces that must keep showing cancelled and
   * postponed shows.
   */
  statuses?: readonly ('upcoming' | 'cancelled' | 'postponed')[]
  /** Include events flagged non-concert. Defaults to false. */
  includeHiddenFromConsumer?: boolean
  /**
   * Include rows the crawler stopped seeing on the venue page (#607). Defaults
   * to false. The crawler clears `firstMissingAt` on a successful
   * re-extraction, so a row that genuinely reappears becomes visible again on
   * its own.
   */
  includeMissing?: boolean
}

/** The conditions every "shows still to come" query needs. */
export const upcomingEventConditions = ({
  from,
  statuses = ['upcoming'],
  includeHiddenFromConsumer = false,
  includeMissing = false,
}: UpcomingEventsOptions): SQL[] => {
  // A single status uses `=` rather than `IN (…)` so the query can match the
  // `status = 'upcoming'` partial index predicate.
  const [firstStatus, ...restStatuses] = statuses

  const conditions: SQL[] = [
    firstStatus && restStatuses.length === 0
      ? eq(events.status, firstStatus)
      : inArray(events.status, [...statuses]),
    gte(events.date, from),
  ]

  if (!includeHiddenFromConsumer) {
    conditions.push(eq(events.hiddenFromConsumer, false))
  }
  if (!includeMissing) {
    conditions.push(isNull(events.firstMissingAt))
  }

  return conditions
}
