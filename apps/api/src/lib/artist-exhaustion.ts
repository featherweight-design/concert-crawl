// Shared definition of an "exhausted" artist row, so the match job and the
// admin queue can never disagree about which rows have been given up on.

import { inArray, sql, type SQL } from 'drizzle-orm'
import { artists } from '@concert-crawl/db'

/**
 * Fruitless searches a row gets before the match job stops asking.
 *
 * Three because the retry cadence is the expensive part, not the count: each
 * attempt is weeks apart, so three spans months of Spotify catalogue churn.
 * Past that the answer is stable, and the daily quota is better spent on rows
 * nobody has looked at yet.
 */
export const MATCH_ATTEMPT_LIMIT = 3

/**
 * The only verdicts that can hold a spent budget.
 *
 * A match resets the counter and so does a hand resolution, so a row in any
 * other status carrying attempts is a leftover from before it was resolved —
 * not something the job has given up on. Both the list filter and the counts
 * read this, which is what keeps a row from being listed in one bucket and
 * counted in another.
 */
export const EXHAUSTIBLE_STATUSES = ['ambiguous', 'no_match'] as const

export type ExhaustibleStatus = (typeof EXHAUSTIBLE_STATUSES)[number]

export const isExhaustibleStatus = (
  status: string,
): status is ExhaustibleStatus =>
  EXHAUSTIBLE_STATUSES.some((candidate) => candidate === status)

// Built on call, not at module load. Several unit suites mock `@concert-crawl/db`
// with a stub that has no `artists` table, and a module-level constant would
// dereference the column while that mock is in place — failing at import time in
// files that never touch artist matching at all.

/** Rows the match job has given up on. Usable as a filter or a select field. */
export const isExhaustedExpr = (): SQL<boolean> =>
  sql`${artists.matchAttempts} >= ${MATCH_ATTEMPT_LIMIT}`

/** Rows that still have attempts left. */
export const isNotExhaustedExpr = (): SQL<boolean> =>
  sql`${artists.matchAttempts} < ${MATCH_ATTEMPT_LIMIT}`

/**
 * Whether a row belongs to the admin's `exhausted` queue — the counter AND a
 * verdict that can hold one.
 *
 * This is the single expression the list filter, the per-row flag and the
 * counts all read, so none of the three can drift from the others.
 */
export const isExhaustedBucketExpr = (): SQL<boolean> =>
  sql`${inArray(artists.matchStatus, [...EXHAUSTIBLE_STATUSES])} and ${isExhaustedExpr()}`
