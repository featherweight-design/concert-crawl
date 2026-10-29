// Request rate limits, backed by Postgres (#528).
//
// The previous store was a process-local Map: every deploy reset every window,
// and with two API instances each held its own counter, so a client got N
// requests per instance. Counters now live in `rate_limit_buckets`, shared by
// every instance and surviving restarts. Postgres rather than Redis on purpose:
// it is infrastructure we already run, and it moves with us if the host does.
//
// Window algorithm: a fixed window that opens on a key's FIRST hit (the same
// semantics the Map had), not on a wall-clock boundary. A clock-aligned window
// would let a 1-per-hour limit admit two requests seconds apart across the
// hour mark. The window is judged by the database clock, so instances with
// skewed clocks still agree.
//
// Each hit is ONE statement: an upsert that either opens a fresh window or
// increments the live one, and returns the new count. Postgres serialises
// conflicting upserts on the row lock and each sees the latest committed
// version, so concurrent hits can never read the same count and both pass.
//
// Expiry: a row is dead once `reset_at` passes. Two things remove dead rows,
// neither of them a new service. A sampled fraction of hits runs a bounded
// prune in the background (at most PRUNE_BATCH rows per pass, through the
// reset_at index), which keeps the table small under traffic. Sampling alone
// would let a quiet table keep a bucket forever, so the daily match-artists
// cron also sweeps every expired row (`sweepExpiredRateLimitBuckets`). A dead
// bucket therefore lives at most one window plus a day.
//
// A user-scoped limiter passes `userId`, which is stored beside the key so
// account deletion removes that user's buckets (see the user-data registry).

import * as Sentry from '@sentry/hono/node'
import { db as appDb, rateLimitBuckets } from '@concert-crawl/db'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { and, inArray, lte, sql } from 'drizzle-orm'
import { z } from 'zod'
import { runBackgroundTask } from './background-tasks.js'
import { apiLogger } from './logger.js'
import { describeDbError } from './pg-errors.js'

export interface RateLimitResult {
  allowed: boolean
  retryAfterMs: number
}

/**
 * What a limiter does when its store cannot answer. Every call site decides
 * deliberately, because the right answer depends on what the limit protects:
 *
 * - `'allow'` (fail open) for limits that throttle cost or noise on an
 *   authenticated or low-value route. A DB blip should not turn feedback,
 *   exports or the waitlist into errors.
 * - `'deny'` (fail closed) for limits that are the only thing standing
 *   between an attacker and an enumeration or brute-force. Those routes read
 *   the same database straight afterwards, so failing closed costs almost no
 *   availability that a real outage had not already taken.
 */
export type OnStoreError = 'allow' | 'deny'

export interface RateLimitOptions {
  onStoreError: OnStoreError
  /**
   * The Clerk ID this limiter is keyed on, when it is keyed on a user. Stored
   * on the bucket so account deletion can remove it. Omit for IP-keyed limits.
   */
  userId?: string
}

/** Retry-After advertised when a fail-closed limiter could not reach its store. */
export const STORE_ERROR_RETRY_MS = 60 * 1000

/** Most rows one prune pass deletes, so it never becomes a long statement. */
export const PRUNE_BATCH = 500

/** Fraction of hits that kick off a background prune. */
const DEFAULT_PRUNE_SAMPLE_RATE = 0.02

const hitRowSchema = z.object({
  count: z.number().int(),
  retryAfterMs: z.number(),
})

export interface RateLimiterDeps<TSchema extends Record<string, unknown>> {
  // Generic so a test can hand in a second, schema-less client: a second
  // connection pool is how the suite stands in for a second API instance.
  db: PostgresJsDatabase<TSchema>
  /** Probability in [0, 1] that a hit schedules a prune. */
  pruneSampleRate?: number
  random?: () => number
}

export interface RateLimiter {
  check: (
    key: string,
    maxRequests: number,
    windowMs: number,
    options: RateLimitOptions,
  ) => Promise<RateLimitResult>
  /** Delete up to PRUNE_BATCH expired buckets. Returns how many went. */
  pruneExpired: () => Promise<number>
}

export function createRateLimiter<TSchema extends Record<string, unknown>>(
  deps: RateLimiterDeps<TSchema>,
): RateLimiter {
  const { db } = deps
  const pruneSampleRate = deps.pruneSampleRate ?? DEFAULT_PRUNE_SAMPLE_RATE
  const random = deps.random ?? Math.random

  const hit = async (
    key: string,
    maxRequests: number,
    windowMs: number,
    userId: string | null,
  ): Promise<RateLimitResult> => {
    const expired = sql`${rateLimitBuckets.resetAt} <= now()`
    const freshResetAt = sql`now() + ${windowMs}::integer * interval '1 millisecond'`
    const rows = await db
      .insert(rateLimitBuckets)
      .values({ key, count: 1, resetAt: freshResetAt, userId })
      .onConflictDoUpdate({
        target: rateLimitBuckets.key,
        set: {
          // Capped at max + 1: a blocked hit still counts as blocked, and a
          // flood cannot walk the integer towards overflow.
          count: sql`CASE WHEN ${expired} THEN 1 ELSE LEAST(${rateLimitBuckets.count} + 1, ${maxRequests}::integer + 1) END`,
          resetAt: sql`CASE WHEN ${expired} THEN excluded.reset_at ELSE ${rateLimitBuckets.resetAt} END`,
        },
      })
      .returning({
        count: rateLimitBuckets.count,
        retryAfterMs: sql<number>`greatest(0, ceil(extract(epoch from (${rateLimitBuckets.resetAt} - now())) * 1000))::double precision`,
      })

    const row = hitRowSchema.parse(rows[0])
    if (row.count <= maxRequests) return { allowed: true, retryAfterMs: 0 }
    return { allowed: false, retryAfterMs: row.retryAfterMs }
  }

  const pruneExpired = async (): Promise<number> => {
    const isExpired = lte(rateLimitBuckets.resetAt, sql`now()`)
    const batch = db
      .select({ key: rateLimitBuckets.key })
      .from(rateLimitBuckets)
      .where(isExpired)
      .limit(PRUNE_BATCH)
    // The outer reset_at test is re-checked against the row's latest version
    // if a concurrent hit reopened its window meanwhile, so a live window is
    // never deleted out from under that hit.
    const deleted = await db
      .delete(rateLimitBuckets)
      .where(and(inArray(rateLimitBuckets.key, batch), isExpired))
      .returning({ key: rateLimitBuckets.key })
    return deleted.length
  }

  const check = async (
    key: string,
    maxRequests: number,
    windowMs: number,
    options: RateLimitOptions,
  ): Promise<RateLimitResult> => {
    if (random() < pruneSampleRate) {
      runBackgroundTask(async () => {
        try {
          await pruneExpired()
        } catch (err) {
          // Housekeeping only: the next sampled hit tries again.
          apiLogger.warn(
            { error: describeDbError(err) },
            'rate-limit: expired-bucket prune failed',
          )
        }
      })
    }

    try {
      return await hit(key, maxRequests, windowMs, options.userId ?? null)
    } catch (err) {
      const allowed = options.onStoreError === 'allow'
      // Never log or report the raw error: Drizzle puts the bound parameters
      // in its message, and those include the key, which holds a Clerk ID or
      // an IP. Only the limiter name (the key's prefix) and the error's class
      // and code leave this function.
      const limiter = key.split(':')[0] ?? 'unknown'
      const error = describeDbError(err)
      apiLogger.error(
        { error, limiter, onStoreError: options.onStoreError },
        'rate-limit: store unavailable',
      )
      Sentry.captureMessage('rate-limit: store unavailable', {
        level: 'error',
        tags: {
          area: 'rate-limit',
          limiter,
          onStoreError: options.onStoreError,
          errorClass: error.errorClass,
          errorCode: error.code ?? 'none',
        },
      })
      return allowed
        ? { allowed: true, retryAfterMs: 0 }
        : { allowed: false, retryAfterMs: STORE_ERROR_RETRY_MS }
    }
  }

  return { check, pruneExpired }
}

const defaultLimiter = createRateLimiter({ db: appDb })

/**
 * Count one hit against `key` and say whether it is within `maxRequests` per
 * `windowMs`. The window opens on the key's first hit. Blocked hits report
 * how long until the window closes.
 */
export const checkRateLimit = defaultLimiter.check

/** Upper bound on prune passes per sweep, so a sweep always terminates. */
const SWEEP_MAX_PASSES = 200

/**
 * Delete every expired bucket, one bounded batch at a time. Run daily by the
 * match-artists cron so retention does not depend on API traffic. Returns the
 * number of rows removed.
 */
export const sweepExpiredRateLimitBuckets = async (
  limiter: Pick<RateLimiter, 'pruneExpired'> = defaultLimiter,
): Promise<number> => {
  let total = 0
  for (let pass = 0; pass < SWEEP_MAX_PASSES; pass++) {
    const deleted = await limiter.pruneExpired()
    total += deleted
    if (deleted < PRUNE_BATCH) break
  }
  return total
}
