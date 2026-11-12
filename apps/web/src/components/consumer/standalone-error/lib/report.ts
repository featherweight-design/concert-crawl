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
/** Clear headroom over the route handler's 7s upstream timeout. */
export const SEND_TIMEOUT_MS = 12_000;

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
 * is dropped rather than retried forever. `limited` is a 429: the card treats
 * it as refused (not saved, not retried), while a copy saved earlier stays
 * for a later launch.
 */
export type SendResult =
  'sent' | 'unauthorized' | 'rejected' | 'limited' | 'failed';

const cookieValues = (cookie: string, base: string): string[] =>
  cookie.split(';').flatMap((part) => {
    const [name = '', ...rest] = part.trim().split('=');
    return name === base || name.startsWith(`${base}_`) ? [rest.join('=')] : [];
  });

/**
 * Clerk keeps `__client_uat` (and a suffixed twin) set to the last sign-in
 * time, and to 0 once signed out. Present and non-zero means a session.
 */
export const hasClerkSession = (cookie: string): boolean =>
  cookieValues(cookie, '__client_uat').some(
    (value) => value !== '' && value !== '0',
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** The `sub` of Clerk's session token, read (never verified) from its cookie. */
const sessionSubject = (token: string): string | null => {
  const payload = token.split('.')[1];
  if (payload === undefined) return null;
  try {
    const json: unknown = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    );
    return isRecord(json) && typeof json['sub'] === 'string'
      ? json['sub']
      : null;
  } catch (err) {
    console.warn('[error-report] unreadable session cookie', { err });
    return null;
  }
};

/**
 * Who a saved report belongs to: the Clerk user id from the session cookie
 * when it is readable, else the sign-in time `__client_uat` carries. Null when
 * signed out. Only ever compared for equality, never trusted for auth.
 */
export const sessionOwner = (cookie: string): string | null => {
  if (!hasClerkSession(cookie)) return null;
  for (const token of cookieValues(cookie, '__session')) {
    const sub = sessionSubject(token);
    if (sub !== null) return `user:${sub}`;
  }
  const uat = cookieValues(cookie, '__client_uat').find(
    (value) => value !== '' && value !== '0',
  );
  return uat === undefined ? null : `uat:${uat}`;
};

/** A ten-digit id for a browser throw, which has no server digest. */
export const newErrorId = (): string => {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return Array.from(values, (value) =>
    String(value % 100_000).padStart(5, '0'),
  ).join('');
};

const RETRYABLE = new Set([408, 425]);
const RATE_LIMITED = 429;

export const sendErrorReport = async (
  body: ErrorReportBody,
): Promise<SendResult> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch(ERROR_REPORT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // A resend of the same report is filed once (the API dedupes on it).
        'Idempotency-Key': `error-report:${body.errorId}`,
      },
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (res.ok) return 'sent';
    if (res.status === 401) return 'unauthorized';
    if (res.status === RATE_LIMITED) return 'limited';
    if (res.status < 500 && !RETRYABLE.has(res.status)) return 'rejected';
    return 'failed';
  } catch (err) {
    console.warn('[error-report] send failed', { err, errorId: body.errorId });
    return 'failed';
  } finally {
    clearTimeout(timer);
  }
};
