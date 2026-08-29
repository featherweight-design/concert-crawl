/**
 * When a price was last seen: the LATER of its creation and its most recent
 * sighting.
 *
 * Deliberately a max rather than `lastSeenAt ?? createdAt`. Under `??` any
 * non-null sighting wins, so one written behind `createdAt` — clock skew, a
 * backfill, a repaired row — would move a price's freshness backwards and
 * un-stale nothing while looking like it had. The write path should never
 * produce that, which is exactly why the read path must not depend on it not
 * happening.
 *
 * The route's SQL guard implements this same rule with `GREATEST`; the two are
 * independent implementations and are tested separately.
 */
export function deriveObservedAt(
  lastSeenAt: Date | null,
  createdAt: Date,
): Date {
  if (lastSeenAt === null) return createdAt
  return lastSeenAt.getTime() > createdAt.getTime() ? lastSeenAt : createdAt
}
