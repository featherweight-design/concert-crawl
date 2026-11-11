import { and, eq, isNotNull } from 'drizzle-orm';
import {
  db,
  eventReports,
  events,
  notifications,
  userEvents,
  venues,
} from '@concert-crawl/db';
import { fanoutWatchNotification } from '@concert-crawl/push';

/**
 * Clear a show's promoted sold-out, and tell its watchers it's back on sale.
 * The one path for both the admin "mark available" action and a fan
 * Tickets available report that reaches its confirm threshold.
 *
 * Every active promoted sold-out report is flipped to `rejected` rather than
 * deleted: its history is meaningful, and `isSoldOutSql` stops matching it.
 * Migration 0032 allows at most one, but the predicate (not a single id) is
 * robust against an old anomaly and the race between a read and this update.
 *
 * Returns the cleared report ids. Empty means nothing was sold out, so nothing
 * changed and nobody is notified.
 */
export async function clearSoldOut(
  eventId: string,
  note: string,
): Promise<string[]> {
  const cleared = await db
    .update(eventReports)
    .set({ resolution: 'rejected', adminNote: note })
    .where(
      and(
        eq(eventReports.eventId, eventId),
        eq(eventReports.status, 'sold-out'),
        isNotNull(eventReports.resolvedAt),
        eq(eventReports.resolution, 'promoted'),
      ),
    )
    .returning({ id: eventReports.id });

  if (cleared.length === 0) return [];

  const ids = cleared.map((row) => row.id).sort();
  // #1064: watch.backonsale to every watcher. #1311: the cleared report(s)
  // are the transition; a report is cleared at most once, so a later sell-out
  // and re-clear names a different report and notifies again.
  await fanoutWatchNotification(
    { db, notifications, userEvents, events, venues },
    {
      eventId,
      category: 'watch.backonsale',
      transition: `cleared:${ids.join(',')}`,
    },
  );
  return ids;
}
