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

// Pair-narrow the engagement signal fields. When kind narrows to null
// (unknown value or absent), force the timestamp to null too so consumers
// never see a half-populated pair. This protects against a future internal
// kind landing in the DB column before the narrowing union here is widened:
// without this, the client would see `kind: null` but a real timestamp,
// which violates the "both null unless deferred" contract and partially
// leaks the existence of an unrecognized admin action.
export const narrowLastAdminAction = (
  rawKind: string | null,
  rawAt: Date | string | null,
): { kind: LastAdminActionKind; at: string | null } => {
  const kind = narrowLastAdminActionKind(rawKind)
  if (kind === null) {
    return { kind: null, at: null }
  }
  const at = rawAt instanceof Date ? rawAt.toISOString() : rawAt
  return { kind, at }
}
