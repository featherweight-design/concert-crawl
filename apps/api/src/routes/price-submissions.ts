import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, desc, eq, gte, ne, sql } from 'drizzle-orm'
import { db, events, priceSubmissions, userRoles } from '@concert-crawl/db'
import { requireAuth, getAuthUser } from '../middleware/auth.js'

const submissionBodySchema = z.object({
  priceMin: z.number().positive(),
  priceMax: z.number().positive().optional(),
  tierLabel: z.string().max(50).optional(),
  sourceNote: z.string().max(200).optional(),
})

export const priceSubmissionsRouter = new Hono()

// GET /v1/events/:id/price-submissions — public list of corroborated submissions
priceSubmissionsRouter.get('/:id/price-submissions', async (ctx) => {
  const { id } = ctx.req.param()

  const rows = await db
    .select()
    .from(priceSubmissions)
    .where(
      and(
        eq(priceSubmissions.eventId, id),
        eq(priceSubmissions.status, 'corroborated'),
      ),
    )
    .orderBy(desc(priceSubmissions.createdAt))
    .limit(10)

  return ctx.json({ success: true, data: rows })
})

// POST /v1/events/:id/price-submissions — authenticated users submit price data
priceSubmissionsRouter.post(
  '/:id/price-submissions',
  requireAuth,
  zValidator('json', submissionBodySchema, (result, ctx) => {
    if (!result.success)
      return ctx.json({ success: false, error: 'Invalid input' }, 422)
  }),
  async (ctx) => {
    const { id: eventId } = ctx.req.param()
    const userId = getAuthUser(ctx).userId
    const body = ctx.req.valid('json')

    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1)
    if (!event)
      return ctx.json({ success: false, error: 'Event not found' }, 404)

    const [newSub] = await db
      .insert(priceSubmissions)
      .values({
        eventId,
        userId,
        priceMin: String(body.priceMin),
        priceMax: body.priceMax != null ? String(body.priceMax) : null,
        tierLabel: body.tierLabel ?? null,
        sourceNote: body.sourceNote ?? null,
      })
      .returning()
    if (!newSub)
      return ctx.json(
        { success: false, error: 'Failed to create submission' },
        500,
      )

    // Corroboration check: find pending submissions from other users in the last 7 days
    // that are within 15% of the submitted price
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const existing = await db
      .select()
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.eventId, eventId),
          ne(priceSubmissions.userId, userId),
          eq(priceSubmissions.status, 'pending'),
          gte(priceSubmissions.createdAt, sevenDaysAgo),
        ),
      )

    const tolerance = 0.15
    const corroborating = existing.filter((s) => {
      const diff =
        Math.abs(parseFloat(s.priceMin) - body.priceMin) / body.priceMin
      return diff <= tolerance
    })

    if (corroborating.length > 0) {
      // Mark the new submission as corroborated
      await db
        .update(priceSubmissions)
        .set({ status: 'corroborated', updatedAt: sql`now()` })
        .where(eq(priceSubmissions.id, newSub.id))

      // Update existing matching submissions and award cred
      for (const s of corroborating) {
        const wasFirstCorroboration = s.corroborationCount === 0
        await db
          .update(priceSubmissions)
          .set({
            status: 'corroborated',
            corroborationCount: s.corroborationCount + 1,
            updatedAt: sql`now()`,
          })
          .where(eq(priceSubmissions.id, s.id))

        const credDelta = wasFirstCorroboration ? 10 : 2
        // TODO: if the user has no user_roles row (registered but never assigned a role),
        // this UPDATE silently affects 0 rows and cred is lost. Consider insert-on-conflict.
        await db
          .update(userRoles)
          .set({
            priceCredScore: sql`${userRoles.priceCredScore} + ${credDelta}`,
          })
          .where(eq(userRoles.userId, s.userId))
      }
    }

    return ctx.json({ success: true, data: newSub }, 201)
  },
)
