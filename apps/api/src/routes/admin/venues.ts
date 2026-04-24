import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, venues } from '@concert-crawl/db'
import { eq } from 'drizzle-orm'
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

// GET /v1/admin/venues — list all venues
venuesAdminRouter.get('/', async (c) => {
  const allVenues = await db.select().from(venues).orderBy(venues.name)
  return c.json({ success: true, data: allVenues })
})

// GET /v1/admin/venues/:id — get single venue
venuesAdminRouter.get('/:id', async (c) => {
  const { id } = c.req.param()
  const [venue] = await db.select().from(venues).where(eq(venues.id, id))

  if (!venue) {
    return c.json({ success: false, error: 'Venue not found' }, 404)
  }

  return c.json({ success: true, data: venue })
})

// POST /v1/admin/venues — create venue
venuesAdminRouter.post(
  '/',
  zValidator('json', createVenueSchema),
  async (c) => {
    const body = c.req.valid('json')

    const [venue] = await db.insert(venues).values(body).returning()

    if (!venue) {
      return c.json(
        { success: false, error: 'Venue created but no row was returned' },
        500,
      )
    }

    c.set('auditAction', 'venue.create')
    c.set('auditTargetId', venue.id)
    c.set('auditActorId', getAuthUser(c).userId)

    return c.json({ success: true, data: venue }, 201)
  },
)

// PATCH /v1/admin/venues/:id — update venue
venuesAdminRouter.patch(
  '/:id',
  zValidator('json', updateVenueSchema),
  async (c) => {
    const { id } = c.req.param()
    const body = c.req.valid('json')

    const [existing] = await db.select().from(venues).where(eq(venues.id, id))
    if (!existing) {
      return c.json({ success: false, error: 'Venue not found' }, 404)
    }

    const [updated] = await db
      .update(venues)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(venues.id, id))
      .returning()

    c.set('auditAction', 'venue.update')
    c.set('auditTargetId', id)
    c.set('auditActorId', getAuthUser(c).userId)

    return c.json({ success: true, data: updated })
  },
)

// DELETE /v1/admin/venues/:id — soft delete (set active = false)
venuesAdminRouter.delete('/:id', async (c) => {
  const { id } = c.req.param()

  const [existing] = await db.select().from(venues).where(eq(venues.id, id))
  if (!existing) {
    return c.json({ success: false, error: 'Venue not found' }, 404)
  }

  await db
    .update(venues)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(venues.id, id))

  c.set('auditAction', 'venue.deactivate')
  c.set('auditTargetId', id)
  c.set('auditActorId', getAuthUser(c).userId)

  return c.json({ success: true })
})
