import { eq } from 'drizzle-orm';
import { db, eventReports } from '@concert-crawl/db';
import { lockEventForSaleWrite } from './past-lock.js';
import { activeSoldOutWhere } from './sold-out.js';

/**
 * Promote a pending sold-out report, so the show reads as sold out. The one
 * write for an admin resolving the report as promoted and a fan report
 * reaching its confirm threshold.
 *
 * Runs under the event's row lock, and a past show (lockEventForSaleWrite)
 * throws PastLockedError before the write, so the report stays as it was and
 * nobody hears. `isRealTransition` is whether no other live sold-out existed,
 * read under the same lock: the caller sends watch.soldout only when it is
 * true, after this commits.
 */
export async function promoteSoldOutReport(
  eventId: string,
  reportId: string,
  fields: { adminNote?: string | null } = {},
): Promise<{
  report: typeof eventReports.$inferSelect | undefined;
  isRealTransition: boolean;
}> {
  return db.transaction(async (tx) => {
    await lockEventForSaleWrite(tx, eventId);
    // This report is still unresolved, so the promoted filter omits it: any
    // match is another sold-out already live on the show.
    const existing = await tx
      .select({ id: eventReports.id })
      .from(eventReports)
      .where(activeSoldOutWhere(eventId))
      .limit(1);
    const [report] = await tx
      .update(eventReports)
      .set({ resolvedAt: new Date(), resolution: 'promoted', ...fields })
      .where(eq(eventReports.id, reportId))
      .returning();
    return { report, isRealTransition: existing.length === 0 };
  });
}
