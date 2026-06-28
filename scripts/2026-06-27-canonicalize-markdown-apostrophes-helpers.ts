/**
 * Pure helpers extracted from
 * scripts/2026-06-27-canonicalize-markdown-apostrophes.ts so the dedupe
 * logic can be unit-tested without a live DB.
 *
 * Helpers here back Copilot review feedback on PR #855:
 *   - planUserEventDedup (R1): handles the multi-loser-watches-by-same-user
 *     case the original SQL missed (it would have hit the UNIQUE
 *     (user_id, event_id) index mid-redirect).
 *   - chunk (R1): batches a flat array into fixed-size sublists so the
 *     snapshot INSERT stays under Postgres' bind-parameter ceiling.
 *   - selectCollapseClusters (R3): filters cluster construction down to
 *     buckets that contain at least one row whose canonical_title would
 *     change under the new normalizer. Keeps the script's blast radius
 *     bounded to the PR's stated scope — pre-existing
 *     (venue_id, date, canonical_title) collisions where no row's
 *     canonical_title would change are NOT this script's responsibility.
 */

/**
 * A user_events row as seen by the dedup planner — just the four fields
 * needed to decide what to keep, what to delete, and what to redirect.
 */
export interface UserEventRow {
  id: string
  userId: string
  eventId: string
  /** Used as the deterministic tiebreak when multiple loser rows exist
   * for the same user and the winner isn't already watching. */
  createdAt: Date
}

/**
 * Plan for collapsing the user_events rows that touch a single cluster
 * (winner + losers) onto the winner without violating UNIQUE(user_id,
 * event_id).
 *
 * - `rowIdsToDelete` — user_events row ids to drop outright. Covers both
 *   the "user already watches the winner" and "user watches multiple
 *   losers in the same cluster" cases.
 * - `rowIdsToRedirect` — user_events row ids to UPDATE so event_id =
 *   winner. After the delete step these are guaranteed collision-free
 *   under the unique index.
 */
export interface UserEventDedupPlan {
  rowIdsToDelete: string[]
  rowIdsToRedirect: string[]
}

/**
 * Compute the dedup plan for one cluster.
 *
 * Strategy: for each user_id that has at least one row across (winner ∪
 * losers), keep exactly one row that ends up pointing at the winner.
 * Prefer a row already on the winner (no UPDATE needed); otherwise
 * promote the earliest-created loser row by deterministic tiebreak
 * (createdAt ASC, then id ASC for the unlikely tie). Every other row
 * for that user goes into `rowIdsToDelete`. Rows on losers belonging to
 * a user with no winner row get their first-by-tiebreak row into
 * `rowIdsToRedirect` (the rest are deletes).
 *
 * Why this matters: the previous logic only deleted loser rows when the
 * user already had a winner row. If a user had watch rows on losers A
 * and B (neither on winner W), the subsequent `UPDATE event_id=W WHERE
 * event_id IN (A, B)` would set A→W first, then violate UNIQUE(user, W)
 * when redirecting B → aborts the cluster transaction.
 */
export function planUserEventDedup(
  rows: UserEventRow[],
  winnerEventId: string,
): UserEventDedupPlan {
  const rowsByUser = new Map<string, UserEventRow[]>()
  for (const row of rows) {
    const bucket = rowsByUser.get(row.userId) ?? []
    bucket.push(row)
    rowsByUser.set(row.userId, bucket)
  }

  const rowIdsToDelete: string[] = []
  const rowIdsToRedirect: string[] = []

  for (const userRows of rowsByUser.values()) {
    // Already-on-winner row (if any) is the natural keeper — no UPDATE
    // needed since it's already pointing at the right event.
    const onWinner = userRows.filter((row) => row.eventId === winnerEventId)
    const onLosers = userRows.filter((row) => row.eventId !== winnerEventId)

    if (onWinner.length > 0) {
      // Keep one winner-side row (the earliest by createdAt, then id);
      // delete every other row this user has across the cluster, both
      // surplus winner rows and any loser rows.
      const keeper = pickKeeper(onWinner)
      for (const row of userRows) {
        if (row.id === keeper.id) continue
        rowIdsToDelete.push(row.id)
      }
      continue
    }

    // No winner row for this user — promote one loser row via redirect,
    // delete the rest. Same deterministic tiebreak so re-runs match.
    const keeper = pickKeeper(onLosers)
    for (const row of onLosers) {
      if (row.id === keeper.id) {
        rowIdsToRedirect.push(row.id)
      } else {
        rowIdsToDelete.push(row.id)
      }
    }
  }

  return { rowIdsToDelete, rowIdsToRedirect }
}

/**
 * Tiebreak picker: earliest createdAt, then lowest id. Both are stable
 * so the plan is deterministic across re-runs and across operator
 * machines.
 */
function pickKeeper(rows: UserEventRow[]): UserEventRow {
  return [...rows].sort((left, right) => {
    const leftCreated = left.createdAt.getTime()
    const rightCreated = right.createdAt.getTime()
    if (leftCreated !== rightCreated) return leftCreated - rightCreated
    return left.id.localeCompare(right.id)
  })[0]!
}

/**
 * Split an array into fixed-size chunks. Used by the snapshot INSERT
 * (and any future bulk write) to keep each statement under Postgres'
 * 65,535 bind-parameter ceiling — at one parameter per row the safe
 * realistic limit is well below that due to query-size and planner-
 * memory pressure. 1000 rows/batch leaves headroom even if the snapshot
 * grows other per-row params later.
 */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error(`chunk size must be > 0, got ${size}`)
  }
  const out: T[][] = []
  for (let offset = 0; offset < items.length; offset += size) {
    out.push(items.slice(offset, offset + size))
  }
  return out
}

/**
 * Minimum row shape selectCollapseClusters needs to filter clusters down
 * to the ones this script is actually responsible for. Defined as a
 * structural minimum so the script's richer row type (with FK fields,
 * confidence_score, etc.) flows in without an explicit cast.
 */
export interface CanonicalChangeRow {
  storedCanonical: string
  computedCanonical: string
}

/**
 * Minimum row shape sortBucketByWinnerPriority needs to order a collapse
 * bucket by the same comparator used for winner selection. Structural so
 * the script's richer row type flows in without a cast.
 */
export interface WinnerPriorityRow {
  id: string
  confidenceScore: string | null
  createdAt: Date
}

/**
 * Sort a collapse bucket by the same comparator pickWinner uses:
 *   1. confidence_score DESC (NULL last)
 *   2. created_at ASC
 *   3. id ASC (stable final tiebreak)
 *
 * Why this helper exists: PR #855 R4 flagged that buildWinnerPatch was
 * non-deterministic when multiple losers had values for the same
 * mergeable field — the SELECT had no ORDER BY, so Postgres' row order
 * decided which loser's value won the patch. Sorting the whole bucket
 * with the winner comparator and using `bucket.slice(1)` for losers
 * means patch sources are tried in priority order: higher-confidence
 * losers contribute first, tiebroken by earliest created_at.
 *
 * Returns a new sorted array; does not mutate input.
 */
export function sortBucketByWinnerPriority<TRow extends WinnerPriorityRow>(
  rows: TRow[],
): TRow[] {
  return [...rows].sort((left, right) => {
    // confidence_score: NULL sorts last (worst), otherwise higher wins.
    const leftScore =
      left.confidenceScore === null ? -Infinity : Number(left.confidenceScore)
    const rightScore =
      right.confidenceScore === null ? -Infinity : Number(right.confidenceScore)
    if (leftScore !== rightScore) return rightScore - leftScore
    // created_at ASC: earlier row wins.
    const leftCreated = left.createdAt.getTime()
    const rightCreated = right.createdAt.getTime()
    if (leftCreated !== rightCreated) return leftCreated - rightCreated
    // id ASC stable final tiebreak.
    return left.id.localeCompare(right.id)
  })
}

/**
 * Filter a list of collision buckets (clusters grouped by
 * (venue_id, date, computedCanonical)) down to the ones this script is
 * responsible for.
 *
 * A cluster qualifies when:
 *   1. It contains at least 2 rows (the collision precondition), AND
 *   2. At least one row's `computedCanonical !== storedCanonical` — i.e.
 *      the new normalizer is what created (or contributes to) this
 *      collision.
 *
 * Pre-existing (venue_id, date, canonical_title) collisions where every
 * row already has the same stored canonical_title are NOT this script's
 * responsibility. They represent residual dupes from earlier cleanup
 * passes (e.g. #821 gaps) and would only be silently swept under this
 * script's filename if we collapsed every collision unconditionally.
 * If those need attention they should get a separate, explicitly-scoped
 * cleanup operation. See PR #855 Copilot R3 for the discussion that
 * tightened this filter.
 *
 * Generic over the row type so the script's full RowWithCanonical
 * structure flows through without losing fields the cluster planner
 * needs (winner selection, FK reassignment, merge patch, etc.).
 */
export function selectCollapseClusters<TRow extends CanonicalChangeRow>(
  bucketsByKey: Map<string, TRow[]>,
): Map<string, TRow[]> {
  const out = new Map<string, TRow[]>()
  for (const [key, bucket] of bucketsByKey) {
    if (bucket.length < 2) continue
    const hasNormalizerChange = bucket.some(
      (row) => row.computedCanonical !== row.storedCanonical,
    )
    if (!hasNormalizerChange) continue
    out.set(key, bucket)
  }
  return out
}
