import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import {
  artists,
  db,
  events,
  priceSubmissions,
  userEvents,
  venueGuideChips,
  venues,
} from '@concert-crawl/db'
import { upcomingEventConditions } from '@concert-crawl/db/upcoming-events'
import {
  type SQL,
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  ne,
  sql,
} from 'drizzle-orm'
import {
  GUIDE_CHIP_ORDER,
  SP_POLICY,
  type VenueGuide,
  type VenueGuideChip,
  deriveSourceCategory,
  isGuideChipKey,
  RESALE_VENDOR_VALUES,
} from '@concert-crawl/types'
import { todayInTimezone } from '../lib/time.js'
import {
  displayHeadliner,
  portraitCanonicalName,
} from '../lib/event-billing.js'

// Matches history.ts — "already happened" is a Mountain Time calendar-day call,
// not a UTC one, or a late show reads as past hours before it starts.
const MT_TIME_ZONE = 'America/Denver'

import { venueSlug } from '../lib/venue-slug-schema.js'
import { aggregateByTier } from '../lib/price-aggregation/index.js'

export const venuesPublicRouter = new Hono()

// Clerk is mounted so `getAuth(ctx)` can resolve a session when one is present.
// It never rejects — these routes stay public, and an anonymous reader gets
// `viewerHasAttended: null` rather than a 401. Same shape as artists-public.ts.
venuesPublicRouter.use('*', clerkMiddleware())

// GET /v1/venues — list active venues with upcoming event counts (public)
venuesPublicRouter.get('/', async (ctx) => {
  const rows = await db
    .select({
      id: venues.id,
      name: venues.name,
      slug: venues.slug,
      city: venues.city,
      timezone: venues.timezone,
      websiteUrl: venues.websiteUrl,
      active: venues.active,
      verified: venues.verified,
      address: venues.address,
      capacity: venues.capacity,
      venueType: venues.venueType,
      about: venues.about,
      neighborhood: venues.neighborhood,
      featured: venues.featured,
      lat: venues.lat,
      lng: venues.lng,
    })
    .from(venues)
    .where(eq(venues.active, true))
    .orderBy(asc(venues.name))

  const today = new Date().toISOString().slice(0, 10)
  const eventCounts = await db
    .select({ venueId: events.venueId, total: count(events.id) })
    .from(events)
    .where(
      and(
        ...upcomingEventConditions({ from: today }),
        isNotNull(events.venueId),
      ),
    )
    .groupBy(events.venueId)

  const countByVenueId = new Map(
    eventCounts.map((row) => [row.venueId, row.total]),
  )

  const data = rows.map((venue) => ({
    ...venue,
    upcomingCount: countByVenueId.get(venue.id) ?? 0,
  }))

  return ctx.json({ success: true, data })
})

// Same rule the admin API creates slugs with, so this route can never reject a
// venue that was legitimately created. A param that can't be a slug is answered
// with the same 404 as a slug that simply doesn't exist — a public reader
// learns nothing from the difference, and a 400 here would turn today's 404 for
// a malformed URL into a new status code for callers.
const slugParamSchema = z.object({ slug: venueSlug() })

// GET /v1/venues/:slug — venue detail + upcoming events (public)
venuesPublicRouter.get(
  '/:slug',
  zValidator('param', slugParamSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Venue not found' }, 404)
    }
  }),
  async (ctx) => {
    const { slug } = ctx.req.valid('param')

    const [venue] = await db
      .select({
        id: venues.id,
        name: venues.name,
        slug: venues.slug,
        city: venues.city,
        timezone: venues.timezone,
        websiteUrl: venues.websiteUrl,
        active: venues.active,
        verified: venues.verified,
        address: venues.address,
        capacity: venues.capacity,
        venueType: venues.venueType,
        about: venues.about,
        neighborhood: venues.neighborhood,
        featured: venues.featured,
        lat: venues.lat,
        lng: venues.lng,
        // #764 first-timer guide. Both columns are stripped from the venue
        // object below — they only feed the assembled `guide`, and a draft
        // insiderTip must never reach the consumer surface.
        insiderTip: venues.insiderTip,
        guidePublishedAt: venues.guidePublishedAt,
      })
      .from(venues)
      // Inactive venues are 404, not just unlisted (#1292). Without this the
      // list route hides a deactivated venue while its detail page stays live
      // and indexable at a direct URL. Admin reads venues by id through
      // /v1/admin/venues/:id, so nothing internal depends on reaching an
      // inactive venue by slug here.
      .where(and(eq(venues.slug, slug), eq(venues.active, true)))

    if (!venue) {
      return ctx.json({ success: false, error: 'Venue not found' }, 404)
    }

    // Split off the two guide-only columns so the venue object serialized to
    // the consumer can never carry a draft insiderTip.
    const { insiderTip, guidePublishedAt, ...venuePublic } = venue

    // #764 — the published guide. Only queried when the venue has actually
    // published, so a draft costs zero extra round-trips and can never leak.
    // Chips are sorted in JS by GUIDE_CHIP_ORDER index: the pool is 8 items,
    // so an ORDER BY CASE would be noise on the query for no measurable win.
    // A row whose chip_type is outside the v1 pool (a #997 key promoted in a
    // later deploy, read by an older API instance) is dropped rather than
    // appended in arbitrary order — the consumer has no label for it.
    let guide: VenueGuide | null = null
    if (guidePublishedAt !== null) {
      const chipRows = await db
        .select({
          chipType: venueGuideChips.chipType,
          body: venueGuideChips.body,
          isPlaceholder: venueGuideChips.isPlaceholder,
        })
        .from(venueGuideChips)
        .where(eq(venueGuideChips.venueId, venue.id))

      const chips: VenueGuideChip[] = chipRows
        .flatMap((row) =>
          isGuideChipKey(row.chipType)
            ? [
                {
                  chipType: row.chipType,
                  body: row.body,
                  isPlaceholder: row.isPlaceholder,
                },
              ]
            : [],
        )
        .sort(
          (left, right) =>
            GUIDE_CHIP_ORDER.indexOf(left.chipType) -
            GUIDE_CHIP_ORDER.indexOf(right.chipType),
        )

      // A published guide with no chips has no drawn state — accessibility is
      // the publish gate, so this only happens if the rows were deleted out
      // from under the flag. Serving `null` renders the pre-guide page rather
      // than an empty section header.
      if (chips.length > 0) {
        guide = {
          chips,
          insiderTip,
          publishedAt: guidePublishedAt.toISOString(),
        }
      }
    }

    const today = todayInTimezone(venue.timezone)

    // Shared between the count query and the list query below, so the
    // upcomingCount the detail page renders stays consistent with the rows in
    // upcomingEvents.
    const conditions: SQL[] = [
      eq(events.venueId, venue.id),
      ...upcomingEventConditions({ from: today }),
    ]

    const [countRow] = await db
      .select({ total: count(events.id) })
      .from(events)
      .where(and(...conditions))

    const upcomingCount = countRow?.total ?? 0

    const upcomingEvents = await db
      .select({
        id: events.id,
        venueId: events.venueId,
        title: events.title,
        artist: displayHeadliner(),
        supportingArtists: events.supportingArtists,
        tourName: events.tourName,
        date: events.date,
        doorsTime: events.doorsTime,
        showTime: events.showTime,
        ticketUrl: events.ticketUrl,
        ticketLinks: events.ticketLinks,
        ticketPriceMin: events.ticketPriceMin,
        ticketPriceMax: events.ticketPriceMax,
        description: events.description,
        imageUrl: events.imageUrl,
        genre: events.genre,
        priceSource: events.priceSource,
        pipelineExhaustedAt: events.pipelineExhaustedAt,
        status: events.status,
        confidenceScore: events.confidenceScore,
        verified: events.verified,
        sourceUrl: events.sourceUrl,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        artistPhotoUrl: artists.photoUrl,
      })
      .from(events)
      // Headliner portrait, on the same terms as /v1/events: `artists` is a
      // projection keyed on canonicalName with no foreign key, and the unique
      // index on that column is what keeps this join cardinality-preserving.
      .leftJoin(artists, eq(portraitCanonicalName(), artists.canonicalName))
      .where(and(...conditions))
      .orderBy(asc(events.date), asc(events.showTime))
      .limit(50)

    const communityEventIds = upcomingEvents
      .filter((evt) => evt.priceSource === 'community')
      .map((evt) => evt.id)

    const vendorByEventId: Record<string, string | null> = {}
    if (communityEventIds.length > 0) {
      const vendorRows = await db
        .select({
          eventId: priceSubmissions.eventId,
          vendor: priceSubmissions.vendor,
        })
        .from(priceSubmissions)
        .where(
          and(
            inArray(priceSubmissions.eventId, communityEventIds),
            eq(priceSubmissions.status, 'corroborated'),
          ),
        )
        .orderBy(
          sql`CASE WHEN ${priceSubmissions.vendor} = 'VenueBoxOffice' THEN 0 WHEN ${inArray(priceSubmissions.vendor, RESALE_VENDOR_VALUES)} THEN 2 ELSE 1 END ASC`,
          desc(priceSubmissions.createdAt),
        )
      for (const vRow of vendorRows) {
        if (!(vRow.eventId in vendorByEventId)) {
          vendorByEventId[vRow.eventId] = vRow.vendor
        }
      }
    }

    // priceByTier parity with the browse list endpoint (#787). Both surfaces
    // render the same consumer EventCard, which reads `priceByTier` via
    // pickBrowseHeadline() to pick the cheapest tier. Without this batch the
    // venue card falls back to the flat `ticketPriceMin` scalar, which is
    // clobbered to whichever tier was most recently confirmed (a multi-tier
    // event's VIP min can overwrite its GA min), so the venue page showed a
    // higher "from" price than browse for the same event. Mirrors the list
    // endpoint's cost-controlled shape: only corroborated rows, empty
    // pending/counters, headline-only consumption. Bounded by the 50-event
    // page limit above, same order as a browse page.
    const visibleEventIds = upcomingEvents.map((evt) => evt.id)
    const priceByTierByEventId = new Map<
      string,
      Awaited<ReturnType<typeof aggregateByTier>>
    >()
    if (visibleEventIds.length > 0) {
      const corroboratedRows = await db
        .select({
          id: priceSubmissions.id,
          eventId: priceSubmissions.eventId,
          tier: priceSubmissions.tier,
          priceMin: priceSubmissions.priceMin,
          priceMax: priceSubmissions.priceMax,
          vendor: priceSubmissions.vendor,
          sourceCategory: priceSubmissions.sourceCategory,
          howFound: priceSubmissions.howFound,
          userId: priceSubmissions.userId,
          createdAt: priceSubmissions.createdAt,
          updatedAt: priceSubmissions.updatedAt,
          lastSeenAt: priceSubmissions.lastSeenAt,
          corroborationCount: priceSubmissions.corroborationCount,
        })
        .from(priceSubmissions)
        .where(
          and(
            inArray(priceSubmissions.eventId, visibleEventIds),
            eq(priceSubmissions.status, 'corroborated'),
          ),
        )

      const corroboratedByEvent = new Map<string, typeof corroboratedRows>()
      for (const sub of corroboratedRows) {
        const existing = corroboratedByEvent.get(sub.eventId)
        if (existing) existing.push(sub)
        else corroboratedByEvent.set(sub.eventId, [sub])
      }

      for (const [eventId, subs] of corroboratedByEvent) {
        const blocks = aggregateByTier({
          corroborated: subs.map((sub) => ({
            id: sub.id,
            tier: sub.tier,
            priceMin: sub.priceMin,
            priceMax: sub.priceMax,
            vendor: sub.vendor,
            sourceCategory:
              sub.sourceCategory ??
              deriveSourceCategory(sub.vendor, sub.howFound),
            userId: sub.userId,
            createdAt: sub.createdAt,
            updatedAt: sub.updatedAt,
            lastSeenAt: sub.lastSeenAt,
            // Submitter counts as observation #1 per the corroboration_count
            // schema comment, so the surfaced confirm count excludes them.
            confirmsCount: Math.max(0, sub.corroborationCount - 1),
          })),
          pending: [],
          counters: [],
          handles: new Map(),
          reportsByTier: new Map(),
          confirmsNeeded: SP_POLICY.confirmsRequired,
          viewerUserId: null,
        })
        priceByTierByEventId.set(eventId, blocks)
      }
    }

    const enrichedEvents = upcomingEvents.map((evt) => ({
      ...evt,
      priceVendor:
        evt.priceSource === 'community'
          ? (vendorByEventId[evt.id] ?? null)
          : null,
      priceByTier: priceByTierByEventId.get(evt.id) ?? null,
    }))

    // #764 — has this viewer ever been to this room? `null` means "we cannot
    // know" and must never collapse to `false`, which would be a positive claim
    // that they have never been. Anonymous readers add zero queries.
    //
    // Watching is not Attending (#70): only `attending_at IS NOT NULL` counts,
    // so a watched-but-never-attended row leaves the viewer a first-timer. And
    // "attending" is not "attended" — the predicate is the one documented in
    // history.ts, past date included.
    const authInfo = getAuth(ctx)
    let viewerHasAttended: boolean | null = null
    if (authInfo?.userId) {
      const [attendedRow] = await db
        .select({ id: userEvents.id })
        .from(userEvents)
        .innerJoin(events, eq(events.id, userEvents.eventId))
        .where(
          and(
            eq(userEvents.userId, authInfo.userId),
            eq(events.venueId, venue.id),
            isNotNull(userEvents.attendingAt),
            // Attending a show that has not happened yet does not make you a
            // returner — it makes you a first-timer with a ticket, which is
            // exactly who the guide is for. Same "past date, not cancelled"
            // definition of a night that happened as history.ts (#1212).
            sql`${events.date} < (NOW() AT TIME ZONE ${MT_TIME_ZONE})::date`,
            ne(events.status, 'cancelled'),
          ),
        )
        .limit(1)
      viewerHasAttended = Boolean(attendedRow)
    }

    return ctx.json({
      success: true,
      data: {
        venue: { ...venuePublic, upcomingCount, guide },
        upcomingEvents: enrichedEvents,
        viewerHasAttended,
      },
    })
  },
)
