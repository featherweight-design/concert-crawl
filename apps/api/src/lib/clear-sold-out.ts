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
import { lockEventSaleState, PastLockedError } from './past-lock.js';
import {
  closeReportAsMoot,
  lockPendingReport,
  MOOT_NOTE,
  type OnPastShow,
} from './sale-report.js';
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
 * The writes run in one transaction under the event's row lock (and, for a
 * report, the report's), so nothing changes and nobody hears unless the clear
 * happens. A missing event throws EventNotFoundError. A past show throws
 * PastLockedError, except for a report with `onPast: 'close'`, which closes
 * as moot. A report resolved before the lock is left alone. The watchers hear
 * only after the clear commits.
 */
export async function clearSoldOut(
  eventId: string,
  note: string,
  options: ClearSoldOutOptions = {},
): Promise<ClearSoldOutResult> {
  const result = await db.transaction((tx) =>
    clearSoldOutRows(tx, eventId, note, options),
  );
  if (result.cleared.length > 0) {
    await notifyBackOnSale(eventId, result.cleared);
  }
  return result;
}

export interface ClearSoldOutOptions {
  /** The Tickets available report asking for the clear, when one is. */
  report?: {
    id: string;
    /**
     * The report's filing time: only a sold-out already live then is
     * cleared, so a report can never clear a newer sold-out it never saw.
     */
    filedAt: Date;
    /**
     * 'refuse' (an admin promote): a past show throws PastLockedError, and
     * nothing to clear writes nothing. 'close' (the fan threshold): either
     * closes the report as moot.
     */
    onPast: OnPastShow;
  };
}

export interface ClearSoldOutResult {
  /**
   * 'cleared': the sold-out ended. 'nothing_to_clear': no live sold-out, and
   * nothing written. 'moot': the report closed as `rejected`, changing
   * nothing else. 'already_resolved': the report was resolved before the
   * lock, so nothing was written.
   */
  outcome: 'cleared' | 'nothing_to_clear' | 'moot' | 'already_resolved';
  /** The cleared sold-out report ids, sorted; empty unless 'cleared'. */
  cleared: string[];
}

/** The writes of `clearSoldOut`, past-locked, inside the caller's transaction. */
async function clearSoldOutRows(
  tx: DbTransaction,
  eventId: string,
  note: string,
  options: ClearSoldOutOptions,
): Promise<ClearSoldOutResult> {
  const { report } = options;
  const state = await lockEventSaleState(tx, eventId);
  if (report && !(await lockPendingReport(tx, report.id))) {
    return { outcome: 'already_resolved', cleared: [] };
  }
  const closeOrLeave = async (
    mootNote: string,
    leave: ClearSoldOutResult['outcome'],
  ): Promise<ClearSoldOutResult> => {
    if (report?.onPast !== 'close') return { outcome: leave, cleared: [] };
    await closeReportAsMoot(tx, report.id, mootNote);
    return { outcome: 'moot', cleared: [] };
  };

  if (state === 'past') {
    if (report?.onPast !== 'close') throw new PastLockedError();
    return closeOrLeave(MOOT_NOTE.pastShow, 'moot');
  }

  const cleared = await tx
    .update(eventReports)
    .set({ resolution: 'rejected', adminNote: note })
    .where(
      report
        ? and(
            activeSoldOutWhere(eventId),
            lte(eventReports.resolvedAt, report.filedAt),
          )
        : activeSoldOutWhere(eventId),
    )
    .returning({ id: eventReports.id });

  if (cleared.length === 0) {
    return closeOrLeave(MOOT_NOTE.nothingToClear, 'nothing_to_clear');
  }

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

  return { outcome: 'cleared', cleared: cleared.map((row) => row.id).sort() };
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
