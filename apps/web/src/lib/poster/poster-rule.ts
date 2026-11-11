/**
 * The invite-code poster's pure rules: where its QR points, how the QR is
 * drawn, and which codes are worth printing. No request and no database, so
 * the page, the admin list and the tests all read the same answers.
 */
import { encode } from 'uqr';
import type { InviteCode, VenuePublic } from '@concert-crawl/types';
import { POSTER_COPY } from './definitions/copy';

/** A QR code as one SVG path, in module units, quiet zone included. */
export interface QrPath {
  /** Modules per side, quiet zone included: the path's viewBox is `0 0 size size`. */
  size: number;
  path: string;
}

/** Modules of white around the code: the four the QR spec asks for. */
export const QR_QUIET_ZONE = 4;

/**
 * What the QR encodes: the short link `/I/<CODE>`, which the proxy sends to the
 * invite screen with the code filled in (`inviteShortLinkRedirect`). The
 * visitor still presses the button, so a scan redeems nothing on its own.
 * All caps, because scheme, host and the code are case-insensitive and an
 * uppercase URL fits the QR's alphanumeric mode: fewer, larger modules.
 */
export const posterJoinUrl = (origin: string, code: string): string =>
  `${origin}/I/${code}`.toUpperCase();

/** The short link without its scheme, for typing by hand. */
export const posterTypedUrl = (origin: string): string =>
  `${origin.replace(/^https?:\/\//, '')}/i`;

/** The QR as an SVG path at error correction Q, drawn locally (no network). */
export const qrPath = (text: string): QrPath => {
  const { data, size } = encode(text, { ecc: 'Q', border: QR_QUIET_ZONE });
  const parts: string[] = [];
  data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) parts.push(`M${x} ${y}h1v1h-1z`);
    }),
  );
  return { size, path: parts.join('') };
};

/**
 * Seats a code has given out. A first redemption (`usedBy` or `usedAt`)
 * always counts as one, whatever `useCount` says: legacy rows (#1084) carry
 * `usedBy` with no `usedAt`, and a redemption written by an API older than
 * `useCount` sets only those two. Mirrors `seatsTaken` in
 * `packages/db/src/schema/users.ts`, which the API decides with.
 */
export const seatsTaken = (
  code: Pick<InviteCode, 'useCount' | 'usedBy' | 'usedAt'>,
): number =>
  Math.max(code.useCount, code.usedBy != null || code.usedAt != null ? 1 : 0);

type StatusFields = Pick<
  InviteCode,
  'revokedAt' | 'expiresAt' | 'maxUses' | 'useCount' | 'usedBy' | 'usedAt'
>;

export type InviteStatus = 'active' | 'redeemed' | 'expired' | 'revoked';

/** One answer to "is this code live", for the admin list and the poster. */
export const inviteStatus = (code: StatusFields, now: Date): InviteStatus => {
  if (code.revokedAt != null) return 'revoked';
  if (seatsTaken(code) >= code.maxUses) return 'redeemed';
  if (code.expiresAt != null && new Date(code.expiresAt) <= now)
    return 'expired';
  return 'active';
};

/**
 * A poster is only worth printing for a live code that admits more than one
 * person: a personal code on a wall is spent by the first scan.
 */
export const isPrintable = (code: StatusFields, now: Date): boolean =>
  code.maxUses > 1 && inviteStatus(code, now) === 'active';

/**
 * Characters one line of the poster's venue list is counted as holding. 10.5 px
 * JetBrains Mono at 0.14em tracking measures 7.8 px a character, and the Night
 * panel's text column is 678 px, so a line holds 87. The list wraps at spaces
 * and after each separator, so a line can end up to one word short: 12 are
 * held back for that (the longest word in a Denver venue name today is
 * AMPHITHEATRE).
 */
export const POSTER_VENUE_LINE_CHARS = 75;
/** Lines the venue list may wrap to, as in the design's sheets. */
export const POSTER_VENUE_LINES = 3;
/** A `·` separator and its padding, in characters of the same line. */
const VENUE_SEPARATOR_CHARS = 3;

type PosterVenue = Pick<VenuePublic, 'name' | 'featured' | 'upcomingCount'>;

/**
 * The venues the poster counts and names: active ones with shows coming, the
 * ones a nightly crawl is actually reading, so "We check N venue calendars
 * every night" stays true.
 */
export const posterVenues = <V extends Pick<VenuePublic, 'upcomingCount'>>(
  venues: readonly V[],
): V[] => venues.filter((venue) => venue.upcomingCount > 0);

/**
 * The venue names the poster names, from live data: featured venues first,
 * then the busiest, cut to what fits `POSTER_VENUE_LINES` lines. `more` is true when any were
 * left off, so the line closes with "and more" only when that is so.
 */
export const posterVenueLine = (
  venues: readonly PosterVenue[],
  budget: number = POSTER_VENUE_LINE_CHARS * POSTER_VENUE_LINES,
): { names: string[]; more: boolean } => {
  const sorted = [...venues]
    .sort(
      (left, right) =>
        Number(right.featured) - Number(left.featured) ||
        right.upcomingCount - left.upcomingCount ||
        left.name.localeCompare(right.name),
    )
    .map((venue) => venue.name);
  const cost = (name: string, i: number) =>
    name.length + (i ? VENUE_SEPARATOR_CHARS : 0);
  const total = sorted.reduce((sum, name, i) => sum + cost(name, i), 0);
  if (total <= budget) return { names: sorted, more: false };

  const room = budget - VENUE_SEPARATOR_CHARS - POSTER_COPY.andMore.length;
  const names: string[] = [];
  let used = 0;
  for (const name of sorted) {
    const next = used + cost(name, names.length);
    // The first name always goes in, so the line never reads "and more" alone.
    if (names.length > 0 && next > room) break;
    names.push(name);
    used = next;
  }
  return { names, more: true };
};

/**
 * The QR as a standalone SVG file: black modules on a white ground, quiet zone
 * included, crisp at any size. The same path the sheet draws.
 */
export const qrSvg = (qr: QrPath): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${qr.size} ${qr.size}" width="${qr.size * 10}" height="${qr.size * 10}" shape-rendering="crispEdges">` +
  `<rect width="${qr.size}" height="${qr.size}" fill="#ffffff"/>` +
  `<path d="${qr.path}" fill="#000000"/></svg>`;

/** The API's cap on seats per code. */
export const MAX_SEATS = 500;
/**
 * The fewest seats a poster code may have: the Posters tab lists only codes
 * that admit more than one person, so a 1-seat "poster" would vanish.
 */
export const POSTER_MIN_SEATS = 2;

/**
 * The typed seat count, or null when it falls outside `min` to `MAX_SEATS` or
 * isn't a whole number. Never clamped: a silently rewritten count mints a code
 * the admin did not ask for.
 */
export const parseSeats = (typed: string, min = 1): number | null => {
  if (!/^\d+$/.test(typed.trim())) return null;
  const seats = Number(typed.trim());
  return seats >= min && seats <= MAX_SEATS ? seats : null;
};
