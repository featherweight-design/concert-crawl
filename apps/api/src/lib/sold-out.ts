import { and, eq, isNotNull, sql, type SQL } from 'drizzle-orm';
import { eventReports } from '@concert-crawl/db';

/**
 * Whether the outer `events` row is sold out: a fan sold-out report that was
 * promoted and resolved. One definition for every surface that asks (admin
 * review, Watching, rows), so they can't disagree about the same show.
 *
 * A function, not a constant, so the table reference isn't evaluated at
 * module load (keeps unit-test mocks from needing every column accessor). The
 * outer column is named in full: Drizzle renders `events.id` unqualified in a
 * single-table select, where inside this subquery it would bind to `r.id`.
 */
export function isSoldOutSql() {
  return sql<boolean>`EXISTS (
    SELECT 1 FROM ${eventReports} r
    WHERE r.event_id = "events"."id"
      AND r.status = 'sold-out'
      AND r.resolved_at IS NOT NULL
      AND r.resolution = 'promoted'
  )`;
}

/**
 * isSoldOutSql as a fan reads it: a cancelled or postponed show (a delisted
 * one reads `cancelled` too) has no sale to be sold out of, so it never reads
 * Sold out, even when a sold-out promoted before the change is still live.
 * The row is kept, so a show un-postponed reads Sold out again. Admin reads
 * and every write keep the ungated isSoldOutSql / activeSoldOutWhere, so an
 * admin still sees, and can clear, a postponed show's live sold-out.
 */
export function isSoldOutForFansSql() {
  return sql<boolean>`(${isSoldOutSql()} AND "events"."status" NOT IN (${sql.join(
    NOT_ON_SALE_STATUSES.map((status) => sql`${status}`),
    sql`, `,
  )}) AND "events"."delisted_at" IS NULL)`;
}

/**
 * The show statuses with no sale to be sold out of. One list for the fan
 * read (isSoldOutForFansSql, isOnSale) and the admin mark's refusal.
 */
export const NOT_ON_SALE_STATUSES = ['cancelled', 'postponed'] as const;

/**
 * Whether a loaded show has a sale: not cancelled, postponed or delisted. The
 * fan-read rule for one show (see isSoldOutForFansSql).
 */
export const isOnSale = (show: {
  status: string;
  delistedAt: Date | null;
}): boolean =>
  show.delistedAt === null &&
  !NOT_ON_SALE_STATUSES.some((status) => status === show.status);

/**
 * A promoted, resolved fan report of one status on one event: the report an
 * admin (or the confirm threshold) turned into the event's live state.
 */
export function activePromotedReportWhere(
  eventId: string,
  status: 'sold-out' | 'cancelled' | 'postponed',
): SQL | undefined {
  return and(
    eq(eventReports.eventId, eventId),
    eq(eventReports.status, status),
    isNotNull(eventReports.resolvedAt),
    eq(eventReports.resolution, 'promoted'),
  );
}

/** The sold-out rule as a WHERE on `event_reports` itself, for one event. */
export function activeSoldOutWhere(eventId: string): SQL | undefined {
  return activePromotedReportWhere(eventId, 'sold-out');
}
