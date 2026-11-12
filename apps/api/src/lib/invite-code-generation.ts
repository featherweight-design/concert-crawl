import { randomBytes } from 'node:crypto';

/** Seats on a member's own share code: "unlimited" in practice, never NULL
 * (every seat check compares against `max_uses`). Revoke bounds a leak. */
export const MEMBER_CODE_SEATS = 10_000;

/** A fresh `BETA-XXXX-XXXX` code (uppercase hex, URL-safe). */
export function generateInviteCode(): string {
  const part = () => randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
  return `BETA-${part()}-${part()}`;
}
