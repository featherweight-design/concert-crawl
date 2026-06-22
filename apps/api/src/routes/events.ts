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
import { SP_POLICY, type Tier } from '@concert-crawl/types'
import { isImminentEvent, todayInTimezone } from '../lib/time.js'
import { apiLogger } from '../lib/logger.js'
import { serviceOrClerkAuth } from '../middleware/auth.js'
import { aggregateByTier } from '../lib/price-aggregation/index.js'

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
    // PR 6 — hide events flagged "non-concert" from every consumer query.
    eq(events.hiddenFromConsumer, false),
    // Hide rows the crawler flagged as no longer visible on the venue page
    // (#607). The crawler clears firstMissingAt on the next successful
    // re-extraction (packages/crawler-core/src/crawl.ts:673-700), so any row
    // that genuinely re-appears becomes visible again automatically — no
    // manual intervention needed. Without this filter, every LLM artist-string
    // drift produces a visible dupe (BASS BINGO – Wooli Edition showed 3 rows
    // for one show on 2026-06-18).
    isNull(events.firstMissingAt),
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
      ticketLinks: events.ticketLinks,
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
  // first_missing_at IS NULL mirrors the list/detail filter — a genre tag
  // that only exists on stale rows should not appear in the filter chip
  // surface, otherwise users would pick a vibe and get zero results.
  const rows = await db.execute(
    sql`SELECT DISTINCT unnest(genre) AS genre FROM ${events} WHERE status = 'upcoming' AND first_missing_at IS NULL AND genre IS NOT NULL ORDER BY genre`,
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
      ticketLinks: events.ticketLinks,
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
    // isNull(firstMissingAt) mirrors the list-filter intent: if the crawler
    // stopped seeing this event, direct-link traffic from old emails / search
    // results should 404 rather than render a stale detail page. The crawler
    // clears the flag on re-extraction, so the row becomes reachable again
    // automatically if it returns to the venue's calendar. hiddenFromConsumer
    // is the parallel "non-concert" filter from PR 6.
    .where(
      and(
        eq(events.id, id),
        eq(events.hiddenFromConsumer, false),
        isNull(events.firstMissingAt),
      ),
    )

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
      // Raw confirm-row count — matches GET /v1/events/:id/reports so the
      // promoted soldOutReport surface stays consistent across endpoints.
      confirmsCount,
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
    parentSubmissionId: string
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
          parentSubmissionId: latestSub.id,
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
    sourceCategory: 'boxoffice' | 'standard' | 'resale' | null
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
        sourceCategory: priceSubmissions.sourceCategory,
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

      const confirmsNeeded = isImminentEvent(
        row.date ?? null,
        SP_POLICY.imminentThresholdDays,
      )
        ? SP_POLICY.confirmsRequiredImminent
        : SP_POLICY.confirmsRequired

      pendingSubmissions = pendingRows.map((sub) => ({
        id: sub.id,
        priceMin: sub.priceMin,
        priceMax: sub.priceMax,
        tier: sub.tier,
        vendor: sub.vendor ?? 'Unknown',
        howFound: sub.howFound,
        sourceCategory: sub.sourceCategory,
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

  // Per-tier price aggregation (PR 3). Always runs, even when no submissions
  // exist (emits []). Source-mix within tier, pending always surfaced per-tier
  // alongside any corroborated headline. The flat priceVendor / priceAlternates
  // / priceConfirmsCount / counterSubmission / pendingSubmissions fields above
  // stay populated for PR 4 to migrate off; the Contract PR drops them.
  const allCorroboratedRows = await db
    .select({
      id: priceSubmissions.id,
      tier: priceSubmissions.tier,
      priceMin: priceSubmissions.priceMin,
      priceMax: priceSubmissions.priceMax,
      vendor: priceSubmissions.vendor,
      sourceCategory: priceSubmissions.sourceCategory,
      userId: priceSubmissions.userId,
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

  const allPendingRows = await db
    .select({
      id: priceSubmissions.id,
      tier: priceSubmissions.tier,
      priceMin: priceSubmissions.priceMin,
      priceMax: priceSubmissions.priceMax,
      vendor: priceSubmissions.vendor,
      sourceCategory: priceSubmissions.sourceCategory,
      howFound: priceSubmissions.howFound,
      note: priceSubmissions.note,
      userId: priceSubmissions.userId,
      createdAt: priceSubmissions.createdAt,
      disputedSubmissionId: priceSubmissions.disputedSubmissionId,
    })
    .from(priceSubmissions)
    .where(
      and(
        eq(priceSubmissions.eventId, id),
        eq(priceSubmissions.status, 'pending'),
      ),
    )

  // Counter-submissions = pending rows that point at a corroborated parent.
  // They land on the headline's counterSubmission field rather than the tier's
  // pending list so the UI can show "Saw a different number?" against the
  // corroborated price without double-counting the dispute as a fresh pending.
  const corroboratedIdSet = new Set(allCorroboratedRows.map((sub) => sub.id))
  const counterTierRows = allPendingRows
    .filter(
      (sub) =>
        sub.disputedSubmissionId !== null &&
        corroboratedIdSet.has(sub.disputedSubmissionId),
    )
    .map((sub) => ({
      id: sub.id,
      parentSubmissionId: sub.disputedSubmissionId ?? '',
      tier: sub.tier,
      priceMin: sub.priceMin,
      priceMax: sub.priceMax,
      userId: sub.userId,
      createdAt: sub.createdAt,
    }))

  const truePendingRows = allPendingRows.filter(
    (sub) =>
      sub.disputedSubmissionId === null ||
      !corroboratedIdSet.has(sub.disputedSubmissionId),
  )

  // Batch handle lookups across every userId surfaced in any block.
  const aggregateUserIds = Array.from(
    new Set(
      [
        ...allCorroboratedRows.map((sub) => sub.userId),
        ...truePendingRows.map((sub) => sub.userId),
        ...counterTierRows.map((sub) => sub.userId),
      ].filter((uid): uid is string => uid !== null),
    ),
  )
  const aggregateHandles = new Map<string, string>()
  if (aggregateUserIds.length > 0) {
    const profileRows = await db
      .select({ userId: userProfiles.userId, handle: userProfiles.handle })
      .from(userProfiles)
      .where(inArray(userProfiles.userId, aggregateUserIds))
    for (const profileRow of profileRows) {
      if (profileRow.handle !== null) {
        aggregateHandles.set(profileRow.userId, profileRow.handle)
      }
    }
  }

  const aggregateSubIds = [
    ...allCorroboratedRows.map((sub) => sub.id),
    ...truePendingRows.map((sub) => sub.id),
  ]
  const confirmsBySubmissionId = new Map<string, number>()
  if (aggregateSubIds.length > 0) {
    const confirmCounts = await db
      .select({
        submissionId: submissionConfirms.submissionId,
        total: count(),
      })
      .from(submissionConfirms)
      .where(inArray(submissionConfirms.submissionId, aggregateSubIds))
      .groupBy(submissionConfirms.submissionId)
    for (const confirmRow of confirmCounts) {
      confirmsBySubmissionId.set(confirmRow.submissionId, confirmRow.total)
    }
  }

  // reports-per-tier = COUNT(*) over all price_submissions for this event,
  // grouped by tier. Includes corroborated + pending + counters + disputed
  // because every row is a "report" of a price at that tier.
  const reportRowsByTier = await db
    .select({
      tier: priceSubmissions.tier,
      total: count(),
    })
    .from(priceSubmissions)
    .where(eq(priceSubmissions.eventId, id))
    .groupBy(priceSubmissions.tier)
  const reportsByTier = new Map<Tier, number>()
  for (const reportRow of reportRowsByTier) {
    reportsByTier.set(reportRow.tier, reportRow.total)
  }

  const aggregateConfirmsNeeded = isImminentEvent(
    row.date ?? null,
    SP_POLICY.imminentThresholdDays,
  )
    ? SP_POLICY.confirmsRequiredImminent
    : SP_POLICY.confirmsRequired

  const priceByTier = aggregateByTier({
    corroborated: allCorroboratedRows.map((sub) => ({
      ...sub,
      confirmsCount: confirmsBySubmissionId.get(sub.id) ?? 0,
    })),
    pending: truePendingRows.map((sub) => ({
      id: sub.id,
      tier: sub.tier,
      priceMin: sub.priceMin,
      priceMax: sub.priceMax,
      vendor: sub.vendor,
      sourceCategory: sub.sourceCategory,
      howFound: sub.howFound,
      note: sub.note,
      userId: sub.userId,
      createdAt: sub.createdAt,
      confirmsCount: confirmsBySubmissionId.get(sub.id) ?? 0,
    })),
    counters: counterTierRows,
    handles: aggregateHandles,
    reportsByTier,
    confirmsNeeded: aggregateConfirmsNeeded,
    viewerUserId: authInfo?.userId ?? null,
  })

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
      priceByTier,
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
    .where(and(eq(events.id, eventId), eq(events.hiddenFromConsumer, false)))
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
