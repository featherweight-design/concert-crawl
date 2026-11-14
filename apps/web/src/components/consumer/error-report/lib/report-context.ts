import { redactInviteTokens } from '@/lib/sentry-redact';

// What a problem report carries besides the reporter's words, kept coarse on
// purpose: the path without its query or hash (an invite token can live in the
// path), and a device summary rather than a raw user agent.

/** The path only, with invite tokens redacted exactly as Sentry's are. */
export const reportPage = (pathname: string): string =>
  redactInviteTokens(pathname.split(/[?#]/)[0] ?? '').slice(0, 2048);

// iOS browsers carry Safari's engine token plus their own (CriOS, FxiOS,
// EdgiOS), so theirs is matched first. Brave sends a plain Chrome agent and
// reads as Chrome; there is nothing in it to tell them apart.
const BROWSERS: readonly [RegExp, string][] = [
  [/Edg\/|EdgiOS\//, 'Edge'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

const PLATFORMS: readonly [RegExp, string][] = [
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android/, 'Android'],
  [/Mac OS X|Macintosh/, 'Mac'],
  [/Windows/, 'Windows'],
  [/Linux/, 'Linux'],
];

/**
 * "Chrome on Android": enough to start reproducing, nothing that fingerprints.
 * iPadOS sends a desktop Mac agent, so an iPad reads as Mac; there is nothing
 * in the agent to tell them apart.
 */
export const deviceSummary = (userAgent: string): string => {
  const browser =
    BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? 'Browser';
  const platform =
    PLATFORMS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? 'unknown';
  return `${browser} on ${platform}`;
};

/**
 * An error id the API will accept. A digest or event id of any other shape
 * (a library's own `digest` with punctuation in it) is left off the report
 * rather than letting it reject the reporter's words.
 */
export const isReportableId = (value: string | undefined): value is string =>
  value !== undefined && /^[\w-]{1,64}$/.test(value);

const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * The error ID for a browser throw, which has no server `digest`: `c-` and ten
 * random base-36 characters, so it passes `isReportableId` (and the route's
 * `^[\w-]{1,64}$`) and reads apart from a server digest, which is all digits.
 */
export const mintClientErrorId = (): string => {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let id = 'c-';
  for (const byte of bytes) id += ID_ALPHABET.charAt(byte % ID_ALPHABET.length);
  return id;
};

/**
 * Signed in, as far as a page outside ClerkProvider can tell (`global-error`):
 * Clerk's `__client_uat` cookie holds the last sign-in time in seconds, and
 * `0` when signed out. Clerk can also write a per-instance `__client_uat_<suffix>`
 * copy, and a stale host-only `__client_uat=0` can sit beside a live one, so
 * every one of them is read: signed in when ANY holds a positive integer.
 * Missing, `0` or anything unreadable is signed out, so the page never offers
 * a card that would 401.
 */
export const hasClientSession = (cookie: string): boolean =>
  cookie.split(';').some((part) => {
    const [name = '', ...rest] = part.trim().split('=');
    if (name !== '__client_uat' && !name.startsWith('__client_uat_')) {
      return false;
    }
    const value = rest.join('=');
    return /^\d+$/.test(value) && Number(value) > 0;
  });
