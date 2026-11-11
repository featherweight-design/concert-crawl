/**
 * The invite-code poster's pure rules: where its QR points, how the QR is
 * drawn, and which codes are worth printing. No request and no database, so
 * the page, the admin list and the tests all read the same answers.
 */
import { encode } from 'uqr';
import type { InviteCode } from '@concert-crawl/types';

/** A QR code as one SVG path, in module units, quiet zone included. */
export interface QrPath {
  /** Modules per side, quiet zone included: the path's viewBox is `0 0 size size`. */
  size: number;
  path: string;
}

/** Modules of white around the code. Two is what scanners reliably need on paper. */
export const QR_QUIET_ZONE = 2;

/**
 * What the QR encodes: the invite screen with the code pre-filled. The visitor
 * still presses the button, so a scan redeems nothing on its own.
 */
export const posterJoinUrl = (origin: string, code: string): string =>
  `${origin}/auth/code?code=${encodeURIComponent(code)}`;

/** The invite screen's address without its scheme, for typing by hand. */
export const posterTypedUrl = (origin: string): string =>
  `${origin.replace(/^https?:\/\//, '')}/auth/code`;

/** The QR as an SVG path at error correction M, drawn locally (no network). */
export const qrPath = (text: string): QrPath => {
  const { data, size } = encode(text, { ecc: 'M', border: QR_QUIET_ZONE });
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

/**
 * A poster is only worth printing for a code that can still admit someone:
 * not revoked, not expired, and with a seat left.
 */
export const isPrintable = (
  code: Pick<
    InviteCode,
    'revokedAt' | 'expiresAt' | 'maxUses' | 'useCount' | 'usedBy' | 'usedAt'
  >,
  now: Date,
): boolean =>
  code.revokedAt == null &&
  (code.expiresAt == null || new Date(code.expiresAt) > now) &&
  seatsTaken(code) < code.maxUses;
