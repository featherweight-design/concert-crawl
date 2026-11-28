import { z } from 'zod';

/**
 * Accounts created at or after this instant must finish (or skip) the tour
 * before the app opens; older accounts are never sent there. The tour shipped
 * long before this rule, so an older account has had its chance, and there is
 * no backfill of `onboardedAt` for it.
 */
export const ONBOARDING_REQUIRED_SINCE = Date.parse('2026-11-28T00:00:00Z');

export const ONBOARDING_PATH = '/onboarding';

/**
 * Set by the tour (Finish or Skip) to the user's id, so this browser is let
 * through at once, before the `onboardedAt` stamp reaches the session token,
 * and even when the stamp write fails. Holding the id rather than a flag means
 * a different new account signing in on the same browser still owes the tour.
 * Not a security boundary: anyone can skip the tour anyway.
 */
export const ONBOARDED_COOKIE = 'cc_onboarded';
export const ONBOARDED_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * The session-token fields the rule reads. They come from the Clerk dashboard's
 * session token template (`created_at` and `metadata`, see types/clerk.d.ts), so
 * they are parsed rather than trusted: a template without `created_at`, or a
 * token minted before it was added, must never force anyone.
 */
const claimsSchema = z.object({
  created_at: z.number().finite(),
  metadata: z.object({ onboardedAt: z.string().min(1).optional() }).optional(),
});

/**
 * True when a signed-in session must be sent to the tour: an account created
 * on or after the cutoff that has no `onboardedAt` stamp, on a browser whose
 * `cc_onboarded` cookie does not name this user. Anything it cannot read is
 * false, so a missing or malformed claim lets the visitor through.
 */
export const needsOnboarding = (
  claims: unknown,
  userId: string,
  onboardedCookie: string | undefined,
): boolean => {
  if (onboardedCookie === userId) return false;
  const parsed = claimsSchema.safeParse(claims);
  if (!parsed.success) return false;
  // The session token's `{{user.created_at}}` arrives in seconds (decoded on
  // staging, 2026-11-27), though the Backend API's user object is in ms. Any
  // number below 1e12 (as ms, before 2001) is read as seconds and scaled, so
  // either unit works.
  const createdAt = parsed.data.created_at;
  const createdAtMs = createdAt < 1e12 ? createdAt * 1000 : createdAt;
  if (createdAtMs < ONBOARDING_REQUIRED_SINCE) return false;
  return !parsed.data.metadata?.onboardedAt;
};
