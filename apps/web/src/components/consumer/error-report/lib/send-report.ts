import { deviceSummary, isReportableId, reportPage } from './report-context';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '';
const APP_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? 'dev';
// The same bounds the API enforces on /v1/feedback.
const MESSAGE_MAX = 2000;
const DOING_MAX = 1000;

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
 * Files the report as an ordinary bug in admin feedback, through the same
 * `/v1/feedback` the edge tab uses. The reporter's words go only to our own
 * table, never to Sentry. Throws on a refused or failed send.
 */
export const sendErrorReport = async (
  token: string,
  draft: ErrorReportDraft,
  userAgent: string,
): Promise<void> => {
  const note = draft.note.trim();
  const doing = draft.doing.trim().slice(0, DOING_MAX);
  const res = await fetch(`${API_URL}/v1/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
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
  });
  if (!res.ok) throw new ReportRejectedError(res.status);
};

/** The API answered, and said no. `permanent` when retrying cannot change it. */
export class ReportRejectedError extends Error {
  readonly permanent: boolean;

  constructor(readonly status: number) {
    super(String(status));
    // 401 (sign in again), 408 and 429 (slow down) can succeed later; any
    // other 4xx is the report itself being refused.
    this.permanent =
      status >= 400 &&
      status < 500 &&
      status !== 401 &&
      status !== 408 &&
      status !== 429;
  }
}
