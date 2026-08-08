import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { z } from 'zod'
import { db, artists, events, userEvents, venues } from '@concert-crawl/db'
import { upcomingEventConditions } from '@concert-crawl/db/upcoming-events'
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm'
import { canonicalizeArtist } from '@concert-crawl/types'
import type { ArtistSearchResult } from '@concert-crawl/types'
import { loadFollowedCanonicalNames } from '../lib/artist-follows.js'
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
      artist: events.artist,
      date: events.date,
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
    .groupBy(events.id, venues.name, venues.slug)
    .orderBy(desc(watcherCount), asc(events.date))
    .limit(5)

  const data = rows.map((row) => ({
    id: row.id,
    title: row.title,
    artist: row.artist,
    date: row.date,
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

  // The headliner-OR-support condition, mirroring artists-public.ts. `&&` is
  // array overlap. The literal is built with sql.join rather than binding the
  // JS array as one parameter: postgres.js flattens an array parameter into one
  // placeholder per element, which turns `$1::text[]` into a malformed cast.
  const canonicalNamesArray = sql`ARRAY[${sql.join(
    canonicalNames.map((canonical) => sql`${canonical}`),
    sql`, `,
  )}]::text[]`
  const appearsOnBill = or(
    inArray(events.canonicalArtist, canonicalNames),
    // Co-headliner arm (#1203) — only headliners[0] reaches canonical_artist,
    // so without it a second co-headliner reads as having no shows. Must not
    // diverge from the same condition in routes/artists-public.ts.
    sql`${events.canonicalHeadliners} && ${canonicalNamesArray}`,
    sql`${events.canonicalSupporting} && ${canonicalNamesArray}`,
  )

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
    })
    .from(events)
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
    const onBill = new Set<string>([
      ...(row.canonicalArtist === null ? [] : [row.canonicalArtist]),
      ...(row.canonicalHeadliners ?? []),
      ...(row.canonicalSupporting ?? []),
    ])
    // Same status triple the artist page's own upcoming section uses
    // (artists-public.ts) — counting only 'upcoming' would undercount, and
    // read "Past shows only" for an artist whose next date is postponed.
    const isUpcoming =
      UPCOMING_STATUSES.has(row.status ?? '') && row.date >= today
    for (const canonical of onBill) {
      hasVisibleEvent.add(canonical)
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

  // "At least one non-hidden event" is the gate — an artist whose only rows
  // are hidden or stale has a page with nothing on it, so it stays out of
  // search even though the projection row exists.
  const data: ArtistSearchResult[] = candidates
    .filter((row) => hasVisibleEvent.has(row.canonicalName))
    .slice(0, ARTIST_RESULT_LIMIT)
    .map((row) => ({
      name: row.name,
      slug: row.slug,
      photoUrl: row.photoUrl,
      upcomingShowCount: upcomingCounts.get(row.canonicalName) ?? 0,
      following: followed?.has(row.canonicalName) ?? false,
    }))

  return ctx.json({ success: true, data })
})
