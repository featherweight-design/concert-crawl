import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
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
import { auditLog, db, eventReports, events, venues } from '@concert-crawl/db'
import { getAuthUser } from '../../middleware/auth.js'
import type { AdminVariables } from './index.js'

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
// the `verified` filter is ignored and rows are ordered by first_missing_at
// DESC so the most recent disappearances surface first.
eventsAdminRouter.get(
  '/',
  zValidator('query', listQuerySchema),
  async (ctx) => {
    const {
      verified,
      missing,
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

    const rows = missing
      ? await baseSelect
          .where(
            and(
              isNotNull(events.firstMissingAt),
              eq(events.status, 'upcoming'),
              gte(events.date, today),
            ),
          )
          .orderBy(desc(events.firstMissingAt))
          .limit(limit)
          .offset(offset)
      : await baseSelect
          .where(
            and(
              verified === undefined
                ? undefined
                : eq(events.verified, verified),
              dateFromClause,
              dateToClause,
              searchClause,
              genreClause,
              ...missingDataClauses,
            ),
          )
          .orderBy(asc(events.date), desc(events.createdAt))
          .limit(limit)
          .offset(offset)

    return ctx.json({ success: true, data: rows })
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

    const [updated] = await db
      .update(events)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning()

    if (!updated) {
      return ctx.json({ success: false, error: 'Not found' } as const, 404)
    }

    const actor = getAuthUser(ctx)
    ctx.set('auditAction', 'event.update')
    ctx.set('auditTargetId', id)
    ctx.set('auditActorId', actor.userId)

    return ctx.json({ success: true, data: updated } as const)
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
  evidenceUrl: z.string().url().max(500).optional(),
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
