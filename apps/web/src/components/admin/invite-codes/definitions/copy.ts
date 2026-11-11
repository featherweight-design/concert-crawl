/**
 * The printed invite poster. It hangs in public, so this is consumer copy and
 * goes through copy-review, though it is drawn from an admin page.
 */
export const POSTER_COPY = {
  wordmark: 'concert crawl',
  kicker: 'Private beta',
  headline: 'Denver shows, one list.',
  sub: 'We check local venue calendars every night so you don’t have to.',
  scan: 'Scan to get in',
  codeLabel: 'Invite code',
  typed: 'Or type it in at',
  // The QR's accessible name, for the screen preview.
  qrLabel: (code: string) => `QR code for invite ${code}`,
} as const;
