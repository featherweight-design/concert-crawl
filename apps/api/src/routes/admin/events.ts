import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, eq, desc, asc, gte, isNotNull, sql } from 'drizzle-orm'
import { db, eventReports, events, venues } from '@concert-crawl/db'
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

const listQuerySchema = z.object({
  verified: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),
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
eventsAdminRouter.get(
  '/',
  zValidator('query', listQuerySchema),
  async (ctx) => {
    const { verified, limit, offset } = ctx.req.valid('query')

    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Denver',
    })

    const rows = await db
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
        extractionStrategy: events.extractionStrategy,
        sourceUrl: events.sourceUrl,
        genre: events.genre,
        createdAt: events.createdAt,
        venueId: events.venueId,
        venueName: venues.name,
        isSoldOut: isSoldOutExpr(),
      })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(and(eq(events.verified, verified), gte(events.date, today)))
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

// DELETE /v1/admin/events/:id — reject and remove an unverified event
eventsAdminRouter.delete(
  '/:id',
  zValidator('param', eventIdSchema),
  async (ctx) => {
    const { id } = ctx.req.valid('param')

    const [deleted] = await db
      .delete(events)
      .where(and(eq(events.id, id), eq(events.verified, false)))
      .returning()

    if (!deleted) {
      return ctx.json(
        { success: false, error: 'Event not found or already verified' },
        404,
      )
    }

    const actor = getAuthUser(ctx)
    ctx.set('auditAction', 'event.delete')
    ctx.set('auditTargetId', id)
    ctx.set('auditActorId', actor.userId)

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
    const [existing] = await db
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

    if (existing) {
      return ctx.json({ success: true, data: existing }, 200)
    }

    const [created] = await db
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

    const [active] = await db
      .select({ id: eventReports.id })
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

    if (!active) {
      // No active sold-out report — nothing to do. 204 keeps the call idempotent.
      return ctx.body(null, 204)
    }

    await db
      .update(eventReports)
      .set({
        resolution: 'rejected',
        adminNote: note ?? 'admin marked available',
      })
      .where(eq(eventReports.id, active.id))

    ctx.set('auditAction', 'event.sold_out.clear')
    ctx.set('auditTargetId', id)
    ctx.set('auditActorId', actor.userId)
    ctx.set('auditMeta', { reportId: active.id })

    return ctx.body(null, 204)
  },
)
