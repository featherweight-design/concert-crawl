import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, desc, eq, gt, ne, sql } from 'drizzle-orm'
import { db, events, priceSubmissions } from '@concert-crawl/db'
import { SP_POLICY } from '@concert-crawl/types'
import {
  clerkAuth,
  requireAuth,
  getAuthUser,
  getAuthOptional,
} from '../middleware/auth.js'

const submissionBodySchema = z
  .object({
    priceMin: z.number().int().min(SP_POLICY.floorMin).max(SP_POLICY.floorMax),
    priceMax: z.number().int().min(1).max(SP_POLICY.ceilingMax).optional(),
    tier: z.enum(['GA', 'Reserved', 'VIP', 'Pit', 'Lawn']),
    vendor: z.enum([
      'AXS',
      'Ticketmaster',
      'SeatGeek',
      'DICE',
      'Eventbrite',
      'VenueBoxOffice',
    ]),
    howFound: z.enum(['bought_myself', 'saw_listing', 'at_the_venue']),
  })
  .refine((data) => !data.priceMax || data.priceMax >= data.priceMin, {
    message: "Ceiling can't be below floor.",
    path: ['priceMax'],
  })

export const priceSubmissionsRouter = new Hono()

// GET /v1/events/:id/price-submissions — optional auth; returns all non-stale submissions
priceSubmissionsRouter.get('/:id/price-submissions', clerkAuth, async (ctx) => {
  const { id: eventId } = ctx.req.param()
  const authUser = getAuthOptional(ctx)
  const userId = authUser?.userId ?? null

  const subRows = await db
    .select({
      id: priceSubmissions.id,
      eventId: priceSubmissions.eventId,
      userId: priceSubmissions.userId,
      priceMin: priceSubmissions.priceMin,
      priceMax: priceSubmissions.priceMax,
      tier: priceSubmissions.tier,
      vendor: priceSubmissions.vendor,
      howFound: priceSubmissions.howFound,
      disputedSubmissionId: priceSubmissions.disputedSubmissionId,
      status: priceSubmissions.status,
      corroborationCount: priceSubmissions.corroborationCount,
      createdAt: priceSubmissions.createdAt,
      updatedAt: priceSubmissions.updatedAt,
      confirms: sql<number>`(
          SELECT COUNT(*)::int FROM submission_confirms
          WHERE submission_confirms.submission_id = ${priceSubmissions.id}
        )`,
      byYou: sql<boolean>`EXISTS (
          SELECT 1 FROM submission_confirms sc
          WHERE sc.submission_id = ${priceSubmissions.id}
            AND sc.user_id = ${userId}
        )`,
    })
    .from(priceSubmissions)
    .where(
      and(
        eq(priceSubmissions.eventId, eventId),
        ne(priceSubmissions.status, 'stale'),
      ),
    )
    .orderBy(desc(priceSubmissions.createdAt))

  const submissions = subRows.map((row) => ({
    ...row,
    confirms: Number(row.confirms),
    byYou: Boolean(row.byYou),
  }))

  const userSubmission =
    userId != null
      ? (submissions.find(
          (sub) => sub.userId === userId && sub.status === 'pending',
        ) ?? null)
      : null

  return ctx.json({
    success: true,
    data: {
      submissions,
      alreadySubmitted: userSubmission != null,
      userSubmission,
    },
  })
})

// POST /v1/events/:id/price-submissions — authenticated users submit price data
priceSubmissionsRouter.post(
  '/:id/price-submissions',
  clerkAuth,
  requireAuth,
  zValidator('json', submissionBodySchema, (result, ctx) => {
    if (!result.success)
      return ctx.json(
        {
          success: false,
          error: 'Invalid input',
          details: result.error.flatten(),
        },
        422,
      )
  }),
  async (ctx) => {
    const { id: eventId } = ctx.req.param()
    const { userId } = getAuthUser(ctx)
    const body = ctx.req.valid('json')

    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1)
    if (!event)
      return ctx.json({ success: false, error: 'Event not found' }, 404)

    // 409 — existing pending submission
    const existing = await db
      .select()
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.eventId, eventId),
          eq(priceSubmissions.userId, userId),
          eq(priceSubmissions.status, 'pending'),
        ),
      )
      .limit(1)
    if (existing.length > 0) {
      return ctx.json(
        {
          success: false,
          error: 'Already submitted',
          submission: existing[0],
        },
        409,
      )
    }

    // 429 — rate limit: 1 submission per user per event per 24h
    const cutoff = new Date(
      Date.now() - SP_POLICY.rateLimitHours * 60 * 60 * 1000,
    )
    const recent = await db
      .select()
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.eventId, eventId),
          eq(priceSubmissions.userId, userId),
          gt(priceSubmissions.createdAt, cutoff),
        ),
      )
      .limit(1)
    if (recent.length > 0) {
      return ctx.json(
        { success: false, error: 'Rate limit: 1 submission per 24h' },
        429,
      )
    }

    const [created] = await db
      .insert(priceSubmissions)
      .values({
        eventId,
        userId,
        priceMin: String(body.priceMin),
        priceMax: body.priceMax != null ? String(body.priceMax) : null,
        tier: body.tier,
        vendor: body.vendor,
        howFound: body.howFound,
      })
      .returning()

    return ctx.json({ success: true, data: created }, 201)
  },
)
