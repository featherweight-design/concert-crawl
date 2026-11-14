import { and, eq, isNull } from 'drizzle-orm';
import { eventReports } from '@concert-crawl/db';
import type { DbTransaction } from './db-executor.js';

type ReportRow = typeof eventReports.$inferSelect;

/**
 * What a sale-state write does about a past show: 'refuse' (an admin action)
 * throws PastLockedError and writes nothing; 'close' (the fan confirm
 * threshold) closes the report as moot, so it leaves the admin queue and a
 * later reschedule can never promote it.
 */
export type OnPastShow = 'refuse' | 'close';

/** Why a report closed as moot, without changing anything. */
export const MOOT_NOTE = {
  pastShow: 'show already played',
  alreadySoldOut: 'already sold out',
  nothingToClear: 'no live sold-out to clear',
  showCancelled: 'show already cancelled',
  showPostponed: 'show is postponed',
  showDelisted: 'show no longer listed',
} as const;

/**
 * Re-read a report under its row lock, inside the sale write's transaction:
 * true while it is still pending. A report someone resolved before the lock
 * (an admin rejecting it, a racing confirm) is never written over.
 */
export const lockPendingReport = async (
  tx: DbTransaction,
  reportId: string,
): Promise<boolean> => {
  const [row] = await tx
    .select({ resolvedAt: eventReports.resolvedAt })
    .from(eventReports)
    .where(eq(eventReports.id, reportId))
    .for('update')
    .limit(1);
  return row !== undefined && row.resolvedAt === null;
};

/**
 * Close a pending report as moot: the resolution the confirm path already
 * used for a Tickets available with nothing left to clear, `rejected` with a
 * note saying why. Nothing it reported changes and nobody is told.
 */
export const closeReportAsMoot = async (
  tx: DbTransaction,
  reportId: string,
  note: string,
): Promise<ReportRow | undefined> => {
  const [row] = await tx
    .update(eventReports)
    .set({ resolvedAt: new Date(), resolution: 'rejected', adminNote: note })
    .where(and(eq(eventReports.id, reportId), isNull(eventReports.resolvedAt)))
    .returning();
  return row;
};
