import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, count, eq } from 'drizzle-orm'
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

    const [countResult] = await db
      .select({ total: count() })
      .from(submissionConfirms)
      .where(eq(submissionConfirms.submissionId, submissionId))

    const confirmsCount = countResult?.total ?? 0

    // Use the imminent threshold when the event is within
    // SP_POLICY.imminentThresholdDays — matches events.ts confirmsNeeded so
    // the UI's promotion expectation and the server's promotion behaviour agree.
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

    // 1/2 confirmation model: the submitter counts as observation #1, so the
    // total observations on this submission are `confirmsCount + 1`. Promotion
    // happens when total observations meets confirmsRequired. This brings the
    // formula into alignment with submissions.ts (which uses
    // `corroborationCount + 1 >= confirmsRequired`).
    const totalObservations = confirmsCount + 1
    const promoted = totalObservations >= confirmsRequired

    // Always bump updatedAt on a successful confirm — even when the row stays
    // pending — so consumers can use it as a freshness signal. Matches the
    // behavior of /v1/submissions/:id/confirm, which updates updatedAt on
    // every successful confirm (not just on promotion).
    await db
      .update(priceSubmissions)
      .set({
        corroborationCount: totalObservations,
        updatedAt: new Date(),
        ...(promoted ? { status: 'corroborated' } : {}),
      })
      .where(eq(priceSubmissions.id, submissionId))

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
