import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import {
  db,
  events,
  priceSubmissions,
  submissionConfirms,
} from '@concert-crawl/db'
import { SP_POLICY } from '@concert-crawl/types'
import { clerkAuth, requireAuth, getAuthUser } from '../middleware/auth.js'
import { isImminentEvent } from '../lib/time.js'

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
        priceMin: priceSubmissions.priceMin,
        priceMax: priceSubmissions.priceMax,
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

    // Look up the event date once — needed for the imminent-threshold branch
    // both in the UPDATE's CASE and in the response.
    const [eventRow] = await db
      .select({ date: events.date })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.hiddenFromConsumer, false)))
      .limit(1)

    const confirmsRequired = isImminentEvent(
      eventRow?.date ?? null,
      SP_POLICY.imminentThresholdDays,
    )
      ? SP_POLICY.confirmsRequiredImminent
      : SP_POLICY.confirmsRequired

    // Atomic increment + conditional promote — mirrors submissions.ts so
    // concurrent confirms from different users can't both observe a stale
    // count and write the same corroborationCount value, under-counting the
    // row. corroboration_count already includes the submitter as observation
    // #1 (1/2 model + DB default 1), so the same column-increment matches
    // the formula `total observations + 1 >= confirmsRequired`.
    const [updated] = await db
      .update(priceSubmissions)
      .set({
        corroborationCount: sql`${priceSubmissions.corroborationCount} + 1`,
        status: sql`CASE
          WHEN ${priceSubmissions.corroborationCount} + 1 >= ${confirmsRequired}
            THEN 'corroborated'::price_submission_status
          ELSE ${priceSubmissions.status}
        END`,
        updatedAt: new Date(),
      })
      .where(eq(priceSubmissions.id, submissionId))
      .returning({
        corroborationCount: priceSubmissions.corroborationCount,
        status: priceSubmissions.status,
      })

    if (!updated) {
      return ctx.json({ success: false, error: 'Submission not found' }, 404)
    }

    const promoted = updated.status === 'corroborated'

    if (promoted) {
      await db
        .update(events)
        .set({
          ticketPriceMin: submission.priceMin,
          ticketPriceMax: submission.priceMax,
          priceSource: 'community',
          updatedAt: new Date(),
        })
        .where(eq(events.id, eventId))
    }

    // `confirmsCount` in the response is the count of non-submitter confirms
    // (excludes the submitter). corroborationCount = submitter + confirms, so
    // confirms = corroborationCount - 1.
    const confirmsCount = updated.corroborationCount - 1
    const submissionStatus = updated.status

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
