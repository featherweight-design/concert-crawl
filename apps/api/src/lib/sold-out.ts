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

/** The same rule as a WHERE on `event_reports` itself, for one event. */
export function activeSoldOutWhere(eventId: string): SQL | undefined {
  return and(
    eq(eventReports.eventId, eventId),
    eq(eventReports.status, 'sold-out'),
    isNotNull(eventReports.resolvedAt),
    eq(eventReports.resolution, 'promoted'),
  );
}
