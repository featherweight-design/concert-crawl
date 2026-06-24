// Narrows the raw `last_admin_action_kind` text column to the API's
// discriminated union before emitting to consumers. Used by:
//   - apps/api/src/routes/events.ts (counterSubmission)
//   - apps/api/src/lib/price-aggregation/aggregate-by-tier.ts (buildCounter)
//   - apps/api/src/routes/admin/contests.ts (detail endpoint)
//
// Today 'defer' is the only kind we surface; resolve clears the field. Any
// unrecognized value is treated as null defensively so a future internal
// kind can't leak to consumers via an outdated client. Centralized so the
// three call sites can't drift on an unrecognized kind.
export type LastAdminActionKind = 'defer' | null

export const narrowLastAdminActionKind = (
  raw: string | null,
): LastAdminActionKind => (raw === 'defer' ? 'defer' : null)

// Pair-narrow the engagement signal fields. The contract is "both fields null
// unless a real defer event occurred." This helper enforces it defensively
// from both sides:
//
//   - If kind is unknown (not 'defer'), force both to null. Protects against
//     a future internal kind landing in the DB column before the narrowing
//     union here is widened (e.g., a future 'escalate' value leaking with a
//     real timestamp would partially expose the new admin action).
//   - If at is null, force both to null. Protects against half-populated
//     state (partial write from a connection drop mid-transaction, a manual
//     UPDATE that set kind but forgot at, or a bad backfill) where the kind
//     is set but the timestamp isn't.
//
// Steady-state contract: either both fields are null, or kind='defer' AND
// at is a real ISO timestamp. Never a half-populated pair.
export const narrowLastAdminAction = (
  rawKind: string | null,
  rawAt: Date | string | null,
): { kind: LastAdminActionKind; at: string | null } => {
  const kind = narrowLastAdminActionKind(rawKind)
  if (kind === null || rawAt === null) {
    return { kind: null, at: null }
  }
  const at = rawAt instanceof Date ? rawAt.toISOString() : rawAt
  return { kind, at }
}
