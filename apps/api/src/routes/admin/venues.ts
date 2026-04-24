import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db, venues } from '@concert-crawl/db'
import { eq } from 'drizzle-orm'
import { getAuth } from '@hono/clerk-auth'

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

export const venuesAdminRouter = new Hono()

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
    const auth = getAuth(c)

    const [venue] = await db.insert(venues).values(body).returning()

    c.set('auditAction' as never, 'venue.create')
    c.set('auditTargetId' as never, venue!.id)
    c.set('auditActorId' as never, auth!.userId)

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
    const auth = getAuth(c)

    const [existing] = await db.select().from(venues).where(eq(venues.id, id))
    if (!existing) {
      return c.json({ success: false, error: 'Venue not found' }, 404)
    }

    const [updated] = await db
      .update(venues)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(venues.id, id))
      .returning()

    c.set('auditAction' as never, 'venue.update')
    c.set('auditTargetId' as never, id)
    c.set('auditActorId' as never, auth!.userId)

    return c.json({ success: true, data: updated })
  },
)

// DELETE /v1/admin/venues/:id — soft delete (set active = false)
venuesAdminRouter.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const auth = getAuth(c)

  const [existing] = await db.select().from(venues).where(eq(venues.id, id))
  if (!existing) {
    return c.json({ success: false, error: 'Venue not found' }, 404)
  }

  await db
    .update(venues)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(venues.id, id))

  c.set('auditAction' as never, 'venue.deactivate')
  c.set('auditTargetId' as never, id)
  c.set('auditActorId' as never, auth!.userId)

  return c.json({ success: true })
})
