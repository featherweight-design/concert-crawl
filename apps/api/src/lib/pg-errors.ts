import { z } from 'zod';

/**
 * Postgres error code for unique violation.
 *
 * Surfaced via Drizzle's wrapping of the underlying postgres-js error, so the
 * SQLSTATE may live on the top-level error OR on its `cause`. Helpers below
 * check both.
 */
export const PG_UNIQUE_VIOLATION = '23505' as const;

const causeSchema = z.object({ cause: z.unknown() });

// The two pending-counter partial unique indexes. 0099 added one pending
// counter per (parent, submitter); 0041's one per parent stays until the 0100
// contract migration drops it, and while it exists it is what refuses a
// SECOND fan's update, so the two need different messages.
const OWN_PENDING_COUNTER_INDEX =
  'price_submissions_pending_counter_user_unique_idx';
const ANY_PENDING_COUNTER_INDEX =
  'price_submissions_pending_counter_unique_idx';

const constraintRecordSchema = z.object({
  code: z.literal(PG_UNIQUE_VIOLATION),
  constraint_name: z.string().optional(),
  constraint: z.string().optional(),
  message: z.string().optional(),
});

function violatesIndex(candidate: unknown, indexName: string): boolean {
  const parsed = constraintRecordSchema.safeParse(candidate);
  if (!parsed.success) return false;
  const record = parsed.data;
  return (
    record.constraint_name === indexName ||
    record.constraint === indexName ||
    (record.message?.includes(indexName) ?? false)
  );
}

/**
 * Which pending-counter unique index a Postgres unique_violation (SQLSTATE
 * 23505) tripped: 'own' for the per-submitter index (0099), 'any' for 0041's
 * per-parent index, null for anything else.
 *
 * Drizzle wraps the underlying postgres-js error in a DrizzleQueryError, so
 * the original `code` lives on `err.cause`. We check both so the translation
 * survives if Drizzle's wrapping behavior changes. The index identity can
 * surface as `constraint_name`, `constraint`, or embedded in the message —
 * we sniff all three.
 */
/** Whether `err` (or its `cause`) is a unique violation on `indexName`. */
export function isUniqueViolationOn(err: unknown, indexName: string): boolean {
  if (violatesIndex(err, indexName)) return true;
  const wrapped = causeSchema.safeParse(err);
  return wrapped.success && violatesIndex(wrapped.data.cause, indexName);
}

export function pendingCounterViolation(err: unknown): 'own' | 'any' | null {
  const candidates = [err, causeOf(err)];
  if (candidates.some((cand) => violatesIndex(cand, OWN_PENDING_COUNTER_INDEX)))
    return 'own';
  if (candidates.some((cand) => violatesIndex(cand, ANY_PENDING_COUNTER_INDEX)))
    return 'any';
  return null;
}

function causeOf(err: unknown): unknown {
  const withCause = causeSchema.safeParse(err);
  return withCause.success ? withCause.data.cause : undefined;
}

/** SQLSTATEs a client can simply retry: deadlock and serialization failure. */
export const PG_RETRYABLE_CODES: ReadonlySet<string> = new Set([
  '40P01',
  '40001',
]);

/**
 * Whether a DB error is a deadlock or serialization failure. Defence in
 * depth: the price-check paths share one lock order (lib/price-check.ts) so
 * they should never deadlock, but if one does the caller gets a retryable
 * 409 instead of a 500.
 */
export function isRetryableTxError(err: unknown): boolean {
  const { code } = describeDbError(err);
  return code !== null && PG_RETRYABLE_CODES.has(code);
}

const errorCodeSchema = z.object({
  // A SQLSTATE ('42P01') or a socket code ('ECONNREFUSED'). The pattern keeps
  // anything else, such as a driver that put free text in `code`, out.
  code: z.string().regex(/^[A-Z0-9_]{1,32}$/),
});

export interface SafeDbErrorDescription {
  errorClass: string;
  code: string | null;
}

/**
 * A DB error reduced to what is safe to log or send to Sentry: its class and
 * its SQLSTATE or socket code. Never the message, which for a Drizzle query
 * error embeds the SQL and its bound parameters. Checks the error and its
 * `cause`, where Drizzle puts the postgres-js error.
 */
export function describeDbError(err: unknown): SafeDbErrorDescription {
  const errorClass = err instanceof Error ? err.name : typeof err;
  const ownCode = errorCodeSchema.safeParse(err);
  if (ownCode.success) return { errorClass, code: ownCode.data.code };
  const withCause = causeSchema.safeParse(err);
  if (withCause.success) {
    const causeCode = errorCodeSchema.safeParse(withCause.data.cause);
    if (causeCode.success) return { errorClass, code: causeCode.data.code };
  }
  return { errorClass, code: null };
}
