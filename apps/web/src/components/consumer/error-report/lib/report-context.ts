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

const deviceParts = (userAgent: string) => ({
  browser:
    BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? 'Browser',
  platform:
    PLATFORMS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? 'unknown',
});

/**
 * "Chrome on Android": enough to start reproducing, nothing that fingerprints.
 * iPadOS sends a desktop Mac agent, so an iPad reads as Mac; there is nothing
 * in the agent to tell them apart.
 */
export const deviceSummary = (userAgent: string): string => {
  const { browser, platform } = deviceParts(userAgent);
  return `${browser} on ${platform}`;
};

/**
 * "iPhone · Safari", the error page's spelling of the same coarse summary. An
 * unknown platform is left off rather than shown as a word.
 */
export const coarseDevice = (userAgent: string): string => {
  const { browser, platform } = deviceParts(userAgent);
  return platform === 'unknown' ? browser : `${platform} · ${browser}`;
};

/**
 * An error id the API will accept. A digest or event id of any other shape
 * (a library's own `digest` with punctuation in it) is left off the report
 * rather than letting it reject the reporter's words.
 */
export const isReportableId = (value: string | undefined): value is string =>
  value !== undefined && /^[\w-]{1,64}$/.test(value);
