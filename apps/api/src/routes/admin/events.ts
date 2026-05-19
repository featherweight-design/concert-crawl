import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, eq, desc, asc, sql } from 'drizzle-orm'
import { db, events, venues } from '@concert-crawl/db'
import { getAuthUser } from '../../middleware/auth.js'
import type { AdminVariables } from './index.js'

const eventIdSchema = z.object({ id: z.string().uuid() })

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

// GET /v1/admin/events?verified=false&limit=50&offset=0
eventsAdminRouter.get(
  '/',
  zValidator('query', listQuerySchema),
  async (ctx) => {
    const { verified, limit, offset } = ctx.req.valid('query')

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
        confidenceScore: events.confidenceScore,
        verified: events.verified,
        extractionStrategy: events.extractionStrategy,
        sourceUrl: events.sourceUrl,
        genre: events.genre,
        createdAt: events.createdAt,
        venueId: events.venueId,
        venueName: venues.name,
      })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.verified, verified))
      .orderBy(asc(events.date), desc(events.createdAt))
      .limit(limit)
      .offset(offset)

    return ctx.json({ success: true, data: rows })
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
