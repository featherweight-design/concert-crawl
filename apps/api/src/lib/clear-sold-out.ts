import { and, eq, isNull, lte } from 'drizzle-orm';
import {
  db,
  eventReports,
  events,
  notifications,
  userEvents,
  venues,
} from '@concert-crawl/db';
import { fanoutWatchNotification } from '@concert-crawl/push';
import type { DbTransaction } from './db-executor.js';
import { apiLogger } from './logger.js';
import { lockEventForSaleWrite } from './past-lock.js';
import { activeSoldOutWhere } from './sold-out.js';

/**
 * Clear a show's promoted sold-out, and tell its watchers it's back on sale.
 * The one path for the admin "mark available" action, an admin promoting a
 * Tickets available report, and a fan Tickets available report that reaches
 * its confirm threshold.
 *
 * Every active promoted sold-out report is flipped to `rejected` rather than
 * deleted: its history is meaningful, and `isSoldOutSql` stops matching it.
 * Migration 0032 allows at most one, but the predicate (not a single id) is
 * robust against an old anomaly.
 *
 * Any Tickets available report still pending on the show is resolved with
 * it: it said what just happened, and left open it would keep taking confirms
 * and could later clear a different, newer sold-out.
 *
 * The writes run in one transaction under the event's row lock, and a past
 * show (lockEventForSaleWrite) throws PastLockedError before any of them,
 * so nothing changes and nobody hears. A missing event throws
 * EventNotFoundError. The watchers hear only after the clear commits.
 *
 * Returns the cleared sold-out report ids. Empty means nothing was sold out,
 * so nothing changed and nobody is notified.
 */
export async function clearSoldOut(
  eventId: string,
  note: string,
  options: ClearSoldOutOptions = {},
): Promise<string[]> {
  const ids = await db.transaction((tx) =>
    clearSoldOutRows(tx, eventId, note, options),
  );
  if (ids.length > 0) await notifyBackOnSale(eventId, ids);
  return ids;
}

export interface ClearSoldOutOptions {
  /**
   * A fan report's filing time: only a sold-out already live then is
   * cleared, so a report can never clear a newer sold-out it never saw.
   */
  filedAt?: Date;
}

/** The writes of `clearSoldOut`, past-locked, inside the caller's transaction. */
async function clearSoldOutRows(
  tx: DbTransaction,
  eventId: string,
  note: string,
  options: ClearSoldOutOptions,
): Promise<string[]> {
  await lockEventForSaleWrite(tx, eventId);

  const cleared = await tx
    .update(eventReports)
    .set({ resolution: 'rejected', adminNote: note })
    .where(
      options.filedAt
        ? and(
            activeSoldOutWhere(eventId),
            lte(eventReports.resolvedAt, options.filedAt),
          )
        : activeSoldOutWhere(eventId),
    )
    .returning({ id: eventReports.id });

  if (cleared.length === 0) return [];

  await tx
    .update(eventReports)
    .set({ resolvedAt: new Date(), resolution: 'promoted', adminNote: note })
    .where(
      and(
        eq(eventReports.eventId, eventId),
        eq(eventReports.status, 'available'),
        isNull(eventReports.resolvedAt),
      ),
    );

  return cleared.map((row) => row.id).sort();
}

/** Tell a show's watchers it is back on sale, after the clear has committed. */
async function notifyBackOnSale(eventId: string, ids: string[]): Promise<void> {
  // #1064: watch.backonsale to every watcher. #1311: the cleared report(s)
  // are the transition; a report is cleared at most once, so a later sell-out
  // and re-clear names a different report and notifies again. Best-effort:
  // the state change above is committed, and a failed fan-out must not turn
  // it into an error the caller would retry against a cleared show.
  try {
    await fanoutWatchNotification(
      { db, notifications, userEvents, events, venues },
      {
        eventId,
        category: 'watch.backonsale',
        transition: `cleared:${ids.join(',')}`,
      },
    );
  } catch (err) {
    apiLogger.error({ err, eventId }, 'watch.backonsale fan-out failed');
  }
}
