import { z } from 'zod'

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

const errorCodeSchema = z.object({
  // A SQLSTATE ('42P01') or a socket code ('ECONNREFUSED'). The pattern keeps
  // anything else, such as a driver that put free text in `code`, out.
  code: z.string().regex(/^[A-Z0-9_]{1,32}$/),
})

const causeSchema = z.object({ cause: z.unknown() })

export interface SafeDbErrorDescription {
  errorClass: string
  code: string | null
}

/**
 * A DB error reduced to what is safe to log or send to Sentry: its class and
 * its SQLSTATE or socket code. Never the message, which for a Drizzle query
 * error embeds the SQL and its bound parameters. Checks the error and its
 * `cause`, where Drizzle puts the postgres-js error.
 */
export function describeDbError(err: unknown): SafeDbErrorDescription {
  const errorClass = err instanceof Error ? err.name : typeof err
  const ownCode = errorCodeSchema.safeParse(err)
  if (ownCode.success) return { errorClass, code: ownCode.data.code }
  const withCause = causeSchema.safeParse(err)
  if (withCause.success) {
    const causeCode = errorCodeSchema.safeParse(withCause.data.cause)
    if (causeCode.success) return { errorClass, code: causeCode.data.code }
  }
  return { errorClass, code: null }
}
