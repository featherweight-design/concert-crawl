// apps/api/src/lib/artist-follows.ts
//
// Source-agnostic reads over `user_artist_follows` for the native-following
// API (#1226 follow-up epic, eng spec §7.1/§7.4/§9.3).
//
// The distinction from lib/spotify-matches.ts is the whole point: those
// helpers scope to `SPOTIFY_FOLLOW_SOURCES` because the taste surfaces are
// about a connected Spotify account. Everything here matches EVERY row
// regardless of `source`, because a native follow and a Spotify follow are the
// same product concept. Do not "align" the two by adding a source filter here.
import {
  type SQL,
  and,
  arrayOverlaps,
  asc,
  eq,
  exists,
  gte,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm'
import { db, events, userArtistFollows, venues } from '@concert-crawl/db'
import type { FollowedArtistNextShow } from '@concert-crawl/types'
import { todayInTimezone } from './time.js'

// events.date holds event-local (Mountain Time) calendar dates. Denver is the
// only market we crawl and an artist's shows span venues, so there is no
// single venue timezone to pivot "today" on — same reasoning as
// routes/artists-public.ts.
const MT_TIME_ZONE = 'America/Denver'

// Cancelled and postponed shows stay: a followed artist's date must not vanish
// from the list at the moment it is cancelled, which is the moment the user
// most needs to see it. Mirrors routes/artists-public.ts and the events list.
const SCHEDULED_STATUSES = ['upcoming', 'cancelled', 'postponed'] as const

/**
 * Correlated `EXISTS` for the events-list `following=1` filter. Modelled on
 * `spotifyTasteCondition` (lib/spotify-matches.ts) so it AND-composes with the
 * list endpoint's other conditions and applies identically to the count and
 * row queries — with the one deliberate divergence noted at the top of this
 * file: no `source` filter.
 *
 * Matches when the viewer follows the event's canonical headliner, or an act
 * in its canonical co-headliner or supporting set. NULL canonical columns
 * never match (`= ANY(NULL)` is NULL, i.e. falsy).
 */
export function followedArtistsCondition(userId: string): SQL {
  return exists(
    db
      .select({ one: sql`1` })
      .from(userArtistFollows)
      .where(
        and(
          eq(userArtistFollows.userId, userId),
          or(
            eq(userArtistFollows.canonicalName, events.canonicalArtist),
            sql`${userArtistFollows.canonicalName} = ANY(${events.canonicalHeadliners})`,
            sql`${userArtistFollows.canonicalName} = ANY(${events.canonicalSupporting})`,
          ),
        ),
      ),
  )
}

/**
 * Canonical names the viewer follows, from any source. Used to stamp
 * `following` onto artist search results.
 */
export async function loadFollowedCanonicalNames(
  userId: string,
): Promise<Set<string>> {
  const rows = await db
    .select({ canonicalName: userArtistFollows.canonicalName })
    .from(userArtistFollows)
    .where(eq(userArtistFollows.userId, userId))

  return new Set(rows.map((row) => row.canonicalName))
}

/**
 * The soonest consumer-visible Denver date for each canonical name, keyed by
 * canonical name. A name absent from the map has no upcoming show — a normal
 * case, not an error.
 *
 * One query for the whole set. Rows are read ascending by date and the first
 * hit per name wins, so a bill naming several followed artists resolves them
 * all in a single pass.
 */
export async function loadNextShowByCanonical(
  canonicalNames: string[],
): Promise<Map<string, FollowedArtistNextShow>> {
  const nextShows = new Map<string, FollowedArtistNextShow>()
  if (canonicalNames.length === 0) return nextShows

  const today = todayInTimezone(MT_TIME_ZONE)

  const rows = await db
    .select({
      eventId: events.id,
      iso: events.date,
      canonicalArtist: events.canonicalArtist,
      canonicalHeadliners: events.canonicalHeadliners,
      canonicalSupporting: events.canonicalSupporting,
      venue: venues.name,
      venueSlug: venues.slug,
    })
    .from(events)
    .innerJoin(
      venues,
      and(eq(events.venueId, venues.id), eq(venues.active, true)),
    )
    .where(
      and(
        or(
          inArray(events.canonicalArtist, canonicalNames),
          // Co-headliner arm (#1203): only headliners[0] reaches
          // canonical_artist, so without it the second act on a co-headline
          // bill reads as having no upcoming date.
          arrayOverlaps(events.canonicalHeadliners, canonicalNames),
          arrayOverlaps(events.canonicalSupporting, canonicalNames),
        ),
        // The consumer filter pair every public query applies (#607).
        eq(events.hiddenFromConsumer, false),
        isNull(events.firstMissingAt),
        inArray(events.status, [...SCHEDULED_STATUSES]),
        gte(events.date, today),
      ),
    )
    .orderBy(asc(events.date), asc(events.showTime), asc(events.id))

  const wanted = new Set(canonicalNames)

  for (const row of rows) {
    const onBill = [
      ...(row.canonicalArtist === null ? [] : [row.canonicalArtist]),
      ...(row.canonicalHeadliners ?? []),
      ...(row.canonicalSupporting ?? []),
    ]
    for (const canonical of onBill) {
      if (!wanted.has(canonical) || nextShows.has(canonical)) continue
      nextShows.set(canonical, {
        eventId: row.eventId,
        iso: row.iso,
        venue: row.venue,
        venueSlug: row.venueSlug,
      })
    }
  }

  return nextShows
}
