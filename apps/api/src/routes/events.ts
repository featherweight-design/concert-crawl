import { Hono } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  db,
  events,
  venues,
  userEvents,
  userProfiles,
  priceSubmissions,
  submissionConfirms,
  eventReports,
  eventReportConfirms,
} from '@concert-crawl/db'
import {
  type SQL,
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import { todayInTimezone } from '../lib/time.js'
import { apiLogger } from '../lib/logger.js'
import { serviceOrClerkAuth } from '../middleware/auth.js'

const uuidSchema = z.string().uuid()

const listEventsSchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  venueSlug: z.string().optional(),
  search: z.string().max(200).optional(),
  filterPrice: z.enum(['under-25', '25-50', '50-plus', 'tbd']).optional(),
  filterVibe: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export const eventsRouter = new Hono()

if (process.env.REQUIRE_BETA_AUTH === 'true') {
  eventsRouter.use('*', serviceOrClerkAuth)
}

// GET /v1/events — public event listing with filters and pagination
eventsRouter.get('/', zValidator('query', listEventsSchema), async (ctx) => {
  const {
    from,
    to,
    venueSlug,
    search,
    limit,
    offset,
    filterPrice,
    filterVibe,
  } = ctx.req.valid('query')

  const conditions: SQL[] = [
    inArray(events.status, ['upcoming', 'cancelled', 'postponed']),
    gte(events.date, from ?? todayInTimezone('UTC')),
  ]

  if (to) {
    conditions.push(lte(events.date, to))
  }

  if (venueSlug) {
    const [venue] = await db
      .select({ id: venues.id })
      .from(venues)
      .where(eq(venues.slug, venueSlug))
      .limit(1)
    if (!venue) {
      return ctx.json({
        success: true,
        data: { data: [], total: 0, limit, offset },
      })
    }
    conditions.push(eq(events.venueId, venue.id))
  }

  if (search) {
    const searchCondition = or(
      ilike(events.title, `%${search}%`),
      ilike(events.artist, `%${search}%`),
      ilike(venues.name, `%${search}%`),
    )
    if (searchCondition) conditions.push(searchCondition)
  }

  const priceCondition =
    filterPrice === 'under-25'
      ? and(isNotNull(events.ticketPriceMin), lt(events.ticketPriceMin, '25'))
      : filterPrice === '25-50'
        ? and(
            isNotNull(events.ticketPriceMin),
            gte(events.ticketPriceMin, '25'),
            lt(events.ticketPriceMin, '50'),
          )
        : filterPrice === '50-plus'
          ? and(
              isNotNull(events.ticketPriceMin),
              gte(events.ticketPriceMin, '50'),
            )
          : filterPrice === 'tbd'
            ? and(isNull(events.ticketPriceMin), isNull(events.ticketPriceMax))
            : undefined

  if (priceCondition) conditions.push(priceCondition)

  if (filterVibe) {
    conditions.push(sql`${events.genre} && ARRAY[${filterVibe}]::text[]`)
  }

  const where = and(...conditions)

  const countResult = await db
    .select({ total: count() })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(where)

  const total = countResult[0]?.total ?? 0

  const rows = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      title: events.title,
      artist: events.artist,
      date: events.date,
      doorsTime: events.doorsTime,
      showTime: events.showTime,
      ticketUrl: events.ticketUrl,
      ticketPriceMin: events.ticketPriceMin,
      ticketPriceMax: events.ticketPriceMax,
      priceSource: events.priceSource,
      description: events.description,
      imageUrl: events.imageUrl,
      genre: events.genre,
      status: events.status,
      confidenceScore: events.confidenceScore,
      verified: events.verified,
      sourceUrl: events.sourceUrl,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
      venue: {
        id: venues.id,
        name: venues.name,
        slug: venues.slug,
        city: venues.city,
        timezone: venues.timezone,
        websiteUrl: venues.websiteUrl,
      },
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(where)
    .orderBy(asc(events.date), asc(events.showTime))
    .limit(limit)
    .offset(offset)

  // Batch-fetch corroborated submission vendor for community-priced events so the
  // browse card can show the correct trust tier (boxoffice ★, resale R, community C).
  const communityEventIds = rows
    .filter((row) => row.priceSource === 'community')
    .map((row) => row.id)

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
        sql`CASE WHEN ${priceSubmissions.vendor} = 'VenueBoxOffice' THEN 0 WHEN ${priceSubmissions.vendor} = 'SeatGeek' THEN 2 ELSE 1 END ASC`,
        desc(priceSubmissions.createdAt),
      )

    for (const vRow of vendorRows) {
      if (!(vRow.eventId in vendorByEventId)) {
        vendorByEventId[vRow.eventId] = vRow.vendor
      }
    }
  }

  const enrichedRows = rows.map((row) => ({
    ...row,
    priceVendor:
      row.priceSource === 'community'
        ? (vendorByEventId[row.id] ?? null)
        : null,
  }))

  return ctx.json({
    success: true,
    data: { data: enrichedRows, total, limit, offset },
  })
})

// GET /v1/events/genres — distinct genres across all upcoming events
eventsRouter.get('/genres', async (ctx) => {
  const rows = await db.execute(
    sql`SELECT DISTINCT unnest(genre) AS genre FROM ${events} WHERE status = 'upcoming' AND genre IS NOT NULL ORDER BY genre`,
  )
  const genres = Array.from(rows)
    .map((row) => (row as Record<string, unknown>)['genre'])
    .filter((genre): genre is string => typeof genre === 'string')
  return ctx.json({ success: true, data: genres })
})

// GET /v1/events/:id — single event with venue, watching count, setlist
eventsRouter.get('/:id', clerkMiddleware(), async (ctx) => {
  const rawId = ctx.req.param('id')
  const parsed = uuidSchema.safeParse(rawId)
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Event not found' }, 404)
  const id = parsed.data

  const [row] = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      title: events.title,
      artist: events.artist,
      date: events.date,
      doorsTime: events.doorsTime,
      showTime: events.showTime,
      ticketUrl: events.ticketUrl,
      ticketPriceMin: events.ticketPriceMin,
      ticketPriceMax: events.ticketPriceMax,
      priceSource: events.priceSource,
      description: events.description,
      imageUrl: events.imageUrl,
      genre: events.genre,
      status: events.status,
      confidenceScore: events.confidenceScore,
      verified: events.verified,
      sourceUrl: events.sourceUrl,
      setlist: events.setlist,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
      venue: {
        id: venues.id,
        name: venues.name,
        slug: venues.slug,
        city: venues.city,
        timezone: venues.timezone,
        websiteUrl: venues.websiteUrl,
      },
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(eq(events.id, id))

  if (!row) {
    return ctx.json({ success: false, error: 'Event not found' }, 404)
  }

  const [watchCountRow] = await db
    .select({ total: count() })
    .from(userEvents)
    .where(and(eq(userEvents.eventId, id), eq(userEvents.status, 'watching')))

  const watchingCount = watchCountRow?.total ?? 0

  const authInfo = getAuth(ctx)
  let isWatching = false
  if (authInfo?.userId) {
    const [watchRow] = await db
      .select({ id: userEvents.id })
      .from(userEvents)
      .where(
        and(
          eq(userEvents.userId, authInfo.userId),
          eq(userEvents.eventId, id),
          eq(userEvents.status, 'watching'),
        ),
      )
      .limit(1)
    isWatching = Boolean(watchRow)
  }

  // Detect a promoted sold-out report — drives the confirmed sold-out UI.
  const [soldOutReportRow] = await db
    .select({
      id: eventReports.id,
      reporterId: eventReports.reporterId,
      createdAt: eventReports.createdAt,
    })
    .from(eventReports)
    .where(
      and(
        eq(eventReports.eventId, id),
        eq(eventReports.status, 'sold-out'),
        eq(eventReports.resolution, 'promoted'),
      ),
    )
    .orderBy(desc(eventReports.createdAt))
    .limit(1)

  let priceStatus: 'live' | 'soldout' | null = null
  let soldOutReport: {
    reporterHandle: string | null
    confirmsCount: number
    reportedAt: string
  } | null = null

  if (soldOutReportRow) {
    priceStatus = 'soldout'

    const [confirmCountRow] = await db
      .select({ total: count() })
      .from(eventReportConfirms)
      .where(eq(eventReportConfirms.reportId, soldOutReportRow.id))

    const confirmsCount = confirmCountRow?.total ?? 0

    const [reporterProfile] = await db
      .select({ handle: userProfiles.handle })
      .from(userProfiles)
      .where(eq(userProfiles.userId, soldOutReportRow.reporterId))
      .limit(1)

    soldOutReport = {
      reporterHandle: reporterProfile?.handle ?? null,
      confirmsCount: confirmsCount + 1,
      reportedAt: soldOutReportRow.createdAt.toISOString(),
    }
  }

  // For community-priced events, surface the vendor and submitter handle so the
  // price card can show the correct trust tier (box office vs. community) and
  // attribution line.
  let priceVendor: string | null = null
  let priceSubmitterHandle: string | null = null
  let priceObservedAt: string | null = null

  let priceApprovalKind: 'admin' | 'fan' | null = null
  let priceApprovedAt: string | null = null
  let priceAlternates: Array<{
    vendor: string | null
    priceMin: string
    priceMax: string | null
  }> = []
  let priceConfirmsCount: number = 0
  let counterSubmission: {
    id: string
    floor: number
    ceiling?: number
    submitter: { handle: string } | null
    submittedAt: string
  } | null = null

  if (row.priceSource === 'community') {
    const allSubs = await db
      .select({
        id: priceSubmissions.id,
        vendor: priceSubmissions.vendor,
        userId: priceSubmissions.userId,
        priceMin: priceSubmissions.priceMin,
        priceMax: priceSubmissions.priceMax,
        createdAt: priceSubmissions.createdAt,
        updatedAt: priceSubmissions.updatedAt,
      })
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.eventId, id),
          eq(priceSubmissions.status, 'corroborated'),
        ),
      )
      // Sort by trust priority: box office (0) > community (1) > resale (2), then newest first
      .orderBy(
        sql`CASE WHEN ${priceSubmissions.vendor} = 'VenueBoxOffice' THEN 0 WHEN ${priceSubmissions.vendor} = 'SeatGeek' THEN 2 ELSE 1 END ASC`,
        desc(priceSubmissions.createdAt),
      )

    const [latestSub, ...otherSubs] = allSubs

    if (latestSub) {
      priceVendor = latestSub.vendor
      priceObservedAt = latestSub.createdAt.toISOString()
      // updatedAt reflects when status changed to corroborated (the approval timestamp)
      priceApprovedAt = latestSub.updatedAt.toISOString()
      // If submission_confirms has rows, at least one fan corroborated it; otherwise admin approved it
      const [confirmCount] = await db
        .select({ total: count() })
        .from(submissionConfirms)
        .where(eq(submissionConfirms.submissionId, latestSub.id))
      priceConfirmsCount = confirmCount?.total ?? 0
      priceApprovalKind = priceConfirmsCount > 0 ? 'fan' : 'admin'

      const allSubIds = allSubs.map((sub) => sub.id)
      const [counterRow] = await db
        .select({
          id: priceSubmissions.id,
          priceMin: priceSubmissions.priceMin,
          priceMax: priceSubmissions.priceMax,
          userId: priceSubmissions.userId,
          createdAt: priceSubmissions.createdAt,
        })
        .from(priceSubmissions)
        .where(
          and(
            eq(priceSubmissions.eventId, id),
            eq(priceSubmissions.status, 'pending'),
            isNotNull(priceSubmissions.disputedSubmissionId),
            inArray(priceSubmissions.disputedSubmissionId, allSubIds),
          ),
        )
        .orderBy(desc(priceSubmissions.createdAt))
        .limit(1)

      if (counterRow) {
        let counterHandle: string | null = null
        if (counterRow.userId) {
          const [counterProfile] = await db
            .select({ handle: userProfiles.handle })
            .from(userProfiles)
            .where(eq(userProfiles.userId, counterRow.userId))
            .limit(1)
          counterHandle = counterProfile?.handle ?? null
        }
        counterSubmission = {
          id: counterRow.id,
          floor: parseFloat(counterRow.priceMin),
          ...(counterRow.priceMax !== null
            ? { ceiling: parseFloat(counterRow.priceMax) }
            : {}),
          submitter: counterHandle !== null ? { handle: counterHandle } : null,
          submittedAt: counterRow.createdAt.toISOString(),
        }
      }

      if (latestSub.userId) {
        const [profile] = await db
          .select({ handle: userProfiles.handle })
          .from(userProfiles)
          .where(eq(userProfiles.userId, latestSub.userId))
          .limit(1)
        priceSubmitterHandle = profile?.handle ?? null
      }
      priceAlternates = otherSubs.map((sub) => ({
        vendor: sub.vendor,
        priceMin: sub.priceMin,
        priceMax: sub.priceMax,
      }))
    }
  }

  // Surface all pending submissions when no corroborated price exists yet
  let pendingSubmissions: Array<{
    id: string
    priceMin: string
    priceMax: string | null
    tier: string
    vendor: string
    howFound: string
    note: string | null
    submitterHandle: string | null
    submittedAt: string
    confirmsCount: number
    confirmsNeeded: number
    isSubmitter: boolean
  }> | null = null

  if (row.ticketPriceMin === null && priceApprovalKind === null) {
    const pendingRows = await db
      .select({
        id: priceSubmissions.id,
        priceMin: priceSubmissions.priceMin,
        priceMax: priceSubmissions.priceMax,
        tier: priceSubmissions.tier,
        vendor: priceSubmissions.vendor,
        howFound: priceSubmissions.howFound,
        note: priceSubmissions.note,
        userId: priceSubmissions.userId,
        createdAt: priceSubmissions.createdAt,
      })
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.eventId, id),
          eq(priceSubmissions.status, 'pending'),
        ),
      )
      .orderBy(
        sql`CASE WHEN ${priceSubmissions.vendor} = 'VenueBoxOffice' THEN 0 ELSE 1 END ASC`,
        desc(priceSubmissions.createdAt),
      )

    if (pendingRows.length > 0) {
      // Batch confirm counts for all pending submissions
      const confirmCountRows = await db
        .select({
          submissionId: submissionConfirms.submissionId,
          total: count(),
        })
        .from(submissionConfirms)
        .where(
          inArray(
            submissionConfirms.submissionId,
            pendingRows.map((rpt) => rpt.id),
          ),
        )
        .groupBy(submissionConfirms.submissionId)

      const confirmCountMap = new Map(
        confirmCountRows.map((rpt) => [rpt.submissionId, rpt.total]),
      )

      // Batch submitter handles
      const userIds = pendingRows
        .map((rpt) => rpt.userId)
        .filter((uid): uid is string => uid !== null)
      const handleMap = new Map<string, string>()
      if (userIds.length > 0) {
        const profiles = await db
          .select({ userId: userProfiles.userId, handle: userProfiles.handle })
          .from(userProfiles)
          .where(inArray(userProfiles.userId, userIds))
        for (const profile of profiles) {
          if (profile.handle != null) {
            handleMap.set(profile.userId, profile.handle)
          }
        }
      }

      const eventDate = row.date ?? ''
      const diffDays = Math.floor(
        (new Date(eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
      const isEventImminent = diffDays >= 0 && diffDays <= 6
      const confirmsNeeded = isEventImminent ? 3 : 2

      pendingSubmissions = pendingRows.map((sub) => ({
        id: sub.id,
        priceMin: sub.priceMin,
        priceMax: sub.priceMax,
        tier: sub.tier,
        vendor: sub.vendor ?? 'Unknown',
        howFound: sub.howFound,
        note: sub.note ?? null,
        submitterHandle: sub.userId
          ? (handleMap.get(sub.userId) ?? null)
          : null,
        submittedAt: sub.createdAt.toISOString(),
        confirmsCount: confirmCountMap.get(sub.id) ?? 0,
        confirmsNeeded,
        isSubmitter: sub.userId === authInfo?.userId,
      }))
    }
  }

  return ctx.json({
    success: true,
    data: {
      ...row,
      watching: watchingCount,
      isWatching,
      priceStatus,
      priceVendor,
      priceSubmitterHandle,
      priceObservedAt,
      priceApprovalKind,
      priceApprovedAt,
      priceAlternates,
      priceConfirmsCount,
      counterSubmission,
      pendingSubmissions,
      soldOutReport,
    },
  })
})

// POST /v1/events/:id/watch — opt in to watching
eventsRouter.post('/:id/watch', clerkMiddleware(), async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const rawId = ctx.req.param('id')
  const parsed = uuidSchema.safeParse(rawId)
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Invalid event ID' }, 400)

  const eventId = parsed.data

  const [eventRow] = await db
    .select({ ticketPriceMin: events.ticketPriceMin })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1)

  if (!eventRow)
    return ctx.json({ success: false, error: 'Event not found' }, 404)

  const savedPrice = eventRow.ticketPriceMin ?? null

  try {
    await db
      .insert(userEvents)
      .values({
        userId: authInfo.userId,
        eventId,
        status: 'watching',
        savedPrice,
      })
      .onConflictDoUpdate({
        target: [userEvents.userId, userEvents.eventId],
        set: { status: 'watching', savedPrice },
      })
  } catch (err) {
    apiLogger.warn(
      { err, userId: authInfo.userId, eventId },
      'watch insert failed',
    )
    return ctx.json({ success: false, error: 'Failed to watch event' }, 500)
  }

  return ctx.json({ success: true, data: { watching: true } })
})

// DELETE /v1/events/:id/watch — opt out of watching
eventsRouter.delete('/:id/watch', clerkMiddleware(), async (ctx) => {
  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  const rawId = ctx.req.param('id')
  const parsed = uuidSchema.safeParse(rawId)
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Invalid event ID' }, 400)

  const eventId = parsed.data

  const [existing] = await db
    .select({ id: userEvents.id })
    .from(userEvents)
    .where(
      and(
        eq(userEvents.userId, authInfo.userId),
        eq(userEvents.eventId, eventId),
        eq(userEvents.status, 'watching'),
      ),
    )
    .limit(1)

  if (existing) {
    await db.delete(userEvents).where(eq(userEvents.id, existing.id))
  }

  return ctx.json({ success: true, data: { watching: false } })
})
