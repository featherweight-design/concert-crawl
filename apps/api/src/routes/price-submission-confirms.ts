import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, count, eq } from 'drizzle-orm'
import { db, priceSubmissions, submissionConfirms } from '@concert-crawl/db'
import { SP_POLICY } from '@concert-crawl/types'
import { clerkAuth, requireAuth, getAuthUser } from '../middleware/auth.js'

const confirmBodySchema = z.object({
  method: z.enum(['same-vendor', 'other-vendor', 'box-office']),
})

export const priceSubmissionConfirmsRouter = new Hono()

// POST /v1/events/:id/price-submissions/:submissionId/confirm
priceSubmissionConfirmsRouter.post(
  '/:id/price-submissions/:submissionId/confirm',
  clerkAuth,
  requireAuth,
  zValidator('json', confirmBodySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json(
        {
          success: false,
          error: 'Invalid input',
          details: result.error.flatten(),
        },
        422,
      )
    }
  }),
  async (ctx) => {
    const { id: eventId, submissionId } = ctx.req.param()
    const { userId } = getAuthUser(ctx)
    const { method } = ctx.req.valid('json')

    // Fetch the submission, verify it belongs to this event
    const [submission] = await db
      .select({
        id: priceSubmissions.id,
        eventId: priceSubmissions.eventId,
        userId: priceSubmissions.userId,
        status: priceSubmissions.status,
      })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, submissionId))
      .limit(1)

    if (!submission || submission.eventId !== eventId) {
      return ctx.json({ success: false, error: 'Submission not found' }, 404)
    }

    if (submission.status !== 'pending') {
      return ctx.json(
        { success: false, error: 'Submission is not pending' },
        400,
      )
    }

    if (submission.userId === userId) {
      return ctx.json(
        { success: false, error: 'Cannot confirm your own submission' },
        403,
      )
    }

    const [inserted] = await db
      .insert(submissionConfirms)
      .values({ submissionId, userId, method })
      .onConflictDoNothing()
      .returning()

    if (!inserted) {
      return ctx.json(
        { success: false, error: 'Already confirmed this submission' },
        409,
      )
    }

    const [countResult] = await db
      .select({ total: count() })
      .from(submissionConfirms)
      .where(eq(submissionConfirms.submissionId, submissionId))

    const confirmsCount = countResult?.total ?? 0
    const promoted = confirmsCount >= SP_POLICY.confirmsRequired

    await db
      .update(priceSubmissions)
      .set({
        corroborationCount: confirmsCount,
        ...(promoted ? { status: 'corroborated', updatedAt: new Date() } : {}),
      })
      .where(eq(priceSubmissions.id, submissionId))

    const submissionStatus = promoted ? 'corroborated' : submission.status

    return ctx.json({
      success: true,
      data: {
        confirmed: true,
        submissionStatus,
        confirmsCount,
      },
    })
  },
)
