import {
  classifyReportFailure,
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
 * Sends a report saved by an earlier failure. Runs once per app open, and the
 * caller only runs it for a signed-in visitor. A refused report is dropped;
 * anything else that fails leaves it saved for the next launch.
 */
export const flushPendingReport = async (
  userAgent: string,
): Promise<boolean> => {
  const pending = loadPendingReport();
  if (pending === null) return false;
  try {
    await sendErrorReport(pending, userAgent);
    clearPendingReport();
    return true;
  } catch (err) {
    // A refused report (429 or any other 4xx but 401, 408 and 425) gets the
    // same answer every time: retrying it on every app open for a week only
    // repeats the failure. A transient failure can succeed later, and so can a
    // 401: Clerk's client can say signed in while the cookie the route reads
    // has gone stale, and that is no reason to lose the report.
    if (classifyReportFailure(err) === 'refused') clearPendingReport();
    return false;
  }
};
