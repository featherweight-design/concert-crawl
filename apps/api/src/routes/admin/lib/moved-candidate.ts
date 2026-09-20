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

/**
 * How much later than the orphan's own row the candidate must have been
 * created. Kills the residency falsifier: a venue announcing a three-night
 * run creates all three rows in one crawl, so the other nights match on
 * venue and artist and are otherwise indistinguishable from a reschedule.
 * A replacement is by definition a later announcement than the show it
 * replaces.
 */
export const MOVED_ANNOUNCE_GAP_HOURS = 24

/**
 * How far before the orphan's last sighting the candidate may have appeared.
 * Anchoring on `created_at >= last_seen_at` is wrong: `last_seen_at` is
 * refreshed on every crawl that still returns the row (crawl.ts Pass 1), and
 * `first_missing_at` is only stamped once it stops, so a venue that posts the
 * new date while the old listing is still up produces a candidate created
 * BEFORE the orphan was last seen. That is the ordinary case, not an edge.
 * The window still excludes an unrelated booking announced months before the
 * orphan went anywhere.
 */
export const MOVED_REPLACEMENT_WINDOW_DAYS = 14

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
 * The load-bearing work is the pair of freshness predicates below: the
 * candidate must be a LATER announcement than the orphan (which is what
 * separates a reschedule from a residency's other nights), and must have
 * appeared near the orphan's disappearance (which is what separates it from
 * an unrelated later booking by the same artist).
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
    -- Freshness, two predicates with two different falsifiers. All three
    -- timestamp columns are NOT NULL DEFAULT now(), so there is no
    -- null-handling to reason about.
    -- (a) a later announcement than the orphan, not the same batch of nights
    AND cnd.created_at >= ${events.createdAt}
                        + make_interval(hours => ${MOVED_ANNOUNCE_GAP_HOURS}::int)
    -- (b) announced around the orphan's disappearance, not months before it
    AND cnd.created_at >= ${events.lastSeenAt}
                        - make_interval(days => ${MOVED_REPLACEMENT_WINDOW_DAYS}::int)
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
