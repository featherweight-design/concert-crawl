/**
 * Helpers for scripts/2026-07-11-gifted-comps-backfill.ts, split out so the
 * pure logic is unit-testable without a Clerk client or DB connection.
 * Mirrors the helpers/test split of
 * scripts/2026-06-19-non-concert-backfill-helpers.ts.
 */

/**
 * Predicate over a Clerk user's `publicMetadata` (unknown at the system
 * boundary — narrowed via `in`-operator checks, no `as` casts, per
 * CLAUDE.md). True iff the metadata carries the hand-set beta gifting
 * marker `plan: 'premium_gifted'`.
 */
export const hasGiftedPlanMetadata = (publicMetadata: unknown): boolean => {
  if (typeof publicMetadata !== 'object' || publicMetadata === null) {
    return false
  }
  if (!('plan' in publicMetadata)) {
    return false
  }
  return publicMetadata.plan === 'premium_gifted'
}

/**
 * Redacts an email's local part for operator logs (keeps the first
 * character + domain) so full addresses never land in terminal/CI logs.
 */
export const redactEmail = (email: string): string => {
  const atIndex = email.indexOf('@')
  if (atIndex <= 0) {
    return '(no email)'
  }
  return `${email[0]}***@${email.slice(atIndex + 1)}`
}

/**
 * Resolves the `granted_by` audit value from CLI args. Accepts
 * `--granted-by=<clerkUserId>` (the admin running the backfill); falls back
 * to the literal 'backfill' when not provided, per eng infra spec Part 1 §7.
 */
export const resolveGrantedBy = (argv: readonly string[]): string => {
  for (const arg of argv) {
    if (arg.startsWith('--granted-by=')) {
      const value = arg.slice('--granted-by='.length).trim()
      if (value.length > 0) {
        return value
      }
    }
  }
  return 'backfill'
}
