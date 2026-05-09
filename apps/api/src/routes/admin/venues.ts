import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, venues, events } from '@concert-crawl/db'
import { count, eq } from 'drizzle-orm'
import { getAuthUser } from '../../middleware/auth.js'
import type { AdminVariables } from './index.js'

const createVenueSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  websiteUrl: z.string().url(),
  city: z.string().default('Denver'),
  crawlDelayMs: z.number().int().min(1000).max(30000).default(3000),
  contactEmail: z.string().email().optional(),
  crawlNotes: z.string().optional(),
})

const updateVenueSchema = createVenueSchema.partial().extend({
  active: z.boolean().optional(),
  verified: z.boolean().optional(),
})

export const venuesAdminRouter = new Hono<AdminVariables>()

// GET /v1/admin/venues — list all venues with upcoming event counts
venuesAdminRouter.get('/', async (ctx) => {
  const allVenues = await db.select().from(venues).orderBy(venues.name)

  const eventCounts = await db
    .select({ venueId: events.venueId, total: count(events.id) })
    .from(events)
    .groupBy(events.venueId)

  const countByVenueId = new Map(
    eventCounts.map((row) => [row.venueId, row.total]),
  )

  const venuesWithCounts = allVenues.map((venue) => ({
    ...venue,
    eventCount: countByVenueId.get(venue.id) ?? 0,
  }))

  return ctx.json({ success: true, data: venuesWithCounts })
})

// GET /v1/admin/venues/:id — get single venue
venuesAdminRouter.get('/:id', async (ctx) => {
  const { id } = ctx.req.param()
  const [venue] = await db.select().from(venues).where(eq(venues.id, id))

  if (!venue) {
    return ctx.json({ success: false, error: 'Venue not found' }, 404)
  }

  return ctx.json({ success: true, data: venue })
})

// POST /v1/admin/venues — create venue
venuesAdminRouter.post(
  '/',
  zValidator('json', createVenueSchema),
  async (ctx) => {
    const body = ctx.req.valid('json')

    const [venue] = await db.insert(venues).values(body).returning()

    if (!venue) {
      return ctx.json(
        { success: false, error: 'Venue created but no row was returned' },
        500,
      )
    }

    ctx.set('auditAction', 'venue.create')
    ctx.set('auditTargetId', venue.id)
    ctx.set('auditActorId', getAuthUser(ctx).userId)

    return ctx.json({ success: true, data: venue }, 201)
  },
)

// PATCH /v1/admin/venues/:id — update venue
venuesAdminRouter.patch(
  '/:id',
  zValidator('json', updateVenueSchema),
  async (ctx) => {
    const { id } = ctx.req.param()
    const body = ctx.req.valid('json')

    const [existing] = await db.select().from(venues).where(eq(venues.id, id))
    if (!existing) {
      return ctx.json({ success: false, error: 'Venue not found' }, 404)
    }

    const [updated] = await db
      .update(venues)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(venues.id, id))
      .returning()

    ctx.set('auditAction', 'venue.update')
    ctx.set('auditTargetId', id)
    ctx.set('auditActorId', getAuthUser(ctx).userId)

    return ctx.json({ success: true, data: updated })
  },
)

// DELETE /v1/admin/venues/:id — soft delete (set active = false)
venuesAdminRouter.delete('/:id', async (ctx) => {
  const { id } = ctx.req.param()

  const [existing] = await db.select().from(venues).where(eq(venues.id, id))
  if (!existing) {
    return ctx.json({ success: false, error: 'Venue not found' }, 404)
  }

  await db
    .update(venues)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(venues.id, id))

  ctx.set('auditAction', 'venue.deactivate')
  ctx.set('auditTargetId', id)
  ctx.set('auditActorId', getAuthUser(ctx).userId)

  return ctx.json({ success: true })
})
