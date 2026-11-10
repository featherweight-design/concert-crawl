import { redactInviteTokens } from '@/lib/sentry-redact';

/**
 * What a problem report carries besides the reporter's words, kept coarse on
 * purpose: the path without its query or hash (an invite token can live in
 * the path), and a
 * device summary rather than a raw user agent.
 */

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

/** "Chrome on Android": enough to reproduce, nothing that fingerprints. */
export const deviceSummary = (userAgent: string): string => {
  const browser =
    BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? 'Browser';
  const platform =
    PLATFORMS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? 'unknown';
  return `${browser} on ${platform}`;
};
