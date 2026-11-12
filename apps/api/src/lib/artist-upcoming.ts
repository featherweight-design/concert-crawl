// Whether an artist row still has a show a visitor could see.
//
// The admin queue lists every artist ever derived, including acts whose last
// Denver date has passed. Resolving one of those changes nothing anybody will
// look at, so the queue defaults to hiding them.

import { sql, type SQL } from 'drizzle-orm';
import { artists, events, venues } from '@concert-crawl/db';
import { billsCanonicalName } from './event-billing.js';
import { todayInDenver } from './time.js';

// The FROM and WHERE both expressions share, so "has an upcoming show" and "the
// soonest upcoming show" can never disagree about which shows count.
const upcomingShowsFrom = (withinDays: number | undefined): SQL => sql`
    FROM ${events}
    JOIN ${venues}
      ON ${events.venueId} = ${venues.id}
     AND ${venues.active} = true
    WHERE ${billsCanonicalName(artists.canonicalName)}
      AND ${events.hiddenFromConsumer} = false
      AND ${events.firstMissingAt} IS NULL
      AND ${events.status} IN ('upcoming', 'cancelled', 'postponed')
      AND ${events.date} >= ${todayInDenver()}
      ${upcomingBound(withinDays)}`;

// Optional upper bound on the show date, in days from Denver today. Absent, the
// predicate is unbounded, which is what every existing caller wants. A bound
// that is not a whole, non-negative number of days is a caller bug, so it
// throws here rather than reaching Postgres as an invalid integer.
const upcomingBound = (withinDays: number | undefined): SQL => {
  if (withinDays === undefined) return sql``;
  if (!Number.isInteger(withinDays) || withinDays < 0) {
    throw new RangeError(
      `withinDays must be a whole number >= 0, got ${withinDays}`,
    );
  }
  return sql`AND ${events.date} <= (${todayInDenver()}::date + ${withinDays}::int)`;
};

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
 * to `events`. `billsCanonicalName` owns which columns decide that — see
 * `event-billing.ts` for why the raw `canonical_artist` column is only a
 * fallback.
 */
export const hasUpcomingShowExpr = (withinDays?: number): SQL<boolean> =>
  sql`EXISTS (SELECT 1 ${upcomingShowsFrom(withinDays)})`;

/**
 * The soonest date `hasUpcomingShowExpr` would accept for this artist, or null.
 * Built from the same fragment, so a row that passes the filter always has a
 * date to show.
 */
export const nextShowDateExpr = (withinDays?: number): SQL<string | null> =>
  sql<
    string | null
  >`(SELECT MIN(${events.date}) ${upcomingShowsFrom(withinDays)})`;

/**
 * How many shows `hasUpcomingShowExpr` would accept for this artist. Built
 * from the same fragment, so a row the filter lists never reads 0.
 */
export const upcomingShowCountExpr = (): SQL<number> =>
  sql<number>`(SELECT count(*)::int ${upcomingShowsFrom(undefined)})`;
