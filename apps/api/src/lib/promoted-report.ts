import { count, desc, eq } from 'drizzle-orm';
import {
  db,
  eventReportConfirms,
  eventReports,
  userProfiles,
} from '@concert-crawl/db';
import type { PromotedReportSummary } from '@concert-crawl/types';
import { activePromotedReportWhere } from './sold-out.js';

/**
 * The promoted fan report of one status on one event, as the detail page
 * shows it: the reporter's handle, the raw confirm-row count (as
 * GET /v1/events/:id/reports counts it) and when it was filed. Null when no
 * report of that status was promoted.
 *
 * With more than one, the latest promotion wins: that is the one that set
 * the status the page shows now.
 *
 * `includeHandle` (default true) is false for a viewer who may not see a fan's
 * identity: the userProfiles lookup is skipped and `reporterHandle` is null, so
 * the handle is never read for an anonymous caller. Pass the verified session
 * state, never a client-supplied flag.
 */
export async function loadPromotedReportSummary(
  eventId: string,
  status: 'sold-out' | 'cancelled' | 'postponed',
  { includeHandle = true }: { includeHandle?: boolean } = {},
): Promise<PromotedReportSummary | null> {
  const [report] = await db
    .select({
      id: eventReports.id,
      reporterId: eventReports.reporterId,
      createdAt: eventReports.createdAt,
    })
    .from(eventReports)
    .where(activePromotedReportWhere(eventId, status))
    .orderBy(desc(eventReports.resolvedAt), desc(eventReports.createdAt))
    .limit(1);
  if (!report) return null;

  const [[confirms], reporter] = await Promise.all([
    db
      .select({ total: count() })
      .from(eventReportConfirms)
      .where(eq(eventReportConfirms.reportId, report.id)),
    includeHandle
      ? db
          .select({ handle: userProfiles.handle })
          .from(userProfiles)
          .where(eq(userProfiles.userId, report.reporterId))
          .limit(1)
          .then(([profile]) => profile)
      : Promise.resolve(undefined),
  ]);

  return {
    reporterHandle: reporter?.handle ?? null,
    confirmsCount: confirms?.total ?? 0,
    reportedAt: report.createdAt.toISOString(),
  };
}
