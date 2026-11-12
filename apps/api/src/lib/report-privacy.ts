import type { PromotedReportSummary } from '@concert-crawl/types';

/**
 * The one place a promoted fan report is shaped for a viewer. A reporter's
 * handle is a fan's identity: only a signed-in viewer sees it. An anonymous
 * caller gets the report with `reporterHandle` null, so the field stays present
 * and consumers keep compiling.
 *
 * `isAuthed` must come from the verified session (`getAuth(ctx)?.userId`),
 * never from a header or query the client controls.
 */
export function redactReporter(
  report: PromotedReportSummary | null,
  isAuthed: boolean,
): PromotedReportSummary | null {
  if (report === null || isAuthed) return report;
  return { ...report, reporterHandle: null };
}

/**
 * The same rule for a row of GET /v1/events/:id/reports. Two identities leave
 * that row, and neither is needed by the page:
 *
 * - `reporterHandle`: signed-in viewers only, as in `redactReporter`.
 * - `reporterId` (a raw Clerk user id): only on the viewer's own report, where
 *   it is their own id. Everyone else's id is never sent, to anyone. The page
 *   marks "yours" with the server-computed `isReporter`.
 */
export function redactReportRow<
  T extends {
    reporterId: string | null;
    reporterHandle: string | null;
    isReporter: boolean;
  },
>(row: T, isAuthed: boolean): T {
  return {
    ...row,
    reporterId: row.isReporter ? row.reporterId : null,
    reporterHandle: isAuthed ? row.reporterHandle : null,
  };
}
