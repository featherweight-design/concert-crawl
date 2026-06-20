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

    // Up-front event visibility check. Hidden events are treated as not
    // found everywhere else in the consumer API (see price-submissions.ts);
    // we apply the same gate here so a confirm on a hidden event can't
    // promote the row or update event prices.
    const [eventRow] = await db
      .select({ date: events.date })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.hiddenFromConsumer, false)))
      .limit(1)

    if (!eventRow) {
      return ctx.json({ success: false, error: 'Event not found' }, 404)
    }

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

    const confirmsRequired = isImminentEvent(
      eventRow.date,
      SP_POLICY.imminentThresholdDays,
    )
      ? SP_POLICY.confirmsRequiredImminent
      : SP_POLICY.confirmsRequired

    // Wrap the insert + atomic update + promote in a transaction so that:
    //   1. If the partial unique index on (event_id, tier, source_category)
    //      rejects the would-be promotion (e.g. an existing corroborated
    //      box-office row for the same event+tier), the submission_confirms
    //      row also rolls back instead of dangling.
    //   2. Concurrent confirms from different users can't both observe a
    //      stale count and write the same corroborationCount value —
    //      corroboration_count already includes the submitter as observation
    //      #1 (1/2 model + DB default 1), so the column-increment matches
    //      `total observations + 1 >= confirmsRequired`.
    let updated:
      | {
          corroborationCount: number
          status: 'pending' | 'corroborated' | 'disputed' | 'stale'
        }
      | undefined
    let alreadyConfirmed = false
    let uniqueViolation = false
    try {
      updated = await db.transaction(async (tx) => {
        const [insertedConfirm] = await tx
          .insert(submissionConfirms)
          .values({ submissionId, userId, method })
          .onConflictDoNothing()
          .returning()

        if (!insertedConfirm) {
          alreadyConfirmed = true
          return undefined
        }

        const [updatedRow] = await tx
          .update(priceSubmissions)
          .set({
            corroborationCount: sql`${priceSubmissions.corroborationCount} + 1`,
            status: sql`CASE
              WHEN ${priceSubmissions.corroborationCount} + 1 >= ${confirmsRequired}
                THEN 'corroborated'::price_submission_status
              ELSE ${priceSubmissions.status}
            END`,
            updatedAt: sql`now()`,
          })
          .where(eq(priceSubmissions.id, submissionId))
          .returning({
            corroborationCount: priceSubmissions.corroborationCount,
            status: priceSubmissions.status,
          })

        return updatedRow
      })
    } catch (error) {
      // Match by Postgres error code (more reliable than string-matching the
      // wrapped message — `.cause` isn't always populated, but `.code` is).
      // 23505 is the unique-violation SQLSTATE; the only unique constraint
      // this transaction can trip is the partial boxoffice index, so an
      // additional constraint-name check would be redundant. See
      // apps/api/src/routes/admin/events.ts for the same pattern.
      const errorCode =
        error instanceof Error && 'code' in error
          ? (error as { code?: string }).code
          : error instanceof Error &&
              error.cause instanceof Error &&
              'code' in error.cause
            ? (error.cause as { code?: string }).code
            : undefined
      if (errorCode === '23505') {
        uniqueViolation = true
      } else {
        throw error
      }
    }

    if (alreadyConfirmed) {
      return ctx.json(
        { success: false, error: 'Already confirmed this submission' },
        409,
      )
    }

    if (uniqueViolation) {
      return ctx.json(
        {
          success: false,
          error:
            'A corroborated box-office price already exists for this tier — submit a counter-price instead of confirming this one.',
        },
        409,
      )
    }

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
          updatedAt: sql`now()`,
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
