/**
 * The plan keys a `?tier=` link can carry through sign-up. The tier picker that
 * wrote them is retired (the app is free), but stored links and the sign-up
 * plumbing still pass the param on until it is removed (W17).
 */
export const PENDING_TIER_KEYS = [
  'free',
  'supporter',
  'premium',
  'founder',
] as const;

export type PendingTierKey = (typeof PENDING_TIER_KEYS)[number];

/**
 * The tier a visitor chose before they had an account, read back off the URL on
 * the other side of sign-up (#1284).
 *
 * It arrives from a querystring the visitor can edit, so an unrecognised value
 * decodes to `null` rather than to a default — preselecting a tier nobody chose
 * is worse than preselecting none. Mirrors `decodeIntent`'s contract.
 */
export const decodePendingTier = (
  raw: string | null | undefined,
): PendingTierKey | null =>
  PENDING_TIER_KEYS.find((key) => key === raw) ?? null;
