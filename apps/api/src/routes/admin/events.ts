import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { httpUrl } from '../../lib/url-schema.js'
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import {
  auditLog,
  db,
  eventReports,
  events,
  notifications,
  priceRetrievalLog,
  priceSubmissions,
  userEvents,
  venues,
} from '@concert-crawl/db'
import {
  fanoutWatchNotification,
  WATCH_CATEGORY_FROM_REPORT_STATUS,
} from '@concert-crawl/push'
import { getAuthUser } from '../../middleware/auth.js'
import type { AdminVariables } from './index.js'
import { classifyMissing } from './lib/classify-missing.js'

const eventIdSchema = z.object({ id: z.string().uuid() })

// Returns the SQL fragment that derives `isSoldOut`: true when an event has a
// promoted+resolved sold-out event_report. Built lazily inside handlers so the
// table reference isn't evaluated at module-load time (keeps the unit-test
// mocks simple — they don't need to export every column accessor).
function isSoldOutExpr() {
  return sql<boolean>`EXISTS (
    SELECT 1 FROM ${eventReports} r
    WHERE r.event_id = ${events.id}
      AND r.status = 'sold-out'
      AND r.resolved_at IS NOT NULL
      AND r.resolution = 'promoted'
  )`
}

const MISSING_DATA_FLAGS = [
  'no-price',
  'no-show-time',
  'no-genre',
  'no-doors-time',
] as const
type MissingDataFlag = (typeof MISSING_DATA_FLAGS)[number]
const MISSING_DATA_FLAG_SET = new Set<MissingDataFlag>(MISSING_DATA_FLAGS)

const isMissingDataFlag = (val: string): val is MissingDataFlag =>
  MISSING_DATA_FLAG_SET.has(val as MissingDataFlag)

const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/

const csvStrings = z
  .string()
  .optional()
  .transform((val) =>
    val === undefined || val === ''
      ? []
      : val
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
  )

const csvMissingFlags = z
  .string()
  .optional()
  .transform((val, ctx) => {
    if (val === undefined || val === '') return [] as MissingDataFlag[]
    const items = val
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
    const valid: MissingDataFlag[] = []
    for (const item of items) {
      if (!isMissingDataFlag(item)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid missingData flag: ${item}`,
        })
        return z.NEVER
      }
      valid.push(item)
    }
    return valid
  })

const listQuerySchema = z.object({
  // Opt-in count flag for the new pagination component. When true, the
  // response wraps the array as `{ rows, total }` where `total` ignores
  // limit/offset. Default returns the legacy array so existing callers
  // (sidebar, watching, etc.) keep working unchanged.
  count: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  // When omitted, no verification filter is applied — used by PR 4's
  // All-events tab to surface both verified and unverified events.
  // The legacy callers (Review tab + missing fetch) pass it explicitly.
  verified: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  // Stale-event detection filter (#607). When `missing=true`, scope the list
  // to events the crawler stopped seeing — first_missing_at IS NOT NULL,
  // status = upcoming, date >= today — ordered most-recently-disappeared
  // first so the Admin > Review tab can surface them for triage. The
  // `verified` filter is intentionally ignored in this mode: a verified show
  // that vanishes is the most important case to surface.
  missing: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  // Composite view enum. When 'hidden-flagged-for-review', scopes the list
  // to hidden_from_consumer=true AND is_concert_review_needed=true — the
  // admin classification review queue. Single combined param (rather than
  // two orthogonal hiddenFromConsumer + reviewNeeded params) keeps the API
  // surface narrow until a second use case demands the orthogonal shape.
  view: z.enum(['hidden-flagged-for-review']).optional(),
  // PR 5 — search + range + multi-tag filters. Comma-separated lists.
  query: z.string().trim().min(1).max(200).optional(),
  dateFrom: z.string().regex(dateOnlyRegex).optional(),
  dateTo: z.string().regex(dateOnlyRegex).optional(),
  genre: csvStrings,
  missingData: csvMissingFlags,
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const eventsAdminRouter = new Hono<AdminVariables>()

// GET /v1/admin/events/count — returns unverified + verified counts for badges/filter rail
eventsAdminRouter.get('/count', async (ctx) => {
  const [pendingResult, approvedResult] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(events)
      .where(eq(events.verified, false))
      .limit(1)
      .offset(0),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(events)
      .where(eq(events.verified, true))
      .limit(1)
      .offset(0),
  ])

  return ctx.json({
    success: true,
    data: {
      pending: pendingResult[0]?.total ?? 0,
      approved: approvedResult[0]?.total ?? 0,
    },
  })
})

// PATCH /v1/admin/events/reports/:reportId/resolve — admin resolve a fan event report
const resolveReportSchema = z.object({
  resolution: z.enum(['promoted', 'rejected', 'needs-more-info']),
  adminNote: z.string().max(500).optional(),
})

eventsAdminRouter.patch(
  '/reports/:reportId/resolve',
  zValidator('json', resolveReportSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid input' }, 422)
    }
  }),
  async (ctx) => {
    const { reportId } = ctx.req.param()
    const { resolution, adminNote } = ctx.req.valid('json')

    const [report] = await db
      .select({
        id: eventReports.id,
        eventId: eventReports.eventId,
        status: eventReports.status,
        resolvedAt: eventReports.resolvedAt,
      })
      .from(eventReports)
      .where(eq(eventReports.id, reportId))
      .limit(1)

    if (!report) {
      return ctx.json({ success: false, error: 'Report not found' }, 404)
    }

    if (report.resolvedAt != null) {
      return ctx.json({ success: false, error: 'Report already resolved' }, 400)
    }

    // Pre-state check: does promoting this report actually flip user-visible
    // state? cancelled/postponed compare against events.status; sold-out
    // compares against whether another live promoted sold-out already exists.
    // Fan-out only fires on real transitions so duplicate confirmed reports
    // don't re-spam watchers.
    let isRealTransition = false
    if (resolution === 'promoted') {
      if (report.status === 'cancelled' || report.status === 'postponed') {
        const [eventRow] = await db
          .select({ status: events.status })
          .from(events)
          .where(eq(events.id, report.eventId))
          .limit(1)
        isRealTransition = eventRow?.status !== report.status
      } else if (report.status === 'sold-out') {
        // Excludes the current report because we haven't run the update
        // below yet — its resolution is still null, so the resolution=
        // 'promoted' filter naturally omits it. Any match here is another
        // pre-existing promoted sold-out on this event.
        const existing = await db
          .select({ id: eventReports.id })
          .from(eventReports)
          .where(
            and(
              eq(eventReports.eventId, report.eventId),
              eq(eventReports.status, 'sold-out'),
              eq(eventReports.resolution, 'promoted'),
            ),
          )
          .limit(1)
        isRealTransition = existing.length === 0
      }
    }

    const [updated] = await db
      .update(eventReports)
      .set({
        resolvedAt: new Date(),
        resolution,
        adminNote: adminNote ?? null,
      })
      .where(eq(eventReports.id, reportId))
      .returning()

    // If promoted and report maps to an event status — update the event
    if (resolution === 'promoted') {
      if (report.status === 'cancelled' || report.status === 'postponed') {
        await db
          .update(events)
          .set({ status: report.status })
          .where(eq(events.id, report.eventId))
      }

      // #1064: fan out watch notifications to every user watching this event.
      // Best-effort — the resolve above already committed. `in` narrowing
      // avoids an `as` cast; the compiler forces us to update the mapping if
      // a new report status is added later. Gated on isRealTransition so a
      // second promoted cancelled/postponed/sold-out on an already-flagged
      // event doesn't duplicate notifications.
      if (
        isRealTransition &&
        report.status in WATCH_CATEGORY_FROM_REPORT_STATUS
      ) {
        await fanoutWatchNotification(
          {
            db,
            notifications,
            userEvents,
            events,
            venues,
          },
          {
            eventId: report.eventId,
            category: WATCH_CATEGORY_FROM_REPORT_STATUS[report.status],
          },
        )
      }
    }

    const actor = getAuthUser(ctx)
    ctx.set('auditAction', 'event.report.resolve')
    ctx.set('auditTargetId', reportId)
    ctx.set('auditActorId', actor.userId)
    ctx.set('auditMeta', { resolution, adminNote: adminNote ?? null })

    return ctx.json({ success: true, data: updated })
  },
)

// GET /v1/admin/events?verified=false&limit=50&offset=0
// GET /v1/admin/events?missing=true — filter to events the crawler stopped
// returning (stale-event detection, see issue #607). When `missing=true`,
// the `verified` filter is ignored and rows are ordered date ASC so the
// soonest upcoming show surfaces first. Each missing row is enriched with a
// `classification` (duplicate | removed | crawl_gap) derived from three
// per-row SQL signals, and a `clusterCount` of how many missing events share
// the same venue.
eventsAdminRouter.get(
  '/',
  zValidator('query', listQuerySchema),
  async (ctx) => {
    const {
      count,
      verified,
      missing,
      view,
      query,
      dateFrom,
      dateTo,
      genre,
      missingData,
      limit,
      offset,
    } = ctx.req.valid('query')

    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Denver',
    })

    // Build query as two separate branches because the order-by and where
    // shape differ — keeping them inline (rather than mutating a builder)
    // keeps Drizzle's type inference happy.
    const baseSelect = db
      .select({
        id: events.id,
        title: events.title,
        artist: events.artist,
        date: events.date,
        doorsTime: events.doorsTime,
        showTime: events.showTime,
        ticketPriceMin: events.ticketPriceMin,
        ticketPriceMax: events.ticketPriceMax,
        confidenceScore: sql<number | null>`(${events.confidenceScore})::float`,
        verified: events.verified,
        hiddenFromConsumer: events.hiddenFromConsumer,
        isConcertReviewNeeded: events.isConcertReviewNeeded,
        status: events.status,
        extractionStrategy: events.extractionStrategy,
        sourceUrl: events.sourceUrl,
        genre: events.genre,
        createdAt: events.createdAt,
        lastSeenAt: events.lastSeenAt,
        firstMissingAt: events.firstMissingAt,
        venueId: events.venueId,
        venueName: venues.name,
        isSoldOut: isSoldOutExpr(),
      })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))

    // Missing branch needs three per-row signals computed over the FULL venue
    // data (not the current page): whether a live sibling still covers this show,
    // the venue's crawl "event horizon", and how many missing rows cluster at the
    // venue. Correlated subqueries reference the outer `events` row.
    const missingSelect = db
      .select({
        id: events.id,
        title: events.title,
        artist: events.artist,
        date: events.date,
        doorsTime: events.doorsTime,
        showTime: events.showTime,
        ticketPriceMin: events.ticketPriceMin,
        ticketPriceMax: events.ticketPriceMax,
        confidenceScore: sql<number | null>`(${events.confidenceScore})::float`,
        verified: events.verified,
        hiddenFromConsumer: events.hiddenFromConsumer,
        isConcertReviewNeeded: events.isConcertReviewNeeded,
        status: events.status,
        extractionStrategy: events.extractionStrategy,
        sourceUrl: events.sourceUrl,
        // The missing list links out to the venue so an admin can confirm a
        // disappearance without hand-searching. eventUrl is the show's own
        // page — a 404 or a cancellation notice settles it in one click —
        // and sourceUrl is the calendar fallback when we never got one.
        eventUrl: events.eventUrl,
        genre: events.genre,
        createdAt: events.createdAt,
        lastSeenAt: events.lastSeenAt,
        firstMissingAt: events.firstMissingAt,
        venueId: events.venueId,
        venueName: venues.name,
        isSoldOut: isSoldOutExpr(),
        // Live sibling: same show still crawled under another row (headliner
        // containment — mirrors scripts/2026-07-19-missing-event-orphan-cleanup.sql).
        hasLiveSibling: sql<boolean>`EXISTS (
          SELECT 1 FROM events sib
          WHERE sib.venue_id = ${events.venueId}
            AND sib.date = ${events.date}
            AND sib.status = 'upcoming'
            AND sib.first_missing_at IS NULL
            AND sib.hidden_from_consumer = false
            AND sib.id <> ${events.id}
            AND ${events.canonicalArtist} <> '' AND sib.canonical_artist <> ''
            AND ${events.canonicalTitle} <> '' AND sib.canonical_title <> ''
            AND ( strpos(sib.canonical_title, ${events.canonicalArtist}) > 0
               OR strpos(${events.canonicalTitle}, sib.canonical_artist) > 0 )
        )`,
        // Event horizon: furthest date the crawl currently reaches at this venue.
        venueHorizon: sql<string | null>`(
          SELECT MAX(h.date) FROM events h
          WHERE h.venue_id = ${events.venueId}
            AND h.status = 'upcoming'
            AND h.first_missing_at IS NULL
            AND h.hidden_from_consumer = false
            AND h.date >= ${today}
        )`,
        // Cluster size: admin-visible missing rows at this venue (matches the
        // missing whereClause population below).
        clusterCount: sql<number>`(
          SELECT COUNT(*)::int FROM events c
          WHERE c.venue_id = ${events.venueId}
            AND c.first_missing_at IS NOT NULL
            AND c.status = 'upcoming'
            AND c.date >= ${today}
            AND c.hidden_from_consumer = false
        )`,
      })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))

    // Strip the internal classification signals from the API response and
    // expose only `classification` (derived) + `clusterCount` (kept).
    const withClassification = <
      TRow extends {
        date: string
        venueHorizon: string | null
        hasLiveSibling: boolean
      },
    >(
      rows: TRow[],
    ) =>
      rows.map(({ venueHorizon, hasLiveSibling, ...row }) => ({
        ...row,
        classification: classifyMissing({
          date: row.date,
          venueHorizon,
          hasLiveSibling,
        }),
      }))

    // PR 5 filter clauses. Each is undefined when its param is omitted, which
    // drizzle's `and()` treats as a no-op — so callers compose freely.
    const queryLike = query ? `%${query}%` : null
    const searchClause = queryLike
      ? or(
          ilike(events.title, queryLike),
          ilike(events.artist, queryLike),
          ilike(venues.name, queryLike),
        )
      : undefined

    const genreClause =
      genre.length > 0
        ? sql`${events.genre} && ARRAY[${sql.join(
            genre.map((tag) => sql`${tag}`),
            sql`, `,
          )}]::text[]`
        : undefined

    const missingDataClauses = missingData.map((flag) => {
      switch (flag) {
        case 'no-price':
          return isNull(events.ticketPriceMin)
        case 'no-show-time':
          return isNull(events.showTime)
        case 'no-genre':
          return or(
            isNull(events.genre),
            sql`coalesce(cardinality(${events.genre}), 0) = 0`,
          )
        case 'no-doors-time':
          return isNull(events.doorsTime)
      }
    })

    // dateFrom defaults to today when not provided — preserves the legacy
    // "show upcoming only" behavior for callers that don't opt in to past
    // events. dateTo is open-ended unless caller supplies it.
    const effectiveDateFrom = dateFrom ?? today
    const dateFromClause = gte(events.date, effectiveDateFrom)
    const dateToClause = dateTo ? lte(events.date, dateTo) : undefined

    // Same WHERE shape used for both the row fetch and the count(*) query
    // when count=true. Pulling it out as a single expression guarantees the
    // count tracks the rows for any callers that opt in.
    //
    // The missing branch also excludes admin-hidden events (#712): an event
    // that's been marked non-concert (hidden_from_consumer=true) and then
    // stops appearing in crawls is not actionable — it should drop out of
    // the missing queue and the review/counts pill in lock-step.
    const whereClause = missing
      ? and(
          isNotNull(events.firstMissingAt),
          eq(events.status, 'upcoming'),
          gte(events.date, today),
          eq(events.hiddenFromConsumer, false),
        )
      : view === 'hidden-flagged-for-review'
        ? and(
            eq(events.hiddenFromConsumer, true),
            eq(events.isConcertReviewNeeded, true),
            verified === undefined ? undefined : eq(events.verified, verified),
            dateFromClause,
            dateToClause,
            searchClause,
            genreClause,
            ...missingDataClauses,
          )
        : and(
            verified === undefined ? undefined : eq(events.verified, verified),
            dateFromClause,
            dateToClause,
            searchClause,
            genreClause,
            ...missingDataClauses,
          )

    // Keep the two branches fully separate so Drizzle's inferred types narrow
    // correctly for withClassification (which requires venueHorizon +
    // hasLiveSibling — fields only present in missingSelect).
    if (missing) {
      const missingQuery = missingSelect
        .where(whereClause)
        .orderBy(asc(events.date), desc(events.firstMissingAt))
        .limit(limit)
        .offset(offset)

      if (!count) {
        const rows = await missingQuery
        return ctx.json({ success: true, data: withClassification(rows) })
      }

      const countQuery = db
        .select({ total: sql<number>`count(*)::int` })
        .from(events)
        .leftJoin(venues, eq(events.venueId, venues.id))
        .where(whereClause)

      const [rows, countResult] = await Promise.all([missingQuery, countQuery])
      const total = countResult[0]?.total ?? 0
      return ctx.json({
        success: true,
        data: { rows: withClassification(rows), total },
      })
    }

    const rowsPromise = baseSelect
      .where(whereClause)
      .orderBy(asc(events.date), desc(events.createdAt))
      .limit(limit)
      .offset(offset)

    if (!count) {
      const rows = await rowsPromise
      return ctx.json({ success: true, data: rows })
    }

    // count=true: parallelize the row fetch and the count so the extra query
    // doesn't double the response time. The count needs the missing branch's
    // venue join only if a future filter references venues.name — today it
    // does (search), so we count off the same joined view.
    const countQuery = db
      .select({ total: sql<number>`count(*)::int` })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(whereClause)

    const [rows, countResult] = await Promise.all([rowsPromise, countQuery])
    const total = countResult[0]?.total ?? 0
    return ctx.json({ success: true, data: { rows, total } })
  },
)

// POST /v1/admin/events/bulk-auto-approve — approve all unverified events above a confidence threshold
// Used as a one-time backfill after the auto-approve threshold was introduced in the crawler.
eventsAdminRouter.post(
  '/bulk-auto-approve',
  zValidator(
    'json',
    z.object({
      confidenceThreshold: z.number().min(0).max(1).default(0.7),
    }),
  ),
  async (ctx) => {
    const { confidenceThreshold } = ctx.req.valid('json')

    const updated = await db
      .update(events)
      .set({ verified: true, updatedAt: new Date() })
      .where(
        and(
          eq(events.verified, false),
          gte(events.confidenceScore, String(confidenceThreshold)),
        ),
      )
      .returning({ ok: sql<number>`1` })

    const actor = getAuthUser(ctx)
    ctx.set('auditAction', 'event.bulk_auto_approve')
    ctx.set('auditActorId', actor.userId)
    ctx.set('auditMeta', {
      count: updated.length,
      confidenceThreshold,
    })

    return ctx.json({ success: true, data: { approved: updated.length } })
  },
)

// PATCH /v1/admin/events/:id/verify — approve an event (set verified=true)
eventsAdminRouter.patch(
  '/:id/verify',
  zValidator('param', eventIdSchema),
  async (ctx) => {
    const { id } = ctx.req.valid('param')

    const [updated] = await db
      .update(events)
      .set({ verified: true, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning()

    if (!updated) {
      return ctx.json({ success: false, error: 'Event not found' }, 404)
    }

    const actor = getAuthUser(ctx)
    ctx.set('auditAction', 'event.verify')
    ctx.set('auditTargetId', id)
    ctx.set('auditActorId', actor.userId)

    return ctx.json({ success: true, data: updated })
  },
)

// GET /v1/admin/events/:id — single event for the admin editor surface.
// Same projection as the list endpoint so the editor can hydrate every
// section from a single payload.
eventsAdminRouter.get(
  '/:id',
  zValidator('param', eventIdSchema),
  async (ctx) => {
    const { id } = ctx.req.valid('param')

    const [row] = await db
      .select({
        id: events.id,
        title: events.title,
        artist: events.artist,
        date: events.date,
        doorsTime: events.doorsTime,
        showTime: events.showTime,
        ticketPriceMin: events.ticketPriceMin,
        ticketPriceMax: events.ticketPriceMax,
        confidenceScore: sql<number | null>`(${events.confidenceScore})::float`,
        verified: events.verified,
        hiddenFromConsumer: events.hiddenFromConsumer,
        isConcertReviewNeeded: events.isConcertReviewNeeded,
        status: events.status,
        extractionStrategy: events.extractionStrategy,
        sourceUrl: events.sourceUrl,
        genre: events.genre,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        lastSeenAt: events.lastSeenAt,
        firstMissingAt: events.firstMissingAt,
        venueId: events.venueId,
        venueName: venues.name,
        isSoldOut: isSoldOutExpr(),
      })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.id, id))
      .limit(1)

    if (!row) {
      return ctx.json({ success: false, error: 'Not found' } as const, 404)
    }

    return ctx.json({ success: true, data: row } as const)
  },
)

// PATCH /v1/admin/events/:id — partial update (verified, status, content fields)
eventsAdminRouter.patch(
  '/:id',
  zValidator('param', eventIdSchema),
  zValidator(
    'json',
    z.object({
      verified: z.boolean().optional(),
      status: z.enum(['upcoming', 'cancelled', 'postponed']).optional(),
      title: z.string().min(1).optional(),
      artist: z.string().min(1).optional(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
        .optional(),
      doorsTime: z.string().nullable().optional(),
      showTime: z.string().nullable().optional(),
      ticketPriceMin: z.string().nullable().optional(),
      ticketPriceMax: z.string().nullable().optional(),
      genre: z.array(z.string()).nullable().optional(),
      // Admin "Dismiss" on the Missing tab — clears the stale-event flag
      // so the row falls out of the ?missing=true filter. The crawler
      // re-stamps it if the event genuinely re-disappears on a future sweep.
      firstMissingAt: z.null().optional(),
      // PR 6 — admin "Mark non-concert" hides the event from every
      // consumer-facing listing query. See migration 0039 + the consumer
      // route audit.
      hiddenFromConsumer: z.boolean().optional(),
    }),
  ),
  async (ctx) => {
    const { id } = ctx.req.valid('param')
    const body = ctx.req.valid('json')

    // Only bother with the transactional pre-state lock when the PATCH
    // actually touches status or date — every other field is edit-only
    // and doesn't need a serialize gate.
    const touchesTransitionField =
      typeof body.status === 'string' || typeof body.date === 'string'

    // #1107: read pre-state + write inside a transaction so two concurrent
    // PATCHes can't both observe the same pre-state and fan out twice.
    // SELECT FOR UPDATE serializes on the row. Fan-out fires only for the
    // transaction that actually observed the transition; a losing PATCH
    // sees the new state and computes category=null.
    const result = await db.transaction(async (tx) => {
      let preUpdate: { status: string; date: string } | undefined
      if (touchesTransitionField) {
        const rows = await tx
          .select({ status: events.status, date: events.date })
          .from(events)
          .where(eq(events.id, id))
          .for('update')
          .limit(1)
        preUpdate = rows[0]
      }

      const [updated] = await tx
        .update(events)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(events.id, id))
        .returning()

      // Watch-update fan-out category — computed inside the tx against the
      // locked pre-state row. Fires AFTER commit.
      //
      // Categories fired:
      //   - watch.cancelled when status flips upcoming|postponed → cancelled
      //   - watch.postponed when status flips upcoming|cancelled → postponed
      //   - watch.postponed on a date change to an upcoming/postponed event
      //
      // A date change carries the same signal as a status flip to postponed
      // (the show is on a different night), so we treat both as
      // watch.postponed. If both a status flip AND a date change land in the
      // same PATCH, we still fan out only once — status transitions win.
      let category: 'watch.cancelled' | 'watch.postponed' | null = null
      if (preUpdate && updated) {
        if (
          typeof body.status === 'string' &&
          body.status !== preUpdate.status
        ) {
          if (body.status === 'cancelled') category = 'watch.cancelled'
          else if (body.status === 'postponed') category = 'watch.postponed'
        } else if (
          typeof body.date === 'string' &&
          body.date !== preUpdate.date &&
          // Skip if this event is already cancelled — a stale ticker
          // somewhere may still emit dates for cancelled events; watchers
          // already got the cancel notification.
          preUpdate.status !== 'cancelled'
        ) {
          category = 'watch.postponed'
        }
      }

      return { updated, category }
    })

    if (!result.updated) {
      return ctx.json({ success: false, error: 'Not found' } as const, 404)
    }

    const actor = getAuthUser(ctx)
    ctx.set('auditAction', 'event.update')
    ctx.set('auditTargetId', id)
    ctx.set('auditActorId', actor.userId)

    if (result.category) {
      await fanoutWatchNotification(
        {
          db,
          notifications,
          userEvents,
          events,
          venues,
        },
        { eventId: id, category: result.category },
      )
    }

    return ctx.json({ success: true, data: result.updated } as const)
  },
)

// DELETE /v1/admin/events/:id — remove an event from the catalog.
// PR 6 loosened the original "unverified-only" guard: admins can delete
// verified events too (every delete is audit-logged).
eventsAdminRouter.delete(
  '/:id',
  zValidator('param', eventIdSchema),
  async (ctx) => {
    const { id } = ctx.req.valid('param')

    const [deleted] = await db
      .delete(events)
      .where(eq(events.id, id))
      .returning()

    if (!deleted) {
      return ctx.json({ success: false, error: 'Event not found' }, 404)
    }

    const actor = getAuthUser(ctx)
    ctx.set('auditAction', 'event.delete')
    ctx.set('auditTargetId', id)
    ctx.set('auditActorId', actor.userId)
    ctx.set('auditMeta', { wasVerified: deleted.verified })

    return ctx.json({ success: true })
  },
)

// POST /v1/admin/events/:id/sold-out — admin-authored sold-out event_report,
// auto-promoted on creation. Idempotent: if an active promoted sold-out report
// already exists, returns 200 with that row instead of creating a duplicate.
const markSoldOutSchema = z.object({
  evidenceMethod: z
    .enum(['venue_site', 'saw_listing', 'bought_myself', 'other'])
    .optional()
    .default('other'),
  evidenceUrl: httpUrl(500).optional(),
  note: z.string().max(280).optional(),
})

eventsAdminRouter.post(
  '/:id/sold-out',
  zValidator('param', eventIdSchema),
  zValidator('json', markSoldOutSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid input' }, 422)
    }
  }),
  async (ctx) => {
    const { id } = ctx.req.valid('param')
    const { evidenceMethod, evidenceUrl, note } = ctx.req.valid('json')
    const actor = getAuthUser(ctx)

    // Verify the event exists before authoring a report against it.
    const [eventRow] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, id))
      .limit(1)

    if (!eventRow) {
      return ctx.json({ success: false, error: 'Event not found' }, 404)
    }

    // Idempotency check: if an active promoted sold-out report already exists,
    // return it instead of inserting a duplicate. "Active" here means resolved
    // with resolution='promoted' (i.e. the event is currently marked sold out).
    //
    // Race-safety: the SELECT-then-INSERT pattern below would race under
    // concurrent admin POSTs. Migration 0032 enforces this invariant at the
    // DB layer with a partial unique index on event_reports
    // (event_id) WHERE status='sold-out' AND resolved_at IS NOT NULL
    // AND resolution='promoted'. The INSERT below catches the resulting
    // unique-violation, re-queries for the now-existing row, and returns it
    // (so the API behavior stays consistent regardless of which caller won).
    const fetchExisting = () =>
      db
        .select()
        .from(eventReports)
        .where(
          and(
            eq(eventReports.eventId, id),
            eq(eventReports.status, 'sold-out'),
            isNotNull(eventReports.resolvedAt),
            eq(eventReports.resolution, 'promoted'),
          ),
        )
        .limit(1)

    const [existing] = await fetchExisting()

    if (existing) {
      // Audit even on the idempotent path so admin actions are always traceable.
      ctx.set('auditAction', 'event.sold_out.mark')
      ctx.set('auditTargetId', id)
      ctx.set('auditActorId', actor.userId)
      ctx.set('auditMeta', {
        reportId: existing.id,
        idempotent: true,
      })
      return ctx.json({ success: true, data: existing }, 200)
    }

    let created: typeof eventReports.$inferSelect | undefined
    try {
      const inserted = await db
        .insert(eventReports)
        .values({
          eventId: id,
          reporterId: actor.userId,
          status: 'sold-out',
          evidenceMethod,
          evidenceUrl: evidenceUrl ?? null,
          note: note ?? null,
          resolvedAt: new Date(),
          resolution: 'promoted',
          adminNote: 'admin-authored — auto-promoted on creation',
        })
        .returning()
      created = inserted[0]
    } catch (err) {
      // Unique-violation from the partial index = another concurrent POST won
      // the race. Treat as idempotent: re-query and return that row at 200.
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code?: string }).code === '23505'
      ) {
        const [winner] = await fetchExisting()
        if (winner) {
          ctx.set('auditAction', 'event.sold_out.mark')
          ctx.set('auditTargetId', id)
          ctx.set('auditActorId', actor.userId)
          ctx.set('auditMeta', {
            reportId: winner.id,
            idempotent: true,
            raceLost: true,
          })
          return ctx.json({ success: true, data: winner }, 200)
        }
      }
      throw err
    }

    ctx.set('auditAction', 'event.sold_out.mark')
    ctx.set('auditTargetId', id)
    ctx.set('auditActorId', actor.userId)
    ctx.set('auditMeta', {
      reportId: created?.id ?? null,
      evidenceMethod,
      evidenceUrl: evidenceUrl ?? null,
    })

    // #1064: fan out watch.soldout to every user watching this event. Only on
    // the freshly-created path — the idempotent early-return above already
    // covers the "already sold out" case (watchers were notified on the
    // original mark).
    await fanoutWatchNotification(
      {
        db,
        notifications,
        userEvents,
        events,
        venues,
      },
      {
        eventId: id,
        category: 'watch.soldout',
      },
    )

    return ctx.json({ success: true, data: created }, 201)
  },
)

// POST /v1/admin/events/:id/available — inverse of Mark Sold Out. Dismisses
// the active promoted sold-out report. The row is preserved (resolution flipped
// to 'rejected') because its history is meaningful. Idempotent no-op when no
// active sold-out report exists.
const markAvailableSchema = z.object({
  note: z.string().max(500).optional(),
})

eventsAdminRouter.post(
  '/:id/available',
  zValidator('param', eventIdSchema),
  zValidator('json', markAvailableSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid input' }, 422)
    }
  }),
  async (ctx) => {
    const { id } = ctx.req.valid('param')
    const { note } = ctx.req.valid('json')
    const actor = getAuthUser(ctx)

    // Verify the event exists — return 404 for unknown IDs so this endpoint
    // doesn't masquerade a bogus call as a successful no-op (matches the
    // sold-out endpoint and the rest of admin/events).
    const [eventRow] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, id))
      .limit(1)

    if (!eventRow) {
      return ctx.json({ success: false, error: 'Event not found' }, 404)
    }

    // Clear ALL active promoted sold-out reports for this event. Migration 0032
    // enforces "at most one" via partial unique index, so in practice this
    // affects at most one row — but using the predicate (not a single id) is
    // robust against any historical data anomaly + against the brief race
    // window between SELECT and UPDATE.
    const cleared = await db
      .update(eventReports)
      .set({
        resolution: 'rejected',
        adminNote: note ?? 'admin marked available',
      })
      .where(
        and(
          eq(eventReports.eventId, id),
          eq(eventReports.status, 'sold-out'),
          isNotNull(eventReports.resolvedAt),
          eq(eventReports.resolution, 'promoted'),
        ),
      )
      .returning({ id: eventReports.id })

    // 204 either way (idempotent no-op when nothing was active). Audit only
    // when we actually cleared something — admin action with no DB effect
    // doesn't earn an audit row.
    if (cleared.length > 0) {
      ctx.set('auditAction', 'event.sold_out.clear')
      ctx.set('auditTargetId', id)
      ctx.set('auditActorId', actor.userId)
      ctx.set('auditMeta', { reportIds: cleared.map((row) => row.id) })

      // #1064: fan out watch.backonsale to every user watching this event.
      // Only when we actually flipped state — a no-op call didn't change
      // anything user-visible.
      await fanoutWatchNotification(
        {
          db,
          notifications,
          userEvents,
          events,
          venues,
        },
        {
          eventId: id,
          category: 'watch.backonsale',
        },
      )
    }

    return ctx.body(null, 204)
  },
)

// PR 10 — bulk endpoints. Each action audit-logs once per affected event so
// the audit log mirrors per-row admin actions (lets compliance reconstruct
// who touched which event without parsing a single batched meta blob).
const BULK_MAX = 100

const bulkIdsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(BULK_MAX),
})

const bulkDeleteSchema = bulkIdsSchema.extend({
  confirmation: z.literal('DELETE'),
})

// POST /v1/admin/events/bulk/unverify — send a list of events back to review.
// Mutation + per-event audit inserts run inside a single transaction so the
// audit log can't drift out of sync with the row state on a transient DB error.
eventsAdminRouter.post(
  '/bulk/unverify',
  zValidator('json', bulkIdsSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid input' }, 422)
    }
  }),
  async (ctx) => {
    const { ids } = ctx.req.valid('json')
    const actor = getAuthUser(ctx)

    const count = await db.transaction(async (tx) => {
      const updated = await tx
        .update(events)
        .set({ verified: false, updatedAt: new Date() })
        .where(inArray(events.id, ids))
        .returning({ id: events.id })
      if (updated.length > 0) {
        await tx.insert(auditLog).values(
          updated.map((row) => ({
            actorId: actor.userId,
            action: 'event.bulk_unverify',
            targetId: row.id,
            metadata: null,
          })),
        )
      }
      return updated.length
    })

    return ctx.json({ success: true, data: { count } })
  },
)

// POST /v1/admin/events/bulk/mark-non-concert — set hiddenFromConsumer=true.
eventsAdminRouter.post(
  '/bulk/mark-non-concert',
  zValidator('json', bulkIdsSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid input' }, 422)
    }
  }),
  async (ctx) => {
    const { ids } = ctx.req.valid('json')
    const actor = getAuthUser(ctx)

    const count = await db.transaction(async (tx) => {
      const updated = await tx
        .update(events)
        .set({ hiddenFromConsumer: true, updatedAt: new Date() })
        .where(inArray(events.id, ids))
        .returning({ id: events.id })
      if (updated.length > 0) {
        await tx.insert(auditLog).values(
          updated.map((row) => ({
            actorId: actor.userId,
            action: 'event.bulk_mark_non_concert',
            targetId: row.id,
            metadata: null,
          })),
        )
      }
      return updated.length
    })

    return ctx.json({ success: true, data: { count } })
  },
)

// POST /v1/admin/events/bulk/mark-as-concert — set hiddenFromConsumer=false
// (the inverse of bulk/mark-non-concert; surfaced via the classification
// review queue chip in the All Events bulk dock, issue #809). Does NOT
// touch is_concert_review_needed — that flag reflects the LLM's view,
// not the admin's resolution, per the classification-review-queue spec.
//
// The WHERE filter scopes the update to rows currently in
// hiddenFromConsumer=true, so the endpoint only bumps updatedAt and emits
// audit entries for rows that actually transitioned. Bulk-dock selections
// survive pagination, so the request body can include rows the caller no
// longer sees as hidden; without the filter, those rows would still flip
// updatedAt and emit audit noise. The mirror cleanup for bulk/mark-non-
// concert is tracked separately as #815. (#809; #814 review round 2)
eventsAdminRouter.post(
  '/bulk/mark-as-concert',
  zValidator('json', bulkIdsSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid input' }, 422)
    }
  }),
  async (ctx) => {
    const { ids } = ctx.req.valid('json')
    const actor = getAuthUser(ctx)

    const count = await db.transaction(async (tx) => {
      const updated = await tx
        .update(events)
        .set({ hiddenFromConsumer: false, updatedAt: new Date() })
        .where(
          and(inArray(events.id, ids), eq(events.hiddenFromConsumer, true)),
        )
        .returning({ id: events.id })
      if (updated.length > 0) {
        await tx.insert(auditLog).values(
          updated.map((row) => ({
            actorId: actor.userId,
            action: 'event.bulk_mark_as_concert',
            targetId: row.id,
            metadata: null,
          })),
        )
      }
      return updated.length
    })

    return ctx.json({ success: true, data: { count } })
  },
)

// POST /v1/admin/events/bulk/delete — permanent removal with typed-DELETE gate.
eventsAdminRouter.post(
  '/bulk/delete',
  zValidator('json', bulkDeleteSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid input' }, 422)
    }
  }),
  async (ctx) => {
    const { ids } = ctx.req.valid('json')
    const actor = getAuthUser(ctx)

    const count = await db.transaction(async (tx) => {
      const deleted = await tx
        .delete(events)
        .where(inArray(events.id, ids))
        .returning({ id: events.id })
      if (deleted.length > 0) {
        await tx.insert(auditLog).values(
          deleted.map((row) => ({
            actorId: actor.userId,
            action: 'event.bulk_delete',
            targetId: row.id,
            metadata: null,
          })),
        )
      }
      return deleted.length
    })

    return ctx.json({ success: true, data: { count } })
  },
)

const mergeSchema = z.object({ targetId: z.string().uuid() })

// POST /v1/admin/events/:id/merge — fold a source event into a target event,
// moving every user-side reference (watchlist rows, sold-out/cancelled reports,
// price submissions, price retrieval logs) onto the target, then deleting the
// source event row. The whole thing runs inside one transaction: if any move
// fails, nothing is persisted (so the FK cascade on DELETE can't orphan moved
// rows). The audit log captures the source id, target id, and per-table move
// counts so we can reconstruct what happened from the audit row alone.
//
// `user_events` has a UNIQUE (user_id, event_id). If the same user already has
// the target event on their list, we can't move the source row — it would
// duplicate the key. Those rows are dropped from the source side; the target
// wins and the count is reported separately as `userEventsDropped`.
eventsAdminRouter.post(
  '/:id/merge',
  zValidator('param', eventIdSchema),
  zValidator('json', mergeSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid input' }, 422)
    }
  }),
  async (ctx) => {
    const { id: sourceId } = ctx.req.valid('param')
    const { targetId } = ctx.req.valid('json')
    const actor = getAuthUser(ctx)

    if (sourceId === targetId) {
      return ctx.json(
        { success: false, error: 'Source and target must differ' },
        422,
      )
    }

    // Pre-flight existence checks return 404 with a clear message before we
    // open a transaction — cheaper than rolling back inside.
    const both = await db
      .select({ id: events.id })
      .from(events)
      .where(or(eq(events.id, sourceId), eq(events.id, targetId)))
    const foundIds = new Set(both.map((row) => row.id))
    if (!foundIds.has(sourceId)) {
      return ctx.json({ success: false, error: 'Source event not found' }, 404)
    }
    if (!foundIds.has(targetId)) {
      return ctx.json({ success: false, error: 'Target event not found' }, 404)
    }

    const referencesMoved = await db.transaction(async (tx) => {
      // user_events: drop conflicting source rows (target wins) before moving
      // the rest. Doing the delete inside the same transaction means a partial
      // failure rolls the drops back too.
      // Before dropping the losing source rows, salvage their attendance onto
      // the target: an attended night must not vanish because an admin merged
      // two listings for the same show (#70). LEAST() keeps the earliest
      // commitment, which is the honest timestamp for when the user decided.
      // Postgres LEAST/GREATEST ignore NULL arguments (unlike most other SQL
      // dialects and unlike ordinary operators) and return NULL only when
      // every argument is NULL — so a watching-only target with a NULL
      // attending_at correctly adopts the source's timestamp. No COALESCE
      // wrapper needed; adding one would be a no-op here.
      const coalescedAttending = await tx
        .update(userEvents)
        .set({
          attendingAt: sql`LEAST(
            ${userEvents.attendingAt},
            (SELECT src.attending_at FROM ${userEvents} src
              WHERE src.event_id = ${sourceId}
                AND src.user_id = ${userEvents.userId})
          )`,
        })
        .where(
          and(
            eq(userEvents.eventId, targetId),
            sql`EXISTS (
              SELECT 1 FROM ${userEvents} src
              WHERE src.event_id = ${sourceId}
                AND src.user_id = ${userEvents.userId}
                AND src.attending_at IS NOT NULL
            )`,
          ),
        )
        .returning({ id: userEvents.id })

      const droppedUserEvents = await tx
        .delete(userEvents)
        .where(
          and(
            eq(userEvents.eventId, sourceId),
            sql`EXISTS (
              SELECT 1 FROM ${userEvents} t
              WHERE t.event_id = ${targetId}
                AND t.user_id = ${userEvents.userId}
            )`,
          ),
        )
        .returning({ id: userEvents.id })

      const movedUserEvents = await tx
        .update(userEvents)
        .set({ eventId: targetId })
        .where(eq(userEvents.eventId, sourceId))
        .returning({ id: userEvents.id })

      const movedReports = await tx
        .update(eventReports)
        .set({ eventId: targetId })
        .where(eq(eventReports.eventId, sourceId))
        .returning({ id: eventReports.id })

      const movedSubmissions = await tx
        .update(priceSubmissions)
        .set({ eventId: targetId, updatedAt: new Date() })
        .where(eq(priceSubmissions.eventId, sourceId))
        .returning({ id: priceSubmissions.id })

      const movedLogs = await tx
        .update(priceRetrievalLog)
        .set({ eventId: targetId })
        .where(eq(priceRetrievalLog.eventId, sourceId))
        .returning({ id: priceRetrievalLog.id })

      // With every reference moved, deleting the source row is safe — there's
      // nothing left to cascade. Doing this last means a failure earlier in
      // the transaction never reaches the destructive step.
      //
      // The DELETE returns the affected rows so we can detect a concurrent
      // race: if a parallel merge (or delete) cleared the source between the
      // pre-flight existence check and now, we'd otherwise commit a no-op
      // with a misleading "success" + audit row. Throwing rolls the whole
      // transaction back.
      const deletedSource = await tx
        .delete(events)
        .where(eq(events.id, sourceId))
        .returning({ id: events.id })
      if (deletedSource.length === 0) {
        throw new Error('Source event disappeared mid-merge')
      }

      const counts = {
        userEventsMoved: movedUserEvents.length,
        userEventsDropped: droppedUserEvents.length,
        attendingCoalesced: coalescedAttending.length,
        reportsMoved: movedReports.length,
        submissionsMoved: movedSubmissions.length,
        priceLogsMoved: movedLogs.length,
      }

      await tx.insert(auditLog).values({
        actorId: actor.userId,
        action: 'event.merge',
        targetId,
        metadata: { sourceId, referencesMoved: counts },
      })

      return counts
    })

    return ctx.json({
      success: true,
      data: { mergedInto: targetId, referencesMoved },
    })
  },
)
