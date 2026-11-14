import { deviceSummary, isReportableId, reportPage } from './report-context';

const APP_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? 'dev';
// The same bounds the API enforces on /v1/feedback.
const MESSAGE_MAX = 2000;
const DOING_MAX = 1000;
// The README's "about an 8s timeout": past this the report is saved for later.
const SEND_TIMEOUT_MS = 8_000;

/** What a problem report is made of, before it is shaped for the API. */
export interface ErrorReportDraft {
  /** The chip the reporter tapped. One tap is a complete report. */
  doing: string;
  /** Optional words from the reporter. */
  note: string;
  /** The server's digest for a server-side throw. */
  digest?: string | undefined;
  /** The browser's Sentry event for a client-side throw. */
  sentryEventId?: string | undefined;
  /** Path only (no query or hash), as `reportPage` returns it. */
  page: string;
}

/**
 * How a send that did not land should be handled.
 * - `refused`: the API said no on the report's merits, or rate-limited it
 *   (429). Not saved, never retried: the same report gets the same answer.
 * - `signed-out`: the session is gone (401). The page switches to its
 *   signed-out layout.
 * - `transient`: 408, 425, 5xx, a timeout or no network. Saved on the device
 *   and sent on the next launch.
 */
export type ReportFailure = 'refused' | 'signed-out' | 'transient';

export const classifyReportStatus = (status: number): ReportFailure => {
  if (status === 401) return 'signed-out';
  // Request Timeout and Too Early both mean "this attempt", not "this report".
  if (status === 408 || status === 425) return 'transient';
  if (status >= 400 && status < 500) return 'refused';
  return 'transient';
};

/** The route answered, and said no. `outcome` says what to do about it. */
export class ReportRejectedError extends Error {
  readonly outcome: ReportFailure;

  constructor(readonly status: number) {
    super(String(status));
    this.outcome = classifyReportStatus(status);
  }
}

/**
 * The class of any failure `sendErrorReport` throws. Anything that is not an
 * answer from the route (a network error, the 8s timeout) is transient.
 */
export const classifyReportFailure = (err: unknown): ReportFailure =>
  err instanceof ReportRejectedError ? err.outcome : 'transient';

/**
 * Files the report as an ordinary bug in admin feedback. It goes to the
 * same-origin `/api/error-report`, which checks the cookie session and forwards
 * to `/v1/feedback` with a token, so this needs no Clerk on the page. The
 * reporter's words go only to our own table, never to Sentry. Throws a
 * `ReportRejectedError` when the route answers with a failure, and whatever
 * `fetch` throws on a timeout or network error.
 */
export const sendErrorReport = async (
  draft: ErrorReportDraft,
  userAgent: string,
): Promise<void> => {
  const note = draft.note.trim();
  const doing = draft.doing.trim().slice(0, DOING_MAX);
  const res = await fetch('/api/error-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'bug',
      message: (note === '' ? doing : `${doing}. ${note}`).slice(
        0,
        MESSAGE_MAX,
      ),
      pageUrl: reportPage(draft.page),
      metadata: {
        source: 'error',
        build: APP_VERSION,
        device: deviceSummary(userAgent),
        doing,
        // The same keys the older "Tell us what happened" form sent, which the
        // admin feedback list already reads.
        ...(isReportableId(draft.digest) ? { digest: draft.digest } : {}),
        ...(isReportableId(draft.sentryEventId)
          ? { sentryEventId: draft.sentryEventId }
          : {}),
      },
    }),
    // The report outlives the page if the reporter taps Try again or leaves.
    keepalive: true,
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    // The route is public in the middleware and answers a lost session with
    // 401 itself. If a redirect ever comes back anyway (the route dropped off
    // the public list), following it would land on the sign-in page's 200 and
    // read as sent, so it is treated as signed out instead.
    redirect: 'manual',
  });
  if (res.type === 'opaqueredirect') throw new ReportRejectedError(401);
  if (!res.ok) throw new ReportRejectedError(res.status);
};
