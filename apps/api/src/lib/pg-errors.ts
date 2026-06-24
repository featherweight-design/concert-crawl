/**
 * Postgres error code for unique violation.
 *
 * Surfaced via Drizzle's wrapping of the underlying postgres-js error, so the
 * SQLSTATE may live on the top-level error OR on its `cause`. Helpers below
 * check both.
 */
export const PG_UNIQUE_VIOLATION = '23505' as const

const PENDING_COUNTER_UNIQUE_INDEX =
  'price_submissions_pending_counter_unique_idx'

/**
 * Detect a Postgres unique_violation (SQLSTATE 23505) against the
 * `price_submissions_pending_counter_unique_idx` partial unique index.
 *
 * Drizzle wraps the underlying postgres-js error in a DrizzleQueryError, so
 * the original `code` lives on `err.cause`. We check both so the translation
 * survives if Drizzle's wrapping behavior changes. The index identity can
 * surface as `constraint_name`, `constraint`, or embedded in the message —
 * we sniff all three.
 */
export function isPendingCounterUniqueViolation(err: unknown): boolean {
  const matches = (candidate: unknown): boolean => {
    if (typeof candidate !== 'object' || candidate === null) return false
    const record = candidate as Record<string, unknown>
    if (record['code'] !== PG_UNIQUE_VIOLATION) return false
    if (record['constraint_name'] === PENDING_COUNTER_UNIQUE_INDEX) return true
    if (record['constraint'] === PENDING_COUNTER_UNIQUE_INDEX) return true
    const message = record['message']
    return (
      typeof message === 'string' &&
      message.includes(PENDING_COUNTER_UNIQUE_INDEX)
    )
  }
  if (matches(err)) return true
  if (err instanceof Error && 'cause' in err) {
    return matches((err as Error & { cause?: unknown }).cause)
  }
  return false
}
