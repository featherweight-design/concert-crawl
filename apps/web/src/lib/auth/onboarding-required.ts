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
 * on or after the cutoff that has no `onboardedAt` stamp. Anything it cannot
 * read is false, so a missing or malformed claim lets the visitor through.
 */
export const needsOnboarding = (claims: unknown): boolean => {
  const parsed = claimsSchema.safeParse(claims);
  if (!parsed.success) return false;
  if (parsed.data.created_at < ONBOARDING_REQUIRED_SINCE) return false;
  return !parsed.data.metadata?.onboardedAt;
};
