import { and, eq, isNull } from 'drizzle-orm';
import { db, eventReports } from '@concert-crawl/db';
import { lockEventSaleState, PastLockedError } from './past-lock.js';
import {
  closeReportAsMoot,
  lockPendingReport,
  MOOT_NOTE,
  type OnPastShow,
} from './sale-report.js';
import { activeSoldOutWhere } from './sold-out.js';

export interface PromoteSoldOutResult {
  /**
   * 'promoted': the show now reads as sold out. 'moot': the report closed
   * as `rejected` (the show is past and `onPast` is 'close', or another
   * sold-out was already live), changing nothing. 'already_resolved': the
   * report was resolved before the lock, so nothing was written.
   */
  outcome: 'promoted' | 'moot' | 'already_resolved';
  /** The report as written; undefined when nothing was. */
  report: typeof eventReports.$inferSelect | undefined;
  /** True only for 'promoted': the caller sends watch.soldout after commit. */
  isRealTransition: boolean;
}

/**
 * Promote a pending sold-out report, so the show reads as sold out. The one
 * write for an admin resolving the report as promoted and a fan report
 * reaching its confirm threshold.
 *
 * Runs in one transaction under the event's row lock (lockEventSaleState),
 * then the report's. Throws EventNotFoundError for a missing event. Under
 * the locks:
 * - a report already resolved is left alone ('already_resolved');
 * - a past show throws PastLockedError for `onPast: 'refuse'`, or closes the
 *   report as moot for 'close';
 * - when another sold-out is already live, the report closes as moot rather
 *   than tripping migration 0032's one-live-sold-out index, and nobody hears
 *   again;
 * - otherwise the report is promoted, matched on `resolved_at IS NULL`.
 */
export async function promoteSoldOutReport(
  eventId: string,
  reportId: string,
  options: { onPast: OnPastShow; adminNote?: string | null },
): Promise<PromoteSoldOutResult> {
  return db.transaction(async (tx): Promise<PromoteSoldOutResult> => {
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
        (report): PromoteSoldOutResult => ({
          outcome: 'moot',
          report,
          isRealTransition: false,
        }),
      );

    if (state === 'past') {
      if (options.onPast === 'refuse') throw new PastLockedError();
      return moot(MOOT_NOTE.pastShow);
    }

    // This report is still pending, so the promoted filter omits it: any
    // match is another sold-out already live on the show.
    const [live] = await tx
      .select({ id: eventReports.id })
      .from(eventReports)
      .where(activeSoldOutWhere(eventId))
      .limit(1);
    if (live) return moot(MOOT_NOTE.alreadySoldOut);

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
    return { outcome: 'promoted', report, isRealTransition: true };
  });
}
