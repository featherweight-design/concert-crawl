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
import { and, asc, desc, eq, gte, isNull, lt, ne, or, sql } from 'drizzle-orm'
import { ARTIST_SLUG_MAX_LENGTH } from '@concert-crawl/types'
import type {
  ArtistDetailResponse,
  ArtistPastShow,
  ArtistShow,
} from '@concert-crawl/types'
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

const parsePrice = (raw: string | null): number | null => {
  if (raw === null) return null
  const parsed = Number.parseFloat(raw)
  return Number.isNaN(parsed) ? null : parsed
}

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
      .where(eq(artists.slug, slug))

    if (!artist) {
      return ctx.json({ success: false, error: 'Artist not found' }, 404)
    }

    const today = todayInTimezone(MT_TIME_ZONE)

    // The headliner-OR-support condition, mirroring spotifyTasteCondition()
    // in lib/spotify-matches.ts. `= ANY(NULL)` is NULL (falsy), so events with
    // no supporting acts are safe.
    const appearsOnBill = or(
      eq(events.canonicalArtist, artist.canonicalName),
      sql`${artist.canonicalName} = ANY(${events.canonicalSupporting})`,
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
      venue: venues.name,
      venueSlug: venues.slug,
      city: venues.city,
    }

    const upcomingRows = await db
      .select(showColumns)
      .from(events)
      .innerJoin(venues, eq(events.venueId, venues.id))
      .where(
        and(
          appearsOnBill,
          consumerVisible,
          eq(events.status, 'upcoming'),
          gte(events.date, today),
        ),
      )
      .orderBy(asc(events.date), asc(events.showTime))
      .limit(UPCOMING_LIMIT)

    const pastRows = await db
      .select(showColumns)
      .from(events)
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

    const shows: ArtistShow[] = upcomingRows.map((row) => ({
      eventId: row.eventId,
      iso: row.iso,
      showTime: row.showTime,
      venue: row.venue,
      venueSlug: row.venueSlug,
      city: row.city,
      price: parsePrice(row.ticketPriceMin),
    }))

    const past: ArtistPastShow[] = pastRows.map((row) => ({
      eventId: row.eventId,
      iso: row.iso,
      venue: row.venue,
      venueSlug: row.venueSlug,
      city: row.city,
    }))

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
      // ANY follow row counts, regardless of source: a Spotify-synced follow
      // is still a follow from the reader's point of view. DELETE only removes
      // the `manual` row, so a synced user stays `following: true` after
      // unfollowing — intentional, and asserted in the follow tests.
      const [followRow] = await db
        .select({ id: userArtistFollows.id })
        .from(userArtistFollows)
        .where(
          and(
            eq(userArtistFollows.userId, authInfo.userId),
            eq(userArtistFollows.canonicalName, artist.canonicalName),
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
