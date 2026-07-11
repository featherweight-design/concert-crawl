/**
 * Helpers for scripts/2026-07-11-gifted-comps-backfill.ts, split out so the
 * pure logic is unit-testable without a Clerk client or DB connection.
 * Mirrors the helpers/test split of
 * scripts/2026-06-19-non-concert-backfill-helpers.ts.
 */

/**
 * Type guard over a Clerk user's `publicMetadata` (unknown at the system
 * boundary — no `as` casts, per CLAUDE.md). True iff the metadata carries
 * the hand-set beta gifting marker `plan: 'premium_gifted'`.
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
