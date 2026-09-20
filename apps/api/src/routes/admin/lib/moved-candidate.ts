import { z } from 'zod'
import { sql, type SQL } from 'drizzle-orm'
import { events } from '@concert-crawl/db'
import { type MovedReason } from '@concert-crawl/types'

/**
 * How far a reschedule may land from the original date, in days, for the
 * same-venue arm. Wide enough for a "moved to the spring" postponement,
 * narrow enough that an unrelated booking by the same artist a year out
 * doesn't get claimed as a relocation.
 */
export const MOVED_DATE_WINDOW_DAYS = 120

/**
 * Slack on the cross-venue arm. A relocation keeps the night; the one-day
 * band only absorbs a late show whose listed date differs by a midnight.
 */
export const MOVED_VENUE_DAY_SLACK = 1

const movedCandidateSchema = z.object({
  id: z.string().uuid(),
  reason: z.union([z.literal('date'), z.literal('venue')]),
})

export interface MovedCandidate {
  id: string
  reason: MovedReason
}

/**
 * Narrow the jsonb the matcher emits. The column crosses a system boundary
 * (raw driver output), so it is validated rather than cast — a shape we
 * don't recognise degrades to "no suggestion" instead of surfacing a
 * half-built row to an admin who is about to merge on it.
 */
export const parseMovedCandidate = (raw: unknown): MovedCandidate | null => {
  if (raw === null || raw === undefined) return null
  const parsed = movedCandidateSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

/**
 * Correlated lookup for a row that looks like this missing event rescheduled
 * or relocated. Relaxes exactly ONE of the sibling rule's two pins per arm —
 * the date arm keeps the venue, the venue arm keeps the date — because
 * relaxing both at once matches any show by the same artist anywhere.
 *
 * The load-bearing predicate is `c.created_at >= events.last_seen_at`: the
 * candidate must have appeared AFTER we last saw the orphan. Without it a
 * multi-night residency defeats the date arm outright, since the other nights
 * match on venue and artist and are indistinguishable from a reschedule. They
 * are excluded because they were created long before the orphan went missing.
 *
 * Emits jsonb so both fields come from one scan. Two scalar subqueries would
 * mean writing this predicate set twice, which is exactly how the venue-slug
 * regexes drifted in #1292.
 *
 * Suggestion only. Nothing in this file applies anything.
 */
export const movedCandidateExpr = (today: string): SQL<unknown> => sql`(
  SELECT jsonb_build_object(
    'id', cnd.id,
    'reason', CASE WHEN cnd.venue_id = ${events.venueId} THEN 'date' ELSE 'venue' END
  )
  FROM events cnd
  WHERE cnd.id <> ${events.id}
    AND cnd.status = 'upcoming'
    AND cnd.first_missing_at IS NULL
    AND cnd.hidden_from_consumer = false
    AND cnd.date >= ${today}
    -- Freshness. Both columns are NOT NULL DEFAULT now(), so this is a plain
    -- comparison with no null-handling to reason about.
    AND cnd.created_at >= ${events.lastSeenAt}
    -- Headliner containment, same form as hasLiveSibling.
    AND ${events.canonicalArtist} <> '' AND cnd.canonical_artist <> ''
    AND ${events.canonicalTitle} <> '' AND cnd.canonical_title <> ''
    AND ( strpos(cnd.canonical_title, ${events.canonicalArtist}) > 0
       OR strpos(${events.canonicalTitle}, cnd.canonical_artist) > 0 )
    AND (
      -- Date move: same venue, some other night inside the window.
      ( cnd.venue_id = ${events.venueId}
        AND cnd.date <> ${events.date}
        AND cnd.date BETWEEN ${events.date} - ${MOVED_DATE_WINDOW_DAYS}::int
                         AND ${events.date} + ${MOVED_DATE_WINDOW_DAYS}::int )
      OR
      -- Venue move: another room, same night give or take a midnight.
      ( cnd.venue_id <> ${events.venueId}
        AND cnd.date BETWEEN ${events.date} - ${MOVED_VENUE_DAY_SLACK}::int
                         AND ${events.date} + ${MOVED_VENUE_DAY_SLACK}::int )
    )
  ORDER BY
    -- Same-venue reschedule beats a cross-venue guess when both arms match.
    (cnd.venue_id = ${events.venueId}) DESC,
    ABS(cnd.date - ${events.date}) ASC,
    cnd.created_at DESC,
    cnd.id ASC
  LIMIT 1
)`
