import { parseErrorReport } from './parse';
import type { ErrorReportBody } from './report';

// Reports the error page could not send, kept on the device for the next
// launch. A small list keyed by error id, newest first, each tagged with the
// session it was written under so another account on this browser never
// sends it. Storage can throw (private mode, blocked site data), so every
// access is guarded and logged, and a failure just means nothing is kept.

export const PENDING_REPORTS_KEY = 'cc-error-reports-pending';
export const RESEND_LOCK_KEY = 'cc-error-reports-lock';
export const PENDING_CAP = 3;
/** Long enough to cover one launch's sends, short enough to never strand. */
export const RESEND_LOCK_MS = 30_000;

export interface PendingReport {
  owner: string;
  savedAt: number;
  report: ErrorReportBody;
}

const toPending = (value: unknown): PendingReport | null => {
  if (typeof value !== 'object' || value === null) return null;
  const owner: unknown = Reflect.get(value, 'owner');
  const savedAt: unknown = Reflect.get(value, 'savedAt');
  const report = parseErrorReport(Reflect.get(value, 'report'));
  if (typeof owner !== 'string' || typeof savedAt !== 'number') return null;
  return report === null ? null : { owner, savedAt, report };
};

/** Every readable saved report; an unreadable entry is left out. */
export const readPendingReports = (): PendingReport[] => {
  try {
    const raw = localStorage.getItem(PENDING_REPORTS_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry: unknown) => {
      const pending = toPending(entry);
      return pending === null ? [] : [pending];
    });
  } catch (err) {
    console.warn('[error-report] could not read saved reports', { err });
    return [];
  }
};

const writePendingReports = (entries: PendingReport[]): void => {
  try {
    if (entries.length === 0) {
      localStorage.removeItem(PENDING_REPORTS_KEY);
    } else {
      localStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(entries));
    }
  } catch (err) {
    console.warn('[error-report] could not write saved reports', { err });
  }
};

/** Keeps this report (replacing an older copy of the same id), newest wins. */
export const savePendingReport = (
  report: ErrorReportBody,
  owner: string,
): void => {
  const others = readPendingReports().filter(
    (entry) => entry.report.errorId !== report.errorId,
  );
  writePendingReports(
    [{ owner, savedAt: Date.now(), report }, ...others]
      .sort((left, right) => right.savedAt - left.savedAt)
      .slice(0, PENDING_CAP),
  );
};

/**
 * Removes only these ids, read fresh so an entry another tab or the page
 * added in the meantime survives.
 */
export const removePendingReports = (errorIds: readonly string[]): void => {
  if (errorIds.length === 0) return;
  const entries = readPendingReports();
  const kept = entries.filter(
    (entry) => !errorIds.includes(entry.report.errorId),
  );
  if (kept.length !== entries.length) writePendingReports(kept);
};

/**
 * A best-effort lock so two tabs opening at once don't both send. Returns
 * its token when taken, null when another tab holds a fresh one.
 */
export const acquireResendLock = (): string | null => {
  try {
    const held = localStorage.getItem(RESEND_LOCK_KEY);
    const heldAt = held === null ? NaN : Number(held.split(':')[0]);
    if (Number.isFinite(heldAt) && Date.now() - heldAt < RESEND_LOCK_MS) {
      return null;
    }
    const token = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(RESEND_LOCK_KEY, token);
    // The other tab may have written in between; whoever's token stuck wins.
    return localStorage.getItem(RESEND_LOCK_KEY) === token ? token : null;
  } catch (err) {
    console.warn('[error-report] could not take the resend lock', { err });
    return null;
  }
};

export const releaseResendLock = (token: string): void => {
  try {
    if (localStorage.getItem(RESEND_LOCK_KEY) === token) {
      localStorage.removeItem(RESEND_LOCK_KEY);
    }
  } catch (err) {
    console.warn('[error-report] could not release the resend lock', { err });
  }
};
