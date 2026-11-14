import { and, eq, isNull } from 'drizzle-orm';
import { db, eventReports, events } from '@concert-crawl/db';
import { endDelisting } from '@concert-crawl/db/upcoming-events';
import type { DbTransaction } from './db-executor.js';
import { lockEventSaleState, PastLockedError } from './past-lock.js';
import {
  closeReportAsMoot,
  lockPendingReport,
  MOOT_NOTE,
  type OnPastShow,
} from './sale-report.js';
import { activeSoldOutWhere } from './sold-out.js';

/** The report statuses a promotion changes the show for. */
export type PromotableStatus = 'sold-out' | 'cancelled' | 'postponed';

export interface PromoteReportResult {
  /**
   * 'promoted': the report is promoted and the show reads as it says.
   * 'moot': the report closed as `rejected` (the show is past and `onPast`
   * is 'close', or another sold-out was already live), changing nothing.
   * 'already_resolved': the report was resolved before the lock, so nothing
   * was written.
   */
  outcome: 'promoted' | 'moot' | 'already_resolved';
  /** The report as written; undefined when nothing was. */
  report: typeof eventReports.$inferSelect | undefined;
  /**
   * True only when the promotion changed what fans see, so the caller sends
   * the watch notice after commit. A second cancelled report on a show
   * already cancelled is promoted but is not news.
   */
  isRealTransition: boolean;
}

/**
 * Whether a cancelled or postponed promotion is news: the show's status
 * differs, or the show was delisted. A delisted show was cancelled silently by
 * the stale sweep (B+ A5), so a confirmed cancellation of it is news: watchers
 * were never told. Read under the event's row lock.
 */
const statusChanges = async (
  tx: DbTransaction,
  eventId: string,
  status: 'cancelled' | 'postponed',
): Promise<boolean> => {
  const [row] = await tx
    .select({ status: events.status, delistedAt: events.delistedAt })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  return row?.status !== status || row.delistedAt !== null;
};

/**
 * Promote a pending report so the show reads as it says: sold out, cancelled
 * or postponed. The one write for an admin resolving a report as promoted and
 * a fan report reaching its confirm threshold.
 *
 * Runs in one transaction under the event's row lock (lockEventSaleState),
 * then the report's. Throws EventNotFoundError for a missing event. Under the
 * locks:
 * - a report already resolved is left alone ('already_resolved');
 * - a past show throws PastLockedError for `onPast: 'refuse'`, or closes the
 *   report as moot for 'close': a show that has played is history, whatever
 *   the report says;
 * - a sold-out, when another sold-out is already live, closes as moot rather
 *   than tripping migration 0032's one-live-sold-out index, and nobody hears
 *   again;
 * - otherwise the report is promoted, matched on `resolved_at IS NULL`, and a
 *   cancelled or postponed one sets the show's status (ending any delisting).
 *   Whether that is news is read under the same lock, so two reports promoted
 *   at once can never both notify.
 */
export async function promoteReport(
  eventId: string,
  reportId: string,
  status: PromotableStatus,
  options: { onPast: OnPastShow; adminNote?: string | null },
): Promise<PromoteReportResult> {
  return db.transaction(async (tx): Promise<PromoteReportResult> => {
    const state = await lockEventSaleState(tx, eventId);
    if (!(await lockPendingReport(tx, reportId))) {
      return {
        outcome: 'already_resolved',
        report: undefined,
        isRealTransition: false,
      };
    }
    const moot = (note: string) =>
      closeReportAsMoot(tx, reportId, note).then(
        (report): PromoteReportResult => ({
          outcome: 'moot',
          report,
          isRealTransition: false,
        }),
      );

    if (state === 'past') {
      if (options.onPast === 'refuse') throw new PastLockedError();
      return moot(MOOT_NOTE.pastShow);
    }

    let isRealTransition: boolean;
    if (status === 'sold-out') {
      // This report is still pending, so the promoted filter omits it: any
      // match is another sold-out already live on the show.
      const [live] = await tx
        .select({ id: eventReports.id })
        .from(eventReports)
        .where(activeSoldOutWhere(eventId))
        .limit(1);
      if (live) return moot(MOOT_NOTE.alreadySoldOut);
      isRealTransition = true;
    } else {
      isRealTransition = await statusChanges(tx, eventId, status);
      await tx
        .update(events)
        // A confirmed status replaces the sweep's No longer listed.
        .set({ status, ...endDelisting() })
        .where(eq(events.id, eventId));
    }

    const [report] = await tx
      .update(eventReports)
      .set({
        resolvedAt: new Date(),
        resolution: 'promoted',
        ...(options.adminNote !== undefined && {
          adminNote: options.adminNote,
        }),
      })
      .where(
        and(eq(eventReports.id, reportId), isNull(eventReports.resolvedAt)),
      )
      .returning();
    return { outcome: 'promoted', report, isRealTransition };
  });
}
