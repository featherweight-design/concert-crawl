/**
 * Ceiling on how long a venue may coast on page-hash dedup before we re-extract
 * regardless. Once the last success is this old the skip stops — the ceiling
 * day itself re-extracts. Set well above a normal quiet stretch so it never
 * costs an LLM call on a genuinely static page, and well below the point where
 * a frozen listing reaches customers.
 */
export const MAX_SKIP_STREAK_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

interface SkipDecision {
  hashMatches: boolean
  lastSuccessAt: Date | null
  now: Date
}

export function shouldSkipUnchangedPage({
  hashMatches,
  lastSuccessAt,
  now,
}: SkipDecision): boolean {
  if (!hashMatches || lastSuccessAt === null) return false
  return now.getTime() - lastSuccessAt.getTime() < MAX_SKIP_STREAK_DAYS * DAY_MS
}
