// Whether an artist row still has a show a visitor could see.
//
// The admin queue lists every artist ever derived, including acts whose last
// Denver date has passed. Resolving one of those changes nothing anybody will
// look at, so the queue defaults to hiding them.

import { sql, type SQL } from 'drizzle-orm'
import { artists, events, venues } from '@concert-crawl/db'
import { todayInTimezone } from './time.js'

const MT_TIME_ZONE = 'America/Denver'

/**
 * Correlated EXISTS against the `artists` row in the enclosing query.
 *
 * The predicate is the public artist page's upcoming query (`artists-public.ts`)
 * restated as a subquery, deliberately: "has an upcoming show" has to mean "a
 * visitor can see a future show for this act", or the admin hides rows the site
 * is still rendering. The two must not drift.
 *
 * That inherits three things from the public query. Cancelled and postponed
 * rows count — a cancelled show is still a page someone can land on, and every
 * other list surface keeps them. The consumer pair (`hidden_from_consumer`,
 * `first_missing_at`) applies, so an admin-hidden or crawler-stale row is not
 * evidence. And the venue must be active, since a deactivated venue's shows
 * are gone from everything forward-looking.
 *
 * The join is on text, not a key: `artists` is a projection with no foreign key
 * to `events`. `canonical_artist` is the indexed fast path; the two array arms
 * catch the co-headliner and support billings that never reach it (#1203). Both
 * arrays use `&&` against a one-element array rather than `= ANY(...)` because
 * only the overlap operator can use their GIN indexes.
 */
export const hasUpcomingShowExpr = (): SQL<boolean> => {
  const canonical = sql`ARRAY[${artists.canonicalName}]::text[]`

  return sql`EXISTS (
    SELECT 1
    FROM ${events}
    JOIN ${venues}
      ON ${events.venueId} = ${venues.id}
     AND ${venues.active} = true
    WHERE (
      ${events.canonicalArtist} = ${artists.canonicalName}
      OR ${events.canonicalHeadliners} && ${canonical}
      OR ${events.canonicalSupporting} && ${canonical}
    )
      AND ${events.hiddenFromConsumer} = false
      AND ${events.firstMissingAt} IS NULL
      AND ${events.status} IN ('upcoming', 'cancelled', 'postponed')
      AND ${events.date} >= ${todayInTimezone(MT_TIME_ZONE)}
  )`
}
