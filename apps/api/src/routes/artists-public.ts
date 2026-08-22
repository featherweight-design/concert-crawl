import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  db,
  artists,
  events,
  userArtistFollows,
  venues,
} from '@concert-crawl/db'
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
} from 'drizzle-orm'
import {
  ARTIST_SLUG_MAX_LENGTH,
  ARTIST_SUGGESTIONS_DEFAULT_LIMIT,
  ARTIST_SUGGESTIONS_MAX_LIMIT,
  expandBucket,
} from '@concert-crawl/types'
import type {
  ArtistDetailResponse,
  ArtistPastShow,
  ArtistShow,
  ArtistSuggestion,
} from '@concert-crawl/types'
import { loadNextShowByCanonical } from '../lib/artist-follows.js'
import {
  loadPriceByTierByEventId,
  lowestHeadlinePrice,
} from '../lib/price-aggregation/index.js'
import { parsePrice } from '../lib/price.js'
import { todayInTimezone } from '../lib/time.js'

export const artistsPublicRouter = new Hono()

// Denver is the only market we crawl, and an artist's shows span venues, so
// there is no single venue timezone to pivot "today" on the way
// venues-public.ts does. Mountain Time is the product's display timezone
// (see history.ts, ics.ts).
const MT_TIME_ZONE = 'America/Denver'

// Past shows are capped so an artist with a decade of history can't produce an
// unbounded response. EXTENSION POINT (Item 3): when the page grows a
// "show all history" affordance, paginate here — and remember that
// `history.count` is derived from the returned rows, so a LIMIT that hides
// rows also lowers the count by design. A separate COUNT(*) would drift.
const PAST_LIMIT = 50
const UPCOMING_LIMIT = 50

// Public, like every other /v1 read route. The plan described a
// REQUIRE_BETA_AUTH router gate copied from venues-public.ts, but that flag was
// removed repo-wide before this branch existed — reinstating it here would make
// this one surface uniquely capable of 401ing on a setting nothing else reads.
// Reachability for logged-out visitors is decided in the web middleware
// matcher, not here.
//
// Clerk is mounted so `getAuth(ctx)` can resolve a session when one is present.
// It never rejects — anonymous readers get `following: null`.
artistsPublicRouter.use('*', clerkMiddleware())

// Mirrors artistSlug() output (packages/types/src/artist-slug.ts). A param that
// cannot be a slug is answered with the same 404 as a slug that simply doesn't
// exist — a public reader learns nothing from the difference.
const slugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(ARTIST_SLUG_MAX_LENGTH)
    .regex(/^[a-z0-9-]+$/),
})

// Cancelled and postponed rows stay, matching every other list surface.
const SCHEDULED_STATUSES = ['upcoming', 'cancelled', 'postponed'] as const

// There are 16 buckets (@concert-crawl/types) and the onboarding step can only
// send bucket labels, so anything past that is not a real selection — the cap
// exists so a hand-rolled query string can't expand into an unbounded ARRAY[].
const MAX_GENRE_FILTERS = 24

// The count cap alone still lets 24 megabyte-long values through into the
// ARRAY[] predicate. The longest real bucket label is well under this, so the
// ceiling is generous and still bounds the query. `filterVibe` on /v1/events
// caps its single value the same way.
const MAX_GENRE_LENGTH = 64

const suggestionsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(ARTIST_SUGGESTIONS_MAX_LIMIT)
    .optional()
    .default(ARTIST_SUGGESTIONS_DEFAULT_LIMIT),
  // Comma-separated bucket labels from the onboarding genre step. Parsed here
  // rather than repeated per-callsite so an all-empty list (`?genres=,,`) is a
  // 400 instead of silently behaving like "no filter" — a caller that asked
  // for a filter and got everything would look like the filter was ignored.
  genres: z
    .string()
    .optional()
    .transform((raw) =>
      raw === undefined
        ? undefined
        : raw
            .split(',')
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
    )
    .refine(
      (values) =>
        values === undefined ||
        (values.length > 0 &&
          values.length <= MAX_GENRE_FILTERS &&
          values.every((value) => value.length <= MAX_GENRE_LENGTH)),
      { message: 'Invalid genres' },
    ),
})

// GET /v1/artists/suggestions — followable artists with an upcoming Denver date
//
// ⚠️ MUST stay registered above `GET /:slug`. `suggestions` satisfies
// slugParamSchema, so a later registration would be shadowed and answer 404 as
// a missing artist.
//
// Ordering is by count of upcoming consumer-visible Denver shows desc, then
// soonest date asc, then name asc. The eng spec asked for "follower count",
// which describes a column that does not exist and is not being added —
// artists are a projection off event billing strings, not an authored table
// with metrics (Gate 1 decision D3). Local booking volume is the better signal
// anyway: this shelf recruits follows for shows you can actually go to, not
// for global fame.
//
// `?genres=` (PR 8, onboarding) is that WHERE. It filters on the EVENT's genre
// array, never the artist's: artists carry no genre of their own and are not
// getting a table for one (Gate 1, decision D3). Overlapping the billed events
// is also what makes every onboarding suggestion followable by construction —
// a row only appears because it has an upcoming Denver date in that bucket.
artistsPublicRouter.get(
  '/suggestions',
  zValidator('query', suggestionsQuerySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid query' }, 400)
    }
  }),
  async (ctx) => {
    const { limit, genres } = ctx.req.valid('query')
    const today = todayInTimezone(MT_TIME_ZONE)

    // Bucket taxonomy (#1101), same expansion the browse Vibe filter applies
    // in events.ts: 'punk' widens to every sub-genre in the bucket, and an
    // unknown value falls through verbatim so a raw sub-genre still matches.
    // Multiple buckets UNION — one overlap against the merged value set —
    // because picking two genres means "either", not "both".
    const genreCondition =
      genres === undefined
        ? undefined
        : (() => {
            const values = Array.from(
              new Set(genres.flatMap((genre) => expandBucket(genre))),
            )
            const placeholders = sql.join(
              values.map((value) => sql`${value}`),
              sql`, `,
            )
            // `&&` rather than `= ANY` so the GIN index on events.genre is usable.
            return sql`${events.genre} && ARRAY[${placeholders}]::text[]`
          })()

    // Same three-arm billing match the detail route uses, but column-to-column
    // rather than against a literal: the equality arm is the indexed fast
    // path, and both array arms use `&&` (not `= ANY`) because only overlap
    // can use the GIN indexes. The co-headliner arm is #1203 — without it the
    // second act on a co-headline bill is invisible to its own counts.
    const canonicalArray = sql`ARRAY[${artists.canonicalName}]::text[]`
    const appearsOnBill = or(
      eq(events.canonicalArtist, artists.canonicalName),
      sql`${events.canonicalHeadliners} && ${canonicalArray}`,
      sql`${events.canonicalSupporting} && ${canonicalArray}`,
    )

    const upcomingCount = sql<number>`count(distinct ${events.id})::int`
    const soonestDate = sql<string>`min(${events.date})`

    const rows = await db
      .select({
        name: artists.name,
        slug: artists.slug,
        canonicalName: artists.canonicalName,
        photoUrl: artists.photoUrl,
        upcomingShowCount: upcomingCount,
      })
      .from(artists)
      .innerJoin(events, appearsOnBill)
      .innerJoin(
        venues,
        and(eq(events.venueId, venues.id), eq(venues.active, true)),
      )
      .where(
        and(
          eq(artists.hidden, false),
          // The consumer filter pair every public query applies (#607).
          eq(events.hiddenFromConsumer, false),
          isNull(events.firstMissingAt),
          inArray(events.status, [...SCHEDULED_STATUSES]),
          gte(events.date, today),
          genreCondition,
        ),
      )
      .groupBy(
        artists.id,
        artists.name,
        artists.slug,
        artists.canonicalName,
        artists.photoUrl,
      )
      .orderBy(desc(upcomingCount), asc(soonestDate), asc(artists.name))
      .limit(limit)

    const canonicalNames = rows.map((row) => row.canonicalName)
    const nextShows = await loadNextShowByCanonical(canonicalNames)

    // Anonymous readers get `following: null` — there is no session to read,
    // and `false` would be a claim we cannot make.
    const authInfo = getAuth(ctx)
    let followed: Set<string> | null = null
    if (authInfo?.userId && canonicalNames.length > 0) {
      // `spotify_top` is listening history, not a follow — counting it would
      // render the badge pre-engaged for an artist the user never followed.
      // Mirrors the detail route above.
      const followRows = await db
        .select({ canonicalName: userArtistFollows.canonicalName })
        .from(userArtistFollows)
        .where(
          and(
            eq(userArtistFollows.userId, authInfo.userId),
            inArray(userArtistFollows.canonicalName, canonicalNames),
            ne(userArtistFollows.source, 'spotify_top'),
          ),
        )
      followed = new Set(followRows.map((row) => row.canonicalName))
    }

    const data: ArtistSuggestion[] = rows.flatMap((row): ArtistSuggestion[] => {
      const nextShow = nextShows.get(row.canonicalName)
      // Unreachable by construction — the row exists because it has an
      // upcoming consumer-visible date at an active venue, which is exactly
      // what loadNextShowByCanonical asks. Dropped rather than faked so a
      // future divergence between the two queries can never emit a
      // suggestion with no date attached.
      if (!nextShow) return []
      return [
        {
          name: row.name,
          slug: row.slug,
          photoUrl: row.photoUrl,
          upcomingShowCount: row.upcomingShowCount,
          nextShow,
          following: followed === null ? null : followed.has(row.canonicalName),
        },
      ]
    })

    return ctx.json({ success: true, data })
  },
)

// GET /v1/artists/:slug — artist detail + upcoming/past shows (public)
artistsPublicRouter.get(
  '/:slug',
  zValidator('param', slugParamSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Artist not found' }, 404)
    }
  }),
  async (ctx) => {
    const { slug } = ctx.req.valid('param')

    const [artist] = await db
      .select({
        name: artists.name,
        slug: artists.slug,
        canonicalName: artists.canonicalName,
        spotifyArtistId: artists.spotifyArtistId,
        photoUrl: artists.photoUrl,
      })
      .from(artists)
      // A hidden row (#1342) answers exactly like a slug that never existed —
      // an admin hid it because it doesn't name a performer, so there is
      // nothing for a reader to learn from the difference.
      .where(and(eq(artists.slug, slug), eq(artists.hidden, false)))

    if (!artist) {
      return ctx.json({ success: false, error: 'Artist not found' }, 404)
    }

    const today = todayInTimezone(MT_TIME_ZONE)

    // The headliner-OR-support condition, mirroring spotifyTasteCondition()
    // in lib/spotify-matches.ts. `= ANY(NULL)` is NULL (falsy), so events with
    // no supporting acts — and any row predating the canonical_headliners
    // backfill — are safe.
    //
    // canonical_headliners is the co-headliner arm (#1203): only headliners[0]
    // reaches canonical_artist, so without this arm the second act on a
    // co-headline bill is missing from their own page. It supplements
    // canonical_artist rather than replacing it — the equality arm is the
    // indexed fast path and still covers rows the crawler has not rewritten.
    // The mirror of this condition in routes/search.ts must not diverge.
    //
    // Both array arms use the overlap operator against a one-element array
    // rather than `= ANY(...)`: the semantics are identical, but only `&&` can
    // use the GIN indexes on these columns.
    const oneElement = sql`ARRAY[${artist.canonicalName}]::text[]`
    const appearsOnBill = or(
      eq(events.canonicalArtist, artist.canonicalName),
      sql`${events.canonicalHeadliners} && ${oneElement}`,
      sql`${events.canonicalSupporting} && ${oneElement}`,
    )

    // The consumer filter pair every public query applies: non-concert rows
    // are hidden, and crawler-flagged stale rows are suppressed so a duplicate
    // extraction can't inflate what the page renders (#607).
    const consumerVisible = and(
      eq(events.hiddenFromConsumer, false),
      isNull(events.firstMissingAt),
    )

    const showColumns = {
      eventId: events.id,
      iso: events.date,
      showTime: events.showTime,
      ticketPriceMin: events.ticketPriceMin,
      status: events.status,
      venue: venues.name,
      venueSlug: venues.slug,
      city: venues.city,
    }

    // The upcoming row renders through the shared event row, which promotes
    // the tour name into the title slot and chips one genre. The past row is a
    // bare line and needs none of it.
    const upcomingColumns = {
      ...showColumns,
      tourName: events.tourName,
      genre: events.genre,
      imageUrl: events.imageUrl,
    }

    const upcomingRows = await db
      .select(upcomingColumns)
      .from(events)
      .innerJoin(
        venues,
        and(eq(events.venueId, venues.id), eq(venues.active, true)),
      )
      .where(
        and(
          appearsOnBill,
          consumerVisible,
          // Cancelled and postponed rows stay, matching every other list
          // surface (events.ts). A show the visitor is watching must not
          // vanish from the artist page the moment it is cancelled.
          inArray(events.status, ['upcoming', 'cancelled', 'postponed']),
          gte(events.date, today),
        ),
      )
      .orderBy(asc(events.date), asc(events.showTime))
      .limit(UPCOMING_LIMIT)

    const pastRows = await db
      .select(showColumns)
      .from(events)
      // Deliberately not filtered on venues.active (#1299), unlike the
      // upcoming query above. Deactivation removes a venue from everything
      // forward-looking; it does not un-happen the shows it already hosted.
      .innerJoin(venues, eq(events.venueId, venues.id))
      .where(
        and(
          appearsOnBill,
          consumerVisible,
          lt(events.date, today),
          // A cancelled show never happened, so it is not part of "we've
          // caught them N times". Postponed rows stay: the date moved, the
          // show still occurred on our map.
          ne(events.status, 'cancelled'),
        ),
      )
      .orderBy(desc(events.date), desc(events.showTime))
      .limit(PAST_LIMIT)

    // The cheapest corroborated tier, falling back to the denormalized scalar
    // whenever the event has no corroborated tier to aggregate — usually a
    // crawler-sourced price nobody has submitted against, but the condition is
    // the absent tier, not the price's origin. Reading `ticketPriceMin` alone
    // is what made this page quote a higher price than Event Detail whenever a
    // cheaper tier existed (#1365).
    const priceByTierByEventId = await loadPriceByTierByEventId(
      upcomingRows.map((row) => row.eventId),
    )

    const shows: ArtistShow[] = upcomingRows.map((row) => ({
      eventId: row.eventId,
      iso: row.iso,
      showTime: row.showTime,
      venue: row.venue,
      venueSlug: row.venueSlug,
      city: row.city,
      price:
        lowestHeadlinePrice(priceByTierByEventId.get(row.eventId) ?? []) ??
        parsePrice(row.ticketPriceMin),
      tourName: row.tourName,
      genres: row.genre ?? [],
      imageUrl: row.imageUrl,
      status: row.status,
    }))

    const past: ArtistPastShow[] = pastRows.map((row) => ({
      eventId: row.eventId,
      iso: row.iso,
      venue: row.venue,
      venueSlug: row.venueSlug,
      city: row.city,
    }))

    // The gate `search.ts` already applies and this route did not: an artist
    // is only real if at least one consumer-visible event bills them (#1343).
    // Every event hidden means the projection captured something that is not a
    // performer, and the page would otherwise render a name, a follow button
    // and no shows at all — worse than a 404, because it looks like we lost
    // the data rather than never having had an artist.
    //
    // Asked of `events` directly rather than of `shows`/`past`, which are
    // narrower: a past cancelled show is dropped from both lists but was
    // still billed to a real performer, and the two lists are additionally
    // capped by LIMIT. Only "nothing consumer-visible bills them at all" is a
    // 404 — the same question search.ts asks.
    if (shows.length === 0 && past.length === 0) {
      const [billed] = await db
        .select({ id: events.id })
        .from(events)
        .where(and(appearsOnBill, consumerVisible))
        .limit(1)

      if (!billed) {
        return ctx.json({ success: false, error: 'Artist not found' }, 404)
      }
    }

    // Derived from `past` itself — never a separate COUNT(*), which would
    // drift past PAST_LIMIT and make the history sentence contradict the list
    // rendered underneath it.
    const historyVenues: string[] = []
    for (const row of past) {
      if (!historyVenues.includes(row.venue)) historyVenues.push(row.venue)
    }

    const authInfo = getAuth(ctx)
    let following: boolean | null = null
    if (authInfo?.userId) {
      // `manual` and `spotify_followed` are both follows the user performed;
      // `spotify_top` is listening history, and counting it would render the
      // button pre-engaged for an artist they never followed — pressing it to
      // unfollow would then do nothing visible, because DELETE is scoped to
      // `source = 'manual'`. DELETE still only removes the `manual` row, so a
      // Spotify-synced user stays `following: true` after unfollowing —
      // intentional, and asserted in the follow tests.
      const [followRow] = await db
        .select({ id: userArtistFollows.id })
        .from(userArtistFollows)
        .where(
          and(
            eq(userArtistFollows.userId, authInfo.userId),
            eq(userArtistFollows.canonicalName, artist.canonicalName),
            ne(userArtistFollows.source, 'spotify_top'),
          ),
        )
        .limit(1)
      following = Boolean(followRow)
    }

    const data: ArtistDetailResponse = {
      artist: {
        name: artist.name,
        slug: artist.slug,
        spotifyArtistId: artist.spotifyArtistId,
        photoUrl: artist.photoUrl,
      },
      shows,
      past,
      history: { count: past.length, venues: historyVenues },
      following,
    }

    return ctx.json({ success: true, data })
  },
)
