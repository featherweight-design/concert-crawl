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
import {
  SP_POLICY,
  deriveSourceCategory,
  type AvailabilityDay,
  type EventsAvailabilityResponse,
  type Tier,
} from '@concert-crawl/types'
import { isImminentEvent, todayInTimezone } from '../lib/time.js'
import { apiLogger } from '../lib/logger.js'
import { serviceOrClerkAuth } from '../middleware/auth.js'
import {
  aggregateByTier,
  pickHeadlinesByTier,
} from '../lib/price-aggregation/index.js'
import { narrowLastAdminAction } from '../lib/last-admin-action.js'

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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_WINDOW_DAYS = 400

const availabilitySchema = z.object({
  from: z.string().regex(DATE_RE).optional(),
  to: z.string().regex(DATE_RE),
})

function dayCountBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  return Math.floor((end - start) / 86_400_000) + 1
}

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
      supportingArtists: events.supportingArtists,
      tourName: events.tourName,
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

  // priceByTier on the browse list endpoint — closes issue #787 (browse chip
  // parity). The consumer EventCard now reads `event.priceByTier` directly
  // via `pickBrowseHeadline()`, which mirrors `pickTierHeadline` /
  // `compareTierRows` on the API side. This was the locked Browse table #7
  // sub-task — the legacy `resolveListChipKind(priceSource, priceVendor)`
  // fallback stays on EventCard for events the API doesn't surface
  // priceByTier for (defensive only — the list endpoint always populates it
  // now for events with at least one corroborated submission).
  //
  // Cost control: only `headline` is consumed by the browse chip, so we skip
  // the per-event side-table fetches (pending, counters, handles, reports)
  // that the /v1/events/:id endpoint runs. Each event row gets the same
  // TierPriceBlock shape with empty pending / counterSubmission arrays. The
  // SELECT below pulls priceSubmissions.corroborationCount so confirmsCount
  // can be derived per-row (submitter counts as observation #1 → the count
  // we surface is `max(0, corroborationCount - 1)`). Without that derivation
  // buildHeadline mislabels every fan-corroborated browse row as
  // approvalKind='admin'.
  const visibleEventIds = rows.map((row) => row.id)
  const priceByTierByEventId = new Map<
    string,
    Awaited<ReturnType<typeof aggregateByTier>>
  >()
  if (visibleEventIds.length > 0) {
    const corroboratedListRows = await db
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

    // Group by eventId so aggregateByTier sees only this event's corroborated
    // rows; pending + counters are intentionally empty to keep the browse
    // endpoint cheap (per the comment block above).
    const corroboratedByEvent = new Map<string, typeof corroboratedListRows>()
    for (const sub of corroboratedListRows) {
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
          // Legacy corroborated rows may have sourceCategory === null
          // (PR 3 backfill predated the column). Infer using the shared
          // deriveSourceCategory helper so a box-office row (vendor =
          // VenueBoxOffice or howFound = at_the_venue) doesn't get
          // mislabeled as 'standard' on the browse chip — same drift
          // we caught on the consumer edit-flow side (Copilot R9).
          sourceCategory:
            sub.sourceCategory ??
            deriveSourceCategory(sub.vendor, sub.howFound),
          userId: sub.userId,
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
          // confirmsCount excludes the submitter (who counts as observation #1
          // per the price_submissions.corroboration_count schema comment).
          // Without this derivation buildHeadline would compute approvalKind
          // as 'admin' for every list row, which is wrong for fan-corroborated
          // submissions and leaks into any consumer that starts reading the
          // richer priceByTier payload.
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

  const enrichedRows = rows.map((row) => ({
    ...row,
    priceVendor:
      row.priceSource === 'community'
        ? (vendorByEventId[row.id] ?? null)
        : null,
    priceByTier: priceByTierByEventId.get(row.id) ?? null,
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

// GET /v1/events/availability — per-date show counts for a bounded window.
// Registered AFTER /genres and BEFORE /:id so the `/:id` param route does not
// swallow the literal `/availability` path. Projection-only GROUP BY date query
// backed by events_date_status_idx (date, status).
eventsRouter.get('/availability', async (ctx) => {
  const parsed = availabilitySchema.safeParse({
    from: ctx.req.query('from'),
    to: ctx.req.query('to'),
  })
  if (!parsed.success) {
    return ctx.json({ error: 'Invalid availability window' }, 400)
  }
  const from = parsed.data.from ?? todayInTimezone('UTC')
  const { to } = parsed.data
  if (to < from) {
    return ctx.json({ error: '`to` must be on or after `from`' }, 400)
  }
  const span = dayCountBetween(from, to)
  if (span < 1 || span > MAX_WINDOW_DAYS) {
    return ctx.json({ error: 'Window must be 1–400 days' }, 400)
  }

  const rows = await db
    .select({ date: events.date, count: count() })
    .from(events)
    .where(
      and(
        inArray(events.status, ['upcoming', 'cancelled', 'postponed']),
        gte(events.date, from),
        lte(events.date, to),
        eq(events.hiddenFromConsumer, false),
        isNull(events.firstMissingAt),
      ),
    )
    .groupBy(events.date)

  const data: AvailabilityDay[] = rows.map((row) => ({
    date: row.date,
    count: Number(row.count),
  }))

  ctx.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  const body: EventsAvailabilityResponse = { data, from, to }
  return ctx.json(body)
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
      supportingArtists: events.supportingArtists,
      tourName: events.tourName,
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

  // Flat-field declarations — populated below from the same in-memory data
  // that feeds priceByTier so the two payload shapes can't drift. The flat
  // fields are deprecated; PR 4 migrates the consumer UI to priceByTier and
  // the Contract PR drops them.
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
    // Engagement-signal fields mirror priceByTier[].counterSubmission so the
    // flat + per-tier shapes stay in lock-step during PR 4's migration window.
    // 'defer' is the only kind we surface to consumers today.
    lastAdminActionAt: string | null
    lastAdminActionKind: 'defer' | null
  } | null = null

  // Per-tier price aggregation (PR 3) and the flat priceVendor/priceAlternates/
  // priceConfirmsCount/counterSubmission/pendingSubmissions fields share the
  // same corroborated + pending data. Running the queries once and deriving
  // both shapes from the in-memory rows avoids duplicate DB work and keeps
  // the two payloads from drifting (an issue Copilot flagged in PR 723 r3).
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
      // Engagement-signal columns surfaced on counter rows via
      // counterSubmission.lastAdminActionAt/Kind. Read here so the same
      // allPendingRows scan feeds both priceByTier (via counterTierRows)
      // and the flat counterSubmission shape without a second query.
      lastAdminActionAt: priceSubmissions.lastAdminActionAt,
      lastAdminActionKind: priceSubmissions.lastAdminActionKind,
    })
    .from(priceSubmissions)
    .where(
      and(
        eq(priceSubmissions.eventId, id),
        eq(priceSubmissions.status, 'pending'),
      ),
    )

  // Counter-submissions = pending rows that point at a corroborated parent
  // AT THE SAME TIER. Tier match is required so a dispute that landed under a
  // different tier (legacy data, or future relaxation of the dispute schema)
  // doesn't get hidden — it stays in pendingSubmissions where the user can
  // see it. Counters surface on the headline's counterSubmission field
  // instead of the tier's pending list so the UI shows "Saw a different
  // number?" against the corroborated price without double-counting.
  //
  // Counters are sorted newest-first so when multiple disputes exist against
  // the same headline, the most recent challenger wins deterministically.
  const corroboratedById = new Map(
    allCorroboratedRows.map((sub) => [sub.id, sub]),
  )
  const counterTierRows = allPendingRows
    .flatMap((sub) => {
      const parentId = sub.disputedSubmissionId
      if (parentId === null) return []
      const parent = corroboratedById.get(parentId)
      if (!parent || parent.tier !== sub.tier) return []
      return [
        {
          id: sub.id,
          parentSubmissionId: parentId,
          tier: sub.tier,
          priceMin: sub.priceMin,
          priceMax: sub.priceMax,
          userId: sub.userId,
          createdAt: sub.createdAt,
          lastAdminActionAt: sub.lastAdminActionAt,
          lastAdminActionKind: sub.lastAdminActionKind,
        },
      ]
    })
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())

  // Resolve the per-tier headlines AND the legacy flat-field primary so both
  // the truePendingRows filter and the flat-field derivation below share a
  // single source of truth for "which corroborated row leads".
  const headlinesByTier = pickHeadlinesByTier(allCorroboratedRows)

  // Legacy vendor-trust ordering preserved for the flat priceVendor /
  // priceAlternates / counterSubmission shape during the PR 4 migration
  // window. May pick a different "primary" than any per-tier headline does.
  const isCommunityPriced =
    row.priceSource === 'community' && allCorroboratedRows.length > 0
  const legacySortedCorroborated = isCommunityPriced
    ? [...allCorroboratedRows].sort((left, right) => {
        const trust = (vendor: string): number => {
          if (vendor === 'VenueBoxOffice') return 0
          if (vendor === 'SeatGeek') return 2
          return 1
        }
        const trustDelta = trust(left.vendor) - trust(right.vendor)
        if (trustDelta !== 0) return trustDelta
        return right.createdAt.getTime() - left.createdAt.getTime()
      })
    : []
  const legacyPrimary = legacySortedCorroborated[0] ?? null

  // truePendingRows excludes ONLY the counter rows that actually surface
  // somewhere via counterSubmission — either as the flat-field counter
  // (legacy primary's newest counter) or as a per-tier headline's counter
  // inside priceByTier. Every other dispute row stays in pending so it
  // remains visible to the user.
  //
  // Without this discipline, older counters against the same headline and
  // counters against alternate (non-headline) corroborated rows would
  // disappear from both pendingSubmissions and priceByTier[].pending — the
  // PR 723 audit caught exactly this regression.
  const attachedCounterIds = new Set<string>()
  for (const [tier, head] of headlinesByTier) {
    const newest = counterTierRows.find(
      (sub) => sub.tier === tier && sub.parentSubmissionId === head.id,
    )
    if (newest) attachedCounterIds.add(newest.id)
  }
  if (legacyPrimary) {
    const flatCounter = counterTierRows.find(
      (sub) => sub.parentSubmissionId === legacyPrimary.id,
    )
    if (flatCounter) attachedCounterIds.add(flatCounter.id)
  }

  const truePendingRows = allPendingRows.filter(
    (sub) => !attachedCounterIds.has(sub.id),
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

  // Flat-field derivation for community-priced events — preserves the legacy
  // vendor-trust ordering (boxoffice=0, SeatGeek=2, else=1, then createdAt
  // desc) so existing consumers keep getting the same priceVendor / priceAlternates
  // / counterSubmission shape during the PR 4 migration window. Reads from
  // the in-memory allCorroboratedRows + side-tables that priceByTier also
  // consumes, so the two payload shapes share a single source of truth.
  if (legacyPrimary) {
    const otherSubs = legacySortedCorroborated.slice(1)
    priceVendor = legacyPrimary.vendor
    priceObservedAt = legacyPrimary.createdAt.toISOString()
    priceApprovedAt = legacyPrimary.updatedAt.toISOString()
    priceConfirmsCount = confirmsBySubmissionId.get(legacyPrimary.id) ?? 0
    priceApprovalKind = priceConfirmsCount > 0 ? 'fan' : 'admin'
    priceSubmitterHandle =
      legacyPrimary.userId !== null
        ? (aggregateHandles.get(legacyPrimary.userId) ?? null)
        : null
    priceAlternates = otherSubs.map((sub) => ({
      vendor: sub.vendor,
      priceMin: sub.priceMin,
      priceMax: sub.priceMax,
    }))

    // counterTierRows is sorted newest-first and filtered to tier-match
    // counters. Pick the newest counter whose parent is the legacy primary.
    const counter = counterTierRows.find(
      (sub) => sub.parentSubmissionId === legacyPrimary.id,
    )
    if (counter) {
      const counterHandle =
        counter.userId !== null
          ? (aggregateHandles.get(counter.userId) ?? null)
          : null
      const counterCeiling =
        counter.priceMax !== null ? parseFloat(counter.priceMax) : null
      // Pair-narrow kind + at together — same defensive treatment as
      // buildCounter in aggregate-by-tier.ts and the contest detail
      // endpoint so the flat + per-tier shapes can't drift on an
      // unrecognized kind and consumers never see a half-populated pair.
      // Helper in apps/api/src/lib/last-admin-action.ts.
      const counterLastAction = narrowLastAdminAction(
        counter.lastAdminActionKind,
        counter.lastAdminActionAt,
      )
      counterSubmission = {
        id: counter.id,
        parentSubmissionId: counter.parentSubmissionId,
        floor: parseFloat(counter.priceMin),
        ...(counterCeiling !== null ? { ceiling: counterCeiling } : {}),
        submitter: counterHandle !== null ? { handle: counterHandle } : null,
        submittedAt: counter.createdAt.toISOString(),
        lastAdminActionAt: counterLastAction.at,
        lastAdminActionKind: counterLastAction.kind,
      }
    }
  }

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

  // Flat pendingSubmissions field — derived from the same truePendingRows /
  // handles / confirms side-tables as priceByTier so the two payload shapes
  // can't drift, and counter rows surfaced via counterSubmission /
  // priceByTier.counterSubmission don't double-appear here. Kept on the
  // response for PR 4 to migrate consumers off; the Contract PR removes it.
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

  if (truePendingRows.length > 0) {
    // VenueBoxOffice-first, then newest-first — mirrors the legacy ordering
    // so the consumer surface is stable during PR 4's migration window.
    const ordered = [...truePendingRows].sort((left, right) => {
      const leftBox = left.vendor === 'VenueBoxOffice' ? 0 : 1
      const rightBox = right.vendor === 'VenueBoxOffice' ? 0 : 1
      if (leftBox !== rightBox) return leftBox - rightBox
      return right.createdAt.getTime() - left.createdAt.getTime()
    })
    pendingSubmissions = ordered.map((sub) => ({
      id: sub.id,
      priceMin: sub.priceMin,
      priceMax: sub.priceMax,
      tier: sub.tier,
      vendor: sub.vendor ?? 'Unknown',
      howFound: sub.howFound,
      sourceCategory: sub.sourceCategory,
      note: sub.note ?? null,
      submitterHandle:
        sub.userId !== null ? (aggregateHandles.get(sub.userId) ?? null) : null,
      submittedAt: sub.createdAt.toISOString(),
      confirmsCount: confirmsBySubmissionId.get(sub.id) ?? 0,
      confirmsNeeded: aggregateConfirmsNeeded,
      isSubmitter: sub.userId === authInfo?.userId,
    }))
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
      priceByTier,
      soldOutReport,
    },
  })
})

// GET /v1/events/:id/related — slim list of other upcoming events at the same
// venue. Keyed by event id (not venue slug) so the consumer event detail page
// can fetch related shows in parallel with /v1/events/:id and
// /v1/events/:id/reports rather than waiting on a serial round-trip to resolve
// the venue slug first (#833).
//
// Payload is intentionally slim:
//   - same columns as the public list endpoint (so EventCard can render),
//   - BUT no priceByTier aggregation. The per-tier batch query is O(events ×
//     submissions) and is the dominant cost on Red Rocks-sized venues
//     (148 events × N submissions per event). The related panel only needs
//     the basic card chrome; EventCard's legacy chip fallback (ticketPriceMin
//     + priceSource + priceVendor) renders correctly without priceByTier.
//
// Returns up to 3 events excluding the source event, ordered by date asc.
eventsRouter.get('/:id/related', async (ctx) => {
  const rawId = ctx.req.param('id')
  const parsed = uuidSchema.safeParse(rawId)
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Event not found' }, 404)
  const eventId = parsed.data

  const [sourceEvent] = await db
    .select({ venueId: events.venueId })
    .from(events)
    .where(
      and(
        eq(events.id, eventId),
        eq(events.hiddenFromConsumer, false),
        isNull(events.firstMissingAt),
      ),
    )
    .limit(1)

  if (!sourceEvent || sourceEvent.venueId === null) {
    // venueId is nullable on the events row (draft events or admin-entered
    // rows pending venue assignment). Without a venue we have nothing to
    // group related shows by — treat the same as "not found" rather than
    // returning every venueless event in the system.
    return ctx.json({ success: false, error: 'Event not found' }, 404)
  }

  // Slim same-venue query — mirrors the list endpoint shape but skips the
  // priceByTier batch + the price_submissions-based priceVendor lookup
  // the list endpoint runs. The related panel's EventCard renders without
  // the vendor pill (priceVendor is intentionally undefined here) and
  // falls back to the ticketPriceMin/priceSource fields that ARE on the
  // events row. Keeping the related payload slim is the whole point —
  // the panel is decorative, not the primary price surface.
  const relatedConditions: SQL[] = [
    eq(events.venueId, sourceEvent.venueId),
    inArray(events.status, ['upcoming', 'cancelled', 'postponed']),
    gte(events.date, todayInTimezone('UTC')),
    eq(events.hiddenFromConsumer, false),
    isNull(events.firstMissingAt),
    sql`${events.id} != ${eventId}`,
  ]

  const relatedRows = await db
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
    .where(and(...relatedConditions))
    .orderBy(asc(events.date), asc(events.showTime))
    .limit(3)

  return ctx.json({ success: true, data: { data: relatedRows } })
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
