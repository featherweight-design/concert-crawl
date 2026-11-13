import {
  ReportRejectedError,
  sendErrorReport,
  type ErrorReportDraft,
} from './send-report';

// A report that could not be sent is kept on the device and sent the next time
// the app opens (the Tell us card's failed state promises exactly that). One
// slot, not a queue: a newer failed report replaces an older one, so a flaky
// connection cannot stack up a pile of duplicates.
const KEY = 'cc-pending-error-report';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface PendingReport extends ErrorReportDraft {
  savedAt: number;
}

const isPending = (value: unknown): value is PendingReport => {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record['doing'] === 'string' &&
    typeof record['note'] === 'string' &&
    typeof record['page'] === 'string' &&
    typeof record['savedAt'] === 'number' &&
    (record['digest'] === undefined || typeof record['digest'] === 'string') &&
    (record['sentryEventId'] === undefined ||
      typeof record['sentryEventId'] === 'string')
  );
};

/** Keeps the report for the next launch. Storage can be off: that is not fatal. */
export const savePendingReport = (draft: ErrorReportDraft): void => {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() }),
    );
  } catch {
    /* private mode or storage full: the report is lost, nothing else is */
  }
};

export const clearPendingReport = (): void => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing stored, nothing to clear */
  }
};

export const loadPendingReport = (now = Date.now()): PendingReport | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPending(parsed) || now - parsed.savedAt > MAX_AGE_MS) {
      clearPendingReport();
      return null;
    }
    return parsed;
  } catch {
    clearPendingReport();
    return null;
  }
};

/**
 * Sends a report saved by an earlier failure. Runs once per app open, for a
 * signed-in visitor only (`getToken` yields null otherwise, and the report
 * waits). A send that fails again leaves it saved for the next launch.
 */
export const flushPendingReport = async (
  getToken: () => Promise<string | null>,
  userAgent: string,
): Promise<boolean> => {
  const pending = loadPendingReport();
  if (pending === null) return false;
  try {
    const token = await getToken();
    if (!token) return false;
    await sendErrorReport(token, pending, userAgent);
    clearPendingReport();
    return true;
  } catch (err) {
    // A report the API refuses on its merits (a 4xx that is not "sign in
    // again", "slow down" or "timed out") will be refused every time: drop it
    // rather than retrying it on every app open for a week.
    if (err instanceof ReportRejectedError && err.permanent) {
      clearPendingReport();
    }
    return false;
  }
};
