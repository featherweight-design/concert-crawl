import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { z } from 'zod'
import { db, artists, events, userEvents, venues } from '@concert-crawl/db'
import { upcomingEventConditions } from '@concert-crawl/db/upcoming-events'
import { and, asc, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm'
import { canonicalizeArtist } from '@concert-crawl/types'
import type { ArtistSearchResult } from '@concert-crawl/types'
import {
  loadFollowedCanonicalNames,
  loadNextShowByCanonical,
} from '../lib/artist-follows.js'
import {
  billedCanonicalNames,
  billsAnyCanonicalName,
  displayHeadliner,
  portraitCanonicalName,
} from '../lib/event-billing.js'
import { todayInTimezone } from '../lib/time.js'

export const searchRouter = new Hono()

// GET /v1/search/popular — top 5 upcoming events by watcher count, no auth required
searchRouter.get('/popular', async (ctx) => {
  const today = todayInTimezone('UTC')

  const watcherCount = sql<number>`cast(count(${userEvents.id}) as int)`

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      artist: displayHeadliner(),
      date: events.date,
      imageUrl: events.imageUrl,
      artistPhotoUrl: artists.photoUrl,
      ticketPriceMin: events.ticketPriceMin,
      watcherCount,
      venueName: venues.name,
      venueSlug: venues.slug,
    })
    .from(events)
    .innerJoin(
      venues,
      and(eq(events.venueId, venues.id), eq(venues.active, true)),
    )
    // The row imagery chain every other event surface uses (#1525).
    // canonical_name is uniquely indexed, so this cannot multiply rows and the
    // watcher count stays a count of watchers. `artists.photoUrl` still has to
    // join the GROUP BY below, because the aggregate makes every selected
    // column either grouped or aggregated.
    .leftJoin(artists, eq(portraitCanonicalName(), artists.canonicalName))
    .leftJoin(
      userEvents,
      and(eq(userEvents.eventId, events.id), eq(userEvents.status, 'watching')),
    )
    .where(
      and(
        // A row the crawler stopped seeing should not be presented as
        // "popular" even if it accumulated watchers before it disappeared.
        ...upcomingEventConditions({ from: today }),
      ),
    )
    .groupBy(events.id, venues.name, venues.slug, artists.photoUrl)
    .orderBy(desc(watcherCount), asc(events.date))
    .limit(5)

  const data = rows.map((row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    date: row.date,
    imageUrl: row.imageUrl ?? null,
    artistPhotoUrl: row.artistPhotoUrl ?? null,
    ticketPriceMin: row.ticketPriceMin,
    watcherCount: row.watcherCount,
    venue: { name: row.venueName, slug: row.venueSlug },
  }))

  return ctx.json({ success: true, data })
})

// ── Artist results (#1115 PR-G) ─────────────────────────────────────────────
// The search palette already derives "artist" rows from matching events; those
// route to a filtered browse query. This endpoint is the other thing entirely:
// artists that have a PAGE, routed to `/artists/{slug}`.

// Denver is the only market we crawl and an artist's shows span venues, so
// there is no single venue timezone to pivot "today" on — Mountain Time is the
// product's display timezone (mirrors artists-public.ts).
const MT_TIME_ZONE = 'America/Denver'

// Artists are a garnish on a search whose primary answer is shows. Three rows
// is enough to recognise the act you meant without pushing the event and venue
// sections below the fold on a 320px screen.
const ARTIST_RESULT_LIMIT = 3

// Widened candidate pool so the visible-event filter below has something to
// work with: an artist whose only events are hidden drops out, and without
// slack a single such row could empty the section.
const ARTIST_CANDIDATE_LIMIT = 25

const UPCOMING_STATUSES = new Set(['upcoming', 'cancelled', 'postponed'])

// Two characters is the same floor the client debouncer uses; below it the
// ILIKE degenerates into "most of the table". Validated as a bare string rather
// than an object because the param name (`q`) is a single character, which the
// repo's `id-length` rule bans as an object key.
const artistSearchQuerySchema = z.string().trim().min(2).max(200)

// `%` and `_` are LIKE metacharacters. Left unescaped, a search for "50%" would
// silently become a wildcard match rather than a literal one.
const escapeLikePattern = (raw: string): string =>
  raw.replace(/[\\%_]/g, (char) => `\\${char}`)

// GET /v1/search/artists?q= — artists with their own page, no auth required.
// clerkMiddleware() verifies any bearer JWT locally (no network/DB cost) so a
// signed-in caller gets `following` stamped on each row; anonymous requests
// pass straight through, skip the follow query, and read `following: false`.
// The route stays PUBLIC — never mount requireAuth here.
searchRouter.get('/artists', clerkMiddleware(), async (ctx) => {
  const parsed = artistSearchQuerySchema.safeParse(ctx.req.query('q'))
  if (!parsed.success) {
    return ctx.json({ success: false, error: 'Invalid search query' }, 400)
  }
  const query = parsed.data
  const canonicalQuery = canonicalizeArtist(query)
  const pattern = `%${escapeLikePattern(query)}%`

  // Ranking: an exact canonical hit ("Wolf") beats a prefix hit ("Wolf Alice")
  // beats an anywhere-substring hit ("She Wolf"). Name breaks ties so the order
  // is stable across requests.
  const matchRank = sql<number>`case
      when ${artists.canonicalName} = ${canonicalQuery} then 0
      when ${artists.canonicalName} like ${`${escapeLikePattern(canonicalQuery)}%`} then 1
      else 2
    end`

  const candidates = await db
    .select({
      name: artists.name,
      slug: artists.slug,
      canonicalName: artists.canonicalName,
      photoUrl: artists.photoUrl,
    })
    .from(artists)
    .where(
      and(
        or(ilike(artists.name, pattern), ilike(artists.canonicalName, pattern)),
        // Hidden rows have no page to route to (#1342).
        eq(artists.hidden, false),
      ),
    )
    .orderBy(asc(matchRank), asc(artists.name))
    .limit(ARTIST_CANDIDATE_LIMIT)

  if (candidates.length === 0) {
    return ctx.json({ success: true, data: [] })
  }

  const canonicalNames = candidates.map((row) => row.canonicalName)

  const appearsOnBill = billsAnyCanonicalName(canonicalNames)

  // The consumer filter pair every public query applies: non-concert rows are
  // hidden, and crawler-flagged stale rows are suppressed (#607). Aggregating
  // in JS rather than SQL is safe because ARTIST_CANDIDATE_LIMIT caps the
  // canonical-name list, so this reads at most 25 artists' events over four
  // columns — small enough that a UNION + unnest rewrite buys nothing.
  const billRows = await db
    .select({
      canonicalArtist: events.canonicalArtist,
      canonicalHeadliners: events.canonicalHeadliners,
      canonicalSupporting: events.canonicalSupporting,
      date: events.date,
      status: events.status,
      venueActive: venues.active,
    })
    .from(events)
    // Joined rather than filtered, because the two things read off these rows
    // want different answers about a deactivated venue. Deactivation removes a
    // venue from everything FORWARD-LOOKING and does not un-happen the shows it
    // already hosted (#1299) — so the upcoming count below excludes it while
    // the "does this artist have anything to show" gate does not, exactly as
    // the artist page's own upcoming and past queries split.
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        appearsOnBill,
        eq(events.hiddenFromConsumer, false),
        isNull(events.firstMissingAt),
      ),
    )

  const today = todayInTimezone(MT_TIME_ZONE)
  const hasVisibleEvent = new Set<string>()
  const upcomingCounts = new Map<string, number>()

  for (const row of billRows) {
    const onBill = billedCanonicalNames(row)
    // A future date at a deactivated venue appears on NEITHER half of the
    // artist page: its upcoming query filters on `venues.active` and its past
    // query only reaches dates that have been. So a row like that is not
    // "something to show" — an artist whose only row is one has a page with
    // nothing on it, which is exactly what this gate exists to keep out of
    // search. A PAST date at a deactivated venue still counts, because
    // deactivation does not un-happen it and the page still lists it (#1299).
    //
    // Cancelled is the exception the page draws itself: a cancelled show never
    // happened, so its past query excludes it while keeping postponed rows —
    // the date moved, the show still occurred. This gate follows that ruling
    // rather than restating it, or an artist whose only row is a cancelled
    // past date reaches a page with nothing on either half.
    const isPast = row.date < today && row.status !== 'cancelled'
    // Same status triple the artist page's own upcoming section uses
    // (artists-public.ts) — counting only 'upcoming' would undercount, and
    // read "Past shows only" for an artist whose next date is postponed.
    // `venueActive` is what keeps this count in step with `nextShow` below,
    // which reaches the artist through a loader that inner-joins on it. Without
    // it an artist whose only future date is at a deactivated venue reported a
    // count with no date beside it, and the row had to choose which half to
    // believe.
    const isUpcoming =
      UPCOMING_STATUSES.has(row.status ?? '') &&
      row.date >= today &&
      row.venueActive
    for (const canonical of onBill) {
      if (isPast || isUpcoming) hasVisibleEvent.add(canonical)
      if (isUpcoming) {
        upcomingCounts.set(canonical, (upcomingCounts.get(canonical) ?? 0) + 1)
      }
    }
  }

  // Follow state for the row's inline Follow button. Matched on the canonical
  // name and NOT filtered by `source` — a Spotify-synced follow and a native
  // one are the same product concept, so both read as following.
  const searchAuth = getAuth(ctx)
  const followed = searchAuth?.userId
    ? await loadFollowedCanonicalNames(searchAuth.userId)
    : null

  // The soonest date per artist, from the same loader the suggestions endpoint
  // and the follows list use — so a row drawn from search carries the same
  // shape as one drawn from either, and there is no second definition of
  // "next show" to drift. Restricted to the artists that survived the
  // visible-event gate rather than every candidate: the loader answers in one
  // query, so the saving is a shorter name list in a single `where` rather than
  // a query per artist — small, and free.
  const visible = candidates.filter((row) =>
    hasVisibleEvent.has(row.canonicalName),
  )
  const nextShows = await loadNextShowByCanonical(
    visible.slice(0, ARTIST_RESULT_LIMIT).map((row) => row.canonicalName),
  )

  // "At least one non-hidden event" is the gate — an artist whose only rows
  // are hidden or stale has a page with nothing on it, so it stays out of
  // search even though the projection row exists.
  const data: ArtistSearchResult[] = visible
    .slice(0, ARTIST_RESULT_LIMIT)
    .map((row) => ({
      name: row.name,
      slug: row.slug,
      photoUrl: row.photoUrl,
      upcomingShowCount: upcomingCounts.get(row.canonicalName) ?? 0,
      nextShow: nextShows.get(row.canonicalName) ?? null,
      following: followed?.has(row.canonicalName) ?? false,
    }))

  return ctx.json({ success: true, data })
})
