/**
 * Mirrors `venueShort` in `apps/web/src/components/consumer/definitions/lib.ts`,
 * which the browse venue chip uses to label an active venue filter. The e2e
 * package cannot import web source (its `@/` aliases do not resolve here), so
 * the suffix pattern is copied and `venue-short.test.ts` fails the PR that
 * lets the two drift apart.
 */
export const VENUE_SUFFIX =
  /\s+(Amphitheatre|Amphitheater|Theatre|Theater|Ballroom|Auditorium|Hall|Arena)$/i;

export const venueShort = (name: string): string =>
  name.replace(VENUE_SUFFIX, '').trim();
