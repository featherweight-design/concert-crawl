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
