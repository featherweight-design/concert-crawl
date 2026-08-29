import { Hono } from 'hono'
import type { Context } from 'hono'
import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  db,
  artists,
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
  upcomingEventConditions,
  SCHEDULED_STATUSES,
} from '@concert-crawl/db/upcoming-events'
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
  RESALE_VENDOR_VALUES,
  bucketsPresentIn,
  expandBucket,
  vendorTrustRank,
  type AvailabilityDay,
  type EventsAvailabilityResponse,
  type PlanState,
  type SourceCategory,
  type Tier,
} from '@concert-crawl/types'
import { followedArtistsCondition } from '../lib/artist-follows.js'
import { resolveArtistSlugs } from '../lib/artist-slugs.js'
import { getEventWatchers } from '../lib/event-watchers.js'
import { isImminentEvent, todayInTimezone } from '../lib/time.js'
import { apiLogger } from '../lib/logger.js'
import {
  aggregateByTier,
  deriveObservedAt,
  loadPriceByTierByEventId,
  pickHeadlinesByTier,
} from '../lib/price-aggregation/index.js'
import { narrowLastAdminAction } from '../lib/last-admin-action.js'
import {
  getFollowedArtistMatcher,
  spotifyTasteCondition,
} from '../lib/spotify-matches.js'
import { canUseFeature } from '@concert-crawl/entitlements'
import { loadPlanState } from '../lib/plan.js'
import { ENTITLEMENT_REQUIRED_CODE } from '../middleware/entitlement.js'
import { parseGenreRows } from '../lib/parse-genre-rows.js'
import { releaseWatch } from '../lib/user-events.js'

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
  // Taste filter (#763 PR 7, §9.3) — presence flag; only '1' is valid so a
  // tampered value fails validation instead of silently passing unfiltered.
  taste: z.literal('1').optional(),
  // "My artists" scope filter (native following, §7.1) — same presence-flag
  // shape as `taste`, for the same reason.
  following: z.literal('1').optional(),
})

// Shape of the custom claims added by our Clerk JWT template — same contract
// as middleware/entitlement.ts: only extract `metadata`, loadPlanState owns
// validating its contents.
const listClaimsSchema = z.object({
  metadata: z.unknown(),
})

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_WINDOW_DAYS = 400
const MT_TIME_ZONE = 'America/Denver'

// Regex alone accepts impossible calendar dates (e.g. 2026-02-31), which
// Date.parse silently rolls over to a different day rather than rejecting.
// Require the date to round-trip so the window can't be quietly widened.
const isRealDate = (value: string): boolean => {
  const parsed = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  )
}

const availabilitySchema = z.object({
  from: z.string().regex(DATE_RE).refine(isRealDate).optional(),
  to: z.string().regex(DATE_RE).refine(isRealDate),
})

function dayCountBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  return Math.floor((end - start) / 86_400_000) + 1
}

export const eventsRouter = new Hono()

// GET /v1/events — public event listing with filters and pagination.
// clerkMiddleware() verifies any bearer JWT locally (no network/DB cost) so
// signed-in requests can opt into the followedArtists overlay; anonymous
// requests pass straight through and skip every per-user query.
eventsRouter.get(
  '/',
  clerkMiddleware(),
  zValidator('query', listEventsSchema),
  async (ctx) => {
    const {
      from,
      to,
      venueSlug,
      search,
      limit,
      offset,
      filterPrice,
      filterVibe,
      taste,
      following,
    } = ctx.req.valid('query')

    // Resolved up front (getAuth is a local JWT read — no network/DB cost)
    // because the scope gates below need it before any query runs; the
    // followedArtists overlay after the queries reuses the same value.
    const listAuth = getAuth(ctx)

    // ── Scope-flag gates ───────────────────────────────────────────────────
    // Run before ANY other filter so an unknown venueSlug can't short-circuit
    // to a 200 and hide a 401/403 the client needs to route on.
    //
    // taste=1 (#763 PR 7, §9.3) narrows the list to events matching the
    // viewer's Spotify-sourced follow rows. following=1 (native following,
    // §7.1) does the same over follow rows of EVERY source. Both are
    // entitlement-gated inline — this route is public, so requireFeature can't
    // mount route-wide: anonymous → 401, a plan without the feature → 403 with
    // the same typed body the middleware emits, so the web client's
    // locked-surface routing works identically. An entitled viewer with zero
    // matching rows gets an empty 200 (the EXISTS matches nothing).
    //
    // Both flags can arrive together, so plan state is resolved at most once.
    const scopeConditions: SQL[] = []
    let cachedPlanState: PlanState | null = null
    const listPlanState = async (userId: string): Promise<PlanState> => {
      if (cachedPlanState) return cachedPlanState
      const claims = listClaimsSchema.safeParse(listAuth?.sessionClaims)
      const metadata = claims.success ? claims.data.metadata : undefined
      cachedPlanState = await loadPlanState(userId, metadata)
      return cachedPlanState
    }

    if (taste) {
      if (!listAuth?.userId) {
        return ctx.json({ success: false, error: 'Unauthorized' }, 401)
      }
      const planState = await listPlanState(listAuth.userId)
      if (!canUseFeature(planState, 'spotify-sync')) {
        apiLogger.debug(
          { userId: listAuth.userId, plan: planState.plan },
          'taste filter entitlement denied',
        )
        return ctx.json(
          {
            success: false,
            error: 'This feature requires an upgraded plan',
            code: ENTITLEMENT_REQUIRED_CODE,
            feature: 'spotify-sync',
          },
          403,
        )
      }
      scopeConditions.push(spotifyTasteCondition(listAuth.userId))
    }

    if (following) {
      if (!listAuth?.userId) {
        return ctx.json({ success: false, error: 'Unauthorized' }, 401)
      }
      const planState = await listPlanState(listAuth.userId)
      if (!canUseFeature(planState, 'following')) {
        apiLogger.debug(
          { userId: listAuth.userId, plan: planState.plan },
          'following filter entitlement denied',
        )
        return ctx.json(
          {
            success: false,
            error: 'This feature requires an upgraded plan',
            code: ENTITLEMENT_REQUIRED_CODE,
            feature: 'following',
          },
          403,
        )
      }
      scopeConditions.push(followedArtistsCondition(listAuth.userId))
    }

    // The scope banner is a `role="status"` announcement, so it must never
    // claim a filter that did not apply. Reaching here means the flag survived
    // both gates; a rejected flag returned 401/403 above and the client renders
    // the locked surface instead.
    const followingApplied = Boolean(following)

    // Without the firstMissingAt filter, every LLM artist-string drift produces
    // a visible dupe (BASS BINGO – Wooli Edition showed 3 rows for one show on
    // 2026-06-18).
    const conditions: SQL[] = upcomingEventConditions({
      from: from ?? todayInTimezone('UTC'),
      statuses: SCHEDULED_STATUSES,
    })

    // Shared conditions array — the EXISTS applies to both the count and row
    // queries, so `total` reflects the filtered set.
    conditions.push(...scopeConditions)

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
          data: { data: [], total: 0, limit, offset, followingApplied },
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
              ? and(
                  isNull(events.ticketPriceMin),
                  isNull(events.ticketPriceMax),
                )
              : undefined

    if (priceCondition) conditions.push(priceCondition)

    if (filterVibe) {
      // Bucket taxonomy (#1101): a filterVibe value like 'electronic' expands
      // to every sub-genre in the bucket so picking one label surfaces the
      // whole family (house / dubstep / bass / ...). Unknown values fall
      // through as a single-element array so bookmarked ?filterVibe=dubstep
      // URLs from before this shipped still match exactly.
      const genreValues = expandBucket(filterVibe)
      const genrePlaceholders = sql.join(
        genreValues.map((genre) => sql`${genre}`),
        sql`, `,
      )
      conditions.push(
        sql`${events.genre} && ARRAY[${genrePlaceholders}]::text[]`,
      )
    }

    const where = and(...conditions)

    const countResult = await db
      .select({ total: count() })
      .from(events)
      .innerJoin(
        venues,
        and(eq(events.venueId, venues.id), eq(venues.active, true)),
      )
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
        eventUrl: events.eventUrl,
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
        // Canonical name columns feed the followedArtists overlay below and
        // are stripped from the response payload — matching happens on the
        // canonical form (§9.1), display happens with the follow row's name.
        canonicalArtist: events.canonicalArtist,
        canonicalHeadliners: events.canonicalHeadliners,
        canonicalSupporting: events.canonicalSupporting,
        artistPhotoUrl: artists.photoUrl,
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
      .innerJoin(
        venues,
        and(eq(events.venueId, venues.id), eq(venues.active, true)),
      )
      // Headliner portrait. There is no event_artists table and no foreign
      // key: `artists` is a projection keyed on canonicalName, which carries a
      // unique index. That index is what keeps this join cardinality-preserving
      // — drop it and every event row with a duplicated canonical name fans out
      // silently, past the pagination count that does not join here.
      .leftJoin(artists, eq(events.canonicalArtist, artists.canonicalName))
      .where(where)
      .orderBy(asc(events.date), asc(events.showTime))
      .limit(limit)
      .offset(offset)

    // followedArtists overlay (#763 PR 6, §9.2): one extra query for any
    // signed-in viewer with results (the matcher must load Spotify-sourced
    // follow names to decide presence); anonymous and empty-page requests
    // skip it entirely, so the public path cost is unchanged.
    const followMatcher =
      listAuth?.userId && rows.length > 0
        ? await getFollowedArtistMatcher(listAuth.userId)
        : null

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
          sql`CASE WHEN ${priceSubmissions.vendor} = 'VenueBoxOffice' THEN 0 WHEN ${inArray(priceSubmissions.vendor, RESALE_VENDOR_VALUES)} THEN 2 ELSE 1 END ASC`,
          desc(priceSubmissions.createdAt),
        )

      for (const vRow of vendorRows) {
        if (!(vRow.eventId in vendorByEventId)) {
          vendorByEventId[vRow.eventId] = vRow.vendor
        }
      }
    }
    // priceByTier on the browse list endpoint — closes issue #787 (browse chip
    // parity). The consumer EventCard reads `event.priceByTier` directly via
    // `pickBrowseHeadline()`, which mirrors `pickTierHeadline` /
    // `compareTierRows` on the API side. The legacy
    // `resolveListChipKind(priceSource, priceVendor)` fallback stays on
    // EventCard for events the API doesn't surface priceByTier for (defensive
    // only — the list endpoint always populates it for events with at least
    // one corroborated submission).
    const priceByTierByEventId = await loadPriceByTierByEventId(
      rows.map((row) => row.id),
    )

    const enrichedRows = rows.map((row) => {
      const {
        canonicalArtist,
        canonicalHeadliners,
        canonicalSupporting,
        ...publicRow
      } = row
      return {
        ...publicRow,
        priceVendor:
          row.priceSource === 'community'
            ? (vendorByEventId[row.id] ?? null)
            : null,
        priceByTier: priceByTierByEventId.get(row.id) ?? null,
        ...(followMatcher
          ? {
              followedArtists: followMatcher.matchEvent({
                canonicalArtist,
                canonicalHeadliners,
                canonicalSupporting,
              }),
            }
          : {}),
      }
    })

    return ctx.json({
      success: true,
      data: { data: enrichedRows, total, limit, offset, followingApplied },
    })
  },
)

// GET /v1/events/genres — bucket labels present across all upcoming events.
//
// Prod carries ~85 distinct LLM-extracted genre strings; surfacing them all
// in the Vibe filter dropdown is unusable. We collapse the observed raw
// genres to the bucket taxonomy in @concert-crawl/types and return only the
// bucket labels that have at least one matching row. Unbucketed long-tail
// values ('ceremony', '<UNKNOWN>', film scores) are dropped from the filter
// surface — they remain searchable, they just don't clutter the dropdown.
//
// first_missing_at IS NULL mirrors the list/detail filter so a genre tag
// that only exists on stale rows never appears in the filter surface —
// otherwise users would pick a vibe and get zero results.
//
// Row-shape parsing + the drop-signal (apiLogger.warn + Sentry.captureMessage
// tagged `genres_parse_drop`) live in lib/parse-genre-rows so the drop-path
// is unit-testable without mocking the ORM (#1108).
eventsRouter.get('/genres', async (ctx) => {
  const rows = await db.execute(
    sql`SELECT DISTINCT unnest(genre) AS genre FROM ${events} WHERE status = 'upcoming' AND first_missing_at IS NULL AND genre IS NOT NULL`,
  )
  const rawGenres = parseGenreRows(rows)
  return ctx.json({ success: true, data: bucketsPresentIn(rawGenres) })
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
    return ctx.json(
      { success: false, error: 'Invalid availability window' },
      400,
    )
  }
  // events.date holds event-local (Mountain Time) calendar dates, so default
  // the window start to today in MT — not UTC. During MT evening UTC has already
  // rolled to tomorrow, which would drop same-day shows from the calendar.
  const from = parsed.data.from ?? todayInTimezone(MT_TIME_ZONE)
  const { to } = parsed.data
  if (to < from) {
    return ctx.json(
      { success: false, error: '`to` must be on or after `from`' },
      400,
    )
  }
  const span = dayCountBetween(from, to)
  if (span < 1 || span > MAX_WINDOW_DAYS) {
    return ctx.json({ success: false, error: 'Window must be 1–400 days' }, 400)
  }

  const rows = await db
    .select({ date: events.date, count: count() })
    .from(events)
    .where(
      and(
        ...upcomingEventConditions({ from, statuses: SCHEDULED_STATUSES }),
        lte(events.date, to),
      ),
    )
    .groupBy(events.date)
    // A bare GROUP BY leaves row order up to the planner; sort ascending so the
    // response is stable and self-describing regardless of Postgres plan.
    .orderBy(asc(events.date))

  const data: AvailabilityDay[] = rows.map((row) => ({
    date: row.date,
    count: Number(row.count),
  }))

  ctx.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  const body: EventsAvailabilityResponse = { data, from, to }
  return ctx.json({ success: true, data: body })
})

// Both '/:id' and '/:id/related' take optional auth and answer differently for
// a signed-in caller (isWatching). Vary tells any shared cache the two answers
// are distinct; no-store keeps the authed one out of such a cache entirely.
// Anonymous responses stay cacheable, which is the whole point of the split —
// the browse-adjacent surfaces are the cache's main beneficiary.
function markViewerScoped(ctx: Context, isAuthed: boolean): void {
  // Appended, not set: CORS contributes its own Vary, and replacing the header
  // would drop that and make a shared cache key on the wrong axis.
  ctx.header('Vary', 'Authorization', { append: true })
  if (isAuthed) ctx.header('Cache-Control', 'private, no-store')
}

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
      eventUrl: events.eventUrl,
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
      // Feed the followedArtists overlay; stripped from the response below.
      canonicalArtist: events.canonicalArtist,
      canonicalHeadliners: events.canonicalHeadliners,
      canonicalSupporting: events.canonicalSupporting,
      // #764 — only whether the venue's first-timer guide is published. The
      // guide body itself lives on GET /v1/venues/:slug; the event page just
      // needs to know whether the chip has anywhere to point. Stripped from the
      // response below in favour of the boolean.
      venueGuidePublishedAt: venues.guidePublishedAt,
      artistPhotoUrl: artists.photoUrl,
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
    .innerJoin(
      venues,
      and(eq(events.venueId, venues.id), eq(venues.active, true)),
    )
    .leftJoin(artists, eq(events.canonicalArtist, artists.canonicalName))
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
  let attendingAt: string | null = null
  if (authInfo?.userId) {
    // No status filter: the shared user_events row may carry attendance only
    // (#70), and one read answers both questions.
    const [trackRow] = await db
      .select({
        status: userEvents.status,
        attendingAt: userEvents.attendingAt,
      })
      .from(userEvents)
      .where(
        and(eq(userEvents.userId, authInfo.userId), eq(userEvents.eventId, id)),
      )
      .limit(1)
    isWatching = trackRow?.status === 'watching'
    attendingAt = trackRow?.attendingAt?.toISOString() ?? null
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
  let priceSourceCategory: SourceCategory | null = null
  let priceSubmitterHandle: string | null = null
  let priceObservedAt: string | null = null
  // The submission the flat fields describe. Must come off `legacyPrimary`,
  // never off priceByTier[0]: the two use different orderings (see the comment
  // on legacySortedCorroborated below), so taking the id from the tier
  // headline while the timestamp comes from here would name one row and stamp
  // another. Null whenever priceObservedAt is null — they travel together.
  let priceSubmissionId: string | null = null

  let priceApprovalKind: 'admin' | 'fan' | null = null
  let priceApprovedAt: string | null = null
  let priceAlternates: Array<{
    vendor: string | null
    priceMin: string
    priceMax: string | null
    sourceCategory: SourceCategory | null
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
      lastSeenAt: priceSubmissions.lastSeenAt,
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
        const trustDelta =
          vendorTrustRank(left.vendor) - vendorTrustRank(right.vendor)
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
  // vendor-trust ordering (boxoffice=0, resale=2, else=1, then createdAt
  // desc) so existing consumers keep getting the same priceVendor / priceAlternates
  // / counterSubmission shape during the PR 4 migration window. Reads from
  // the in-memory allCorroboratedRows + side-tables that priceByTier also
  // consumes, so the two payload shapes share a single source of truth.
  if (legacyPrimary) {
    const otherSubs = legacySortedCorroborated.slice(1)
    priceVendor = legacyPrimary.vendor
    priceSourceCategory = legacyPrimary.sourceCategory
    priceObservedAt = deriveObservedAt(
      legacyPrimary.lastSeenAt,
      legacyPrimary.createdAt,
    ).toISOString()
    priceSubmissionId = legacyPrimary.id
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
      sourceCategory: sub.sourceCategory,
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

  // followedArtists overlay (#763 PR 6, §9.2) — one extra query for any
  // signed-in viewer (the matcher loads Spotify-sourced follow names to
  // decide presence); anonymous requests skip it, and the field is omitted
  // when no Spotify follow rows exist.
  const followMatcher = authInfo?.userId
    ? await getFollowedArtistMatcher(authInfo.userId)
    : null

  // #1115 PR-G — slugs for the artist-page links on the detail title block.
  const { artistSlug, supportingArtistSlugs } = await resolveArtistSlugs(
    row.artist,
    row.supportingArtists,
  )

  const {
    canonicalArtist,
    canonicalHeadliners,
    canonicalSupporting,
    venueGuidePublishedAt,
    ...publicRow
  } = row

  markViewerScoped(ctx, authInfo?.userId != null)
  return ctx.json({
    success: true,
    data: {
      ...publicRow,
      artistSlug,
      supportingArtistSlugs,
      venueGuidePublished: venueGuidePublishedAt !== null,
      ...(followMatcher
        ? {
            followedArtists: followMatcher.matchEvent({
              canonicalArtist,
              canonicalHeadliners,
              canonicalSupporting,
            }),
          }
        : {}),
      watching: watchingCount,
      isWatching,
      attendingAt,
      priceStatus,
      priceVendor,
      priceSourceCategory,
      priceSubmitterHandle,
      priceObservedAt,
      priceSubmissionId,
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
// Optional auth, matching the sibling '/:id' handler: signed-out callers get the
// same panel, minus the per-row watch state.
eventsRouter.get('/:id/related', clerkMiddleware(), async (ctx) => {
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
    ...upcomingEventConditions({
      from: todayInTimezone('UTC'),
      statuses: SCHEDULED_STATUSES,
    }),
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
      // eventUrl and pipelineExhaustedAt are required on the shared Event
      // interface, so omitting them here made the response a lie about its own
      // type. Slim means no side-table aggregation, not missing base columns.
      eventUrl: events.eventUrl,
      ticketPriceMin: events.ticketPriceMin,
      ticketPriceMax: events.ticketPriceMax,
      priceSource: events.priceSource,
      pipelineExhaustedAt: events.pipelineExhaustedAt,
      description: events.description,
      imageUrl: events.imageUrl,
      genre: events.genre,
      status: events.status,
      confidenceScore: events.confidenceScore,
      verified: events.verified,
      sourceUrl: events.sourceUrl,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
      artistPhotoUrl: artists.photoUrl,
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
    .innerJoin(
      venues,
      and(eq(events.venueId, venues.id), eq(venues.active, true)),
    )
    .leftJoin(artists, eq(events.canonicalArtist, artists.canonicalName))
    .where(and(...relatedConditions))
    .orderBy(asc(events.date), asc(events.showTime))
    .limit(3)

  // One batched read for the whole panel rather than a query per row. The set is
  // empty for an anonymous caller, so every row reports not-watching — which is
  // also what the service worker's public cache stores, since it refuses to cache
  // any request carrying an Authorization header.
  const authInfo = getAuth(ctx)
  const watchedIds = new Set<string>()
  if (authInfo?.userId && relatedRows.length > 0) {
    const watchRows = await db
      .select({ eventId: userEvents.eventId })
      .from(userEvents)
      .where(
        and(
          eq(userEvents.userId, authInfo.userId),
          eq(userEvents.status, 'watching'),
          inArray(
            userEvents.eventId,
            relatedRows.map((row) => row.id),
          ),
        ),
      )
    for (const row of watchRows) watchedIds.add(row.eventId)
  }

  const related = relatedRows.map((row) => ({
    ...row,
    isWatching: watchedIds.has(row.id),
  }))

  markViewerScoped(ctx, authInfo?.userId != null)
  return ctx.json({ success: true, data: { data: related } })
})

// GET /v1/events/:id/watchers — the social-proof roster for event detail.
//
// Deliberately stricter than the sibling '/:id' handler: that one uses optional
// auth and serves signed-out callers, whereas this one requires a session and
// returns 401 without one, so the surface renders nothing (#794 owns relaxing
// this). The response is viewer-specific — the caller is excluded from their own
// roster — so it must never land in a shared cache.
eventsRouter.get('/:id/watchers', clerkMiddleware(), async (ctx) => {
  const parsed = uuidSchema.safeParse(ctx.req.param('id'))
  if (!parsed.success)
    return ctx.json({ success: false, error: 'Event not found' }, 404)
  const eventId = parsed.data

  const authInfo = getAuth(ctx)
  if (!authInfo?.userId)
    return ctx.json({ success: false, error: 'Unauthorized' }, 401)

  // Same visibility predicate as '/:id' so a hidden event's roster isn't
  // readable when its detail page 404s.
  const [visibleEvent] = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.id, eventId),
        eq(events.hiddenFromConsumer, false),
        isNull(events.firstMissingAt),
      ),
    )
    .limit(1)

  if (!visibleEvent)
    return ctx.json({ success: false, error: 'Event not found' }, 404)

  const data = await getEventWatchers(eventId, authInfo.userId)

  ctx.header('Cache-Control', 'private, no-store')
  return ctx.json({ success: true, data })
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

  // The select above keeps the status='watching' filter, so un-watching a
  // non-watched row stays a no-op. The mutation routes through releaseWatch so
  // an attending row survives with status cleared rather than being deleted (#70).
  if (existing) {
    await releaseWatch(authInfo.userId, eventId)
  }

  return ctx.json({ success: true, data: { watching: false } })
})
