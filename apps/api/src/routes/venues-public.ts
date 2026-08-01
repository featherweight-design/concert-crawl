import { Hono } from 'hono'
import { db, events, priceSubmissions, venues } from '@concert-crawl/db'
import {
  type SQL,
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  sql,
} from 'drizzle-orm'
import {
  SP_POLICY,
  deriveSourceCategory,
  RESALE_VENDOR_VALUES,
} from '@concert-crawl/types'
import { todayInTimezone } from '../lib/time.js'
import { aggregateByTier } from '../lib/price-aggregation/index.js'

export const venuesPublicRouter = new Hono()

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
        eq(events.status, 'upcoming'),
        gte(events.date, today),
        isNotNull(events.venueId),
        // PR 6 — exclude non-concert events from venue counts.
        eq(events.hiddenFromConsumer, false),
        // Hide crawler-flagged stale rows from the venue-index upcoming-count
        // chip so duplicate/missing extractions don't inflate the count
        // beyond what the venue-detail list actually renders (#607).
        isNull(events.firstMissingAt),
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

// GET /v1/venues/:slug — venue detail + upcoming events (public)
venuesPublicRouter.get('/:slug', async (ctx) => {
  const { slug } = ctx.req.param()

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

  const today = todayInTimezone(venue.timezone)

  const conditions: SQL[] = [
    eq(events.venueId, venue.id),
    eq(events.status, 'upcoming'),
    gte(events.date, today),
    // PR 6 — exclude non-concert events from the venue detail listing.
    eq(events.hiddenFromConsumer, false),
    // Hide crawler-flagged stale rows from the venue-detail upcoming list
    // (#607). Shared between the count query and the list query below
    // because both use this conditions array — so the upcomingCount the
    // detail page renders stays consistent with the rows in upcomingEvents.
    isNull(events.firstMissingAt),
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
      artist: events.artist,
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
    })
    .from(events)
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

  return ctx.json({
    success: true,
    data: {
      venue: { ...venue, upcomingCount },
      upcomingEvents: enrichedEvents,
    },
  })
})
