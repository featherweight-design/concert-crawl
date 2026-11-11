import type { DOING_LABELS } from '../definitions/copy';

// Everything the error page needs to file a report, with no React, Clerk or
// Zod in it, so the page keeps rendering when the app around it has failed.

export type DoingKey = keyof typeof DOING_LABELS;

export const DOING_KEYS = [
  'browsing',
  'searching',
  'opening',
  'myShows',
  'price',
  'other',
] as const satisfies readonly DoingKey[];

export const NOTE_MAX = 1000;
export const ERROR_ID_PATTERN = /^[\w-]{1,64}$/;
export const ERROR_REPORT_ENDPOINT = '/api/error-report';
export const SEND_TIMEOUT_MS = 8000;
export const PENDING_REPORT_KEY = 'cc-error-report-pending';

/** What the page sends to its own route handler. */
export interface ErrorReportBody {
  errorId: string;
  doing?: DoingKey | undefined;
  note?: string | undefined;
  page: string;
  device: string;
}

/**
 * `rejected` is a 4xx the same report will always get again, so a saved copy
 * is dropped rather than retried forever.
 */
export type SendResult = 'sent' | 'unauthorized' | 'rejected' | 'failed';

/**
 * Clerk keeps `__client_uat` (and a suffixed twin) set to the last sign-in
 * time, and to 0 once signed out. Present and non-zero means a session.
 */
export const hasClerkSession = (cookie: string): boolean =>
  cookie.split(';').some((part) => {
    const [name = '', ...rest] = part.trim().split('=');
    if (name !== '__client_uat' && !name.startsWith('__client_uat_')) {
      return false;
    }
    const value = rest.join('=');
    return value !== '' && value !== '0';
  });

/** A ten-digit id for a browser throw, which has no server digest. */
export const newErrorId = (): string => {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return Array.from(values, (value) =>
    String(value % 100_000).padStart(5, '0'),
  ).join('');
};

const RETRYABLE = new Set([408, 425, 429]);

export const sendErrorReport = async (
  body: ErrorReportBody,
): Promise<SendResult> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch(ERROR_REPORT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (res.ok) return 'sent';
    if (res.status === 401) return 'unauthorized';
    if (res.status < 500 && !RETRYABLE.has(res.status)) return 'rejected';
    return 'failed';
  } catch {
    return 'failed';
  } finally {
    clearTimeout(timer);
  }
};

// Storage can throw (private mode, blocked site data), so every access is
// guarded and a failure just means nothing is kept.

export const savePendingReport = (body: ErrorReportBody): void => {
  try {
    localStorage.setItem(PENDING_REPORT_KEY, JSON.stringify(body));
  } catch {
    // Nothing kept; the failed card still says what happened.
  }
};

export const readPendingReport = (): unknown => {
  try {
    const raw = localStorage.getItem(PENDING_REPORT_KEY);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearPendingReport = (): void => {
  try {
    localStorage.removeItem(PENDING_REPORT_KEY);
  } catch {
    // Nothing to clear we can reach.
  }
};
