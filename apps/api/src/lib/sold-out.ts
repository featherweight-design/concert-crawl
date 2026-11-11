import { sql } from 'drizzle-orm';
import { eventReports, events } from '@concert-crawl/db';

/**
 * Whether the outer `events` row is sold out: a fan sold-out report that was
 * promoted and resolved. One definition for every surface that asks (admin
 * review, Watching), so they can't disagree about the same show.
 *
 * A function, not a constant, so the table reference isn't evaluated at
 * module load (keeps unit-test mocks from needing every column accessor).
 */
export function isSoldOutSql() {
  return sql<boolean>`EXISTS (
    SELECT 1 FROM ${eventReports} r
    WHERE r.event_id = ${events.id}
      AND r.status = 'sold-out'
      AND r.resolved_at IS NOT NULL
      AND r.resolution = 'promoted'
  )`;
}
