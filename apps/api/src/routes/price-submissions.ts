import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, desc, eq, gte, ne, sql } from 'drizzle-orm'
import { db, events, priceSubmissions, userRoles } from '@concert-crawl/db'
import { clerkAuth, requireAuth, getAuthUser } from '../middleware/auth.js'

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
    .select({
      id: priceSubmissions.id,
      eventId: priceSubmissions.eventId,
      priceMin: priceSubmissions.priceMin,
      priceMax: priceSubmissions.priceMax,
      tierLabel: priceSubmissions.tierLabel,
      sourceNote: priceSubmissions.sourceNote,
      status: priceSubmissions.status,
      corroborationCount: priceSubmissions.corroborationCount,
      createdAt: priceSubmissions.createdAt,
    })
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
  clerkAuth,
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
    const corroborating = existing.filter((sub) => {
      const diff =
        Math.abs(parseFloat(sub.priceMin) - body.priceMin) / body.priceMin
      return diff <= tolerance
    })

    if (corroborating.length > 0) {
      // Mark the new submission as corroborated
      await db
        .update(priceSubmissions)
        .set({
          status: 'corroborated',
          corroborationCount: corroborating.length,
          updatedAt: sql`now()`,
        })
        .where(eq(priceSubmissions.id, newSub.id))

      // Update existing matching submissions and award cred
      for (const sub of corroborating) {
        await db
          .update(priceSubmissions)
          .set({
            status: 'corroborated',
            corroborationCount: sub.corroborationCount + 1,
            updatedAt: sql`now()`,
          })
          .where(eq(priceSubmissions.id, sub.id))

        if (sub.userId) {
          // TODO: if the user has no user_roles row (registered but never assigned a role),
          // this UPDATE silently affects 0 rows and cred is lost. Consider insert-on-conflict.
          await db
            .update(userRoles)
            .set({
              priceCredScore: sql`${userRoles.priceCredScore} + 1`,
            })
            .where(eq(userRoles.userId, sub.userId))
        }
      }
    }

    return ctx.json({ success: true, data: newSub }, 201)
  },
)
