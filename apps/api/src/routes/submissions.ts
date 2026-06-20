import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { db, priceSubmissions, submissionConfirms } from '@concert-crawl/db'
import { SP_POLICY, deriveSourceCategory } from '@concert-crawl/types'
import { clerkAuth, requireAuth, getAuthUser } from '../middleware/auth.js'

export const submissionsRouter = new Hono()

// GET /v1/submissions/:id
submissionsRouter.get('/:id', clerkAuth, requireAuth, async (ctx) => {
  const { id } = ctx.req.param()

  const [submission] = await db
    .select()
    .from(priceSubmissions)
    .where(eq(priceSubmissions.id, id))
    .limit(1)

  if (!submission) {
    return ctx.json({ success: false, error: 'Not found' }, 404)
  }

  return ctx.json({ success: true, data: submission })
})

// POST /v1/submissions/:id/confirm
submissionsRouter.post('/:id/confirm', clerkAuth, requireAuth, async (ctx) => {
  const { id: submissionId } = ctx.req.param()
  const { userId } = getAuthUser(ctx)

  const [submission] = await db
    .select()
    .from(priceSubmissions)
    .where(eq(priceSubmissions.id, submissionId))
    .limit(1)

  if (!submission) {
    return ctx.json({ success: false, error: 'Not found' }, 404)
  }
  if (submission.userId === userId) {
    return ctx.json(
      { success: false, error: 'Cannot confirm your own submission' },
      403,
    )
  }

  const inserted = await db
    .insert(submissionConfirms)
    .values({ submissionId, userId })
    .onConflictDoNothing()
    .returning()

  let newStatus = submission.status
  let newCount = submission.corroborationCount

  if (inserted.length > 0) {
    const [updated] = await db
      .update(priceSubmissions)
      .set({
        corroborationCount: sql`${priceSubmissions.corroborationCount} + 1`,
        status: sql`CASE WHEN ${priceSubmissions.corroborationCount} + 1 >= ${SP_POLICY.confirmsRequired} THEN 'corroborated'::price_submission_status ELSE ${priceSubmissions.status} END`,
        updatedAt: sql`now()`,
      })
      .where(eq(priceSubmissions.id, submissionId))
      .returning({
        corroborationCount: priceSubmissions.corroborationCount,
        status: priceSubmissions.status,
      })
    if (updated) {
      newCount = updated.corroborationCount
      newStatus = updated.status
    }
  }

  return ctx.json({
    success: true,
    data: { confirms: newCount, status: newStatus },
  })
})

const disputeBodySchema = z
  .object({
    floor: z.number().int().min(SP_POLICY.floorMin).max(SP_POLICY.floorMax),
    ceiling: z.number().int().min(1).max(SP_POLICY.ceilingMax).optional(),
    vendor: z.enum([
      'AXS',
      'Ticketmaster',
      'SeatGeek',
      'DICE',
      'Eventbrite',
      'VenueBoxOffice',
    ]),
  })
  .refine((data) => !data.ceiling || data.ceiling >= data.floor, {
    message: "Ceiling can't be below floor.",
    path: ['ceiling'],
  })

// POST /v1/submissions/:id/dispute
submissionsRouter.post(
  '/:id/dispute',
  clerkAuth,
  requireAuth,
  zValidator('json', disputeBodySchema, (result, ctx) => {
    if (!result.success)
      return ctx.json(
        {
          success: false,
          error: 'Invalid input',
          details: result.error.flatten(),
        },
        400,
      )
  }),
  async (ctx) => {
    const { id: submissionId } = ctx.req.param()
    const { userId } = getAuthUser(ctx)
    const { floor, ceiling, vendor } = ctx.req.valid('json')

    const [parent] = await db
      .select()
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, submissionId))
      .limit(1)

    if (!parent) {
      return ctx.json({ success: false, error: 'Not found' }, 404)
    }
    if (parent.userId === userId) {
      return ctx.json(
        { success: false, error: 'Cannot dispute your own submission' },
        403,
      )
    }

    const [disputeRow] = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(priceSubmissions)
        .values({
          eventId: parent.eventId,
          userId,
          priceMin: String(floor),
          priceMax: ceiling != null ? String(ceiling) : null,
          tier: parent.tier,
          vendor,
          howFound: parent.howFound,
          // Dispute creates a new (tier, source_category) row. Inherit the
          // parent's sourceCategory when present; otherwise derive from the
          // new (vendor, parent.howFound) so the dispute lands with a non-
          // null source_category (matches the partial unique index semantics).
          sourceCategory:
            parent.sourceCategory ??
            deriveSourceCategory(vendor, parent.howFound),
          disputedSubmissionId: submissionId,
          status: 'pending',
        })
        .returning()

      await tx
        .update(priceSubmissions)
        .set({ status: 'disputed', updatedAt: sql`now()` })
        .where(eq(priceSubmissions.id, submissionId))

      return [created]
    })

    return ctx.json({ success: true, data: disputeRow }, 201)
  },
)

const patchBodySchema = z
  .object({
    floor: z
      .number()
      .int()
      .min(SP_POLICY.floorMin)
      .max(SP_POLICY.floorMax)
      .optional(),
    ceiling: z.number().int().min(1).max(SP_POLICY.ceilingMax).optional(),
    tier: z.enum(['GA', 'Reserved', 'VIP', 'Pit', 'Lawn']).optional(),
    vendor: z
      .enum([
        'AXS',
        'Ticketmaster',
        'SeatGeek',
        'DICE',
        'Eventbrite',
        'VenueBoxOffice',
      ])
      .optional(),
    howFound: z
      .enum(['bought_myself', 'saw_listing', 'at_the_venue'])
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field required',
  })
  .refine(
    (data) => !data.floor || !data.ceiling || data.ceiling >= data.floor,
    { message: "Ceiling can't be below floor.", path: ['ceiling'] },
  )

// PATCH /v1/submissions/:id
submissionsRouter.patch(
  '/:id',
  clerkAuth,
  requireAuth,
  zValidator('json', patchBodySchema, (result, ctx) => {
    if (!result.success)
      return ctx.json(
        {
          success: false,
          error: 'Invalid input',
          details: result.error.flatten(),
        },
        400,
      )
  }),
  async (ctx) => {
    const { id } = ctx.req.param()
    const { userId } = getAuthUser(ctx)
    const body = ctx.req.valid('json')

    const [submission] = await db
      .select()
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, id))
      .limit(1)

    if (!submission) {
      return ctx.json({ success: false, error: 'Not found' }, 404)
    }
    if (submission.userId !== userId) {
      return ctx.json({ success: false, error: 'Forbidden' }, 403)
    }
    if (submission.status !== 'pending') {
      return ctx.json(
        { success: false, error: 'Can only edit pending submissions' },
        400,
      )
    }

    const updates: Record<string, unknown> = { updatedAt: sql`now()` }
    if (body.floor != null) updates['priceMin'] = String(body.floor)
    if (body.ceiling != null) updates['priceMax'] = String(body.ceiling)
    if (body.tier != null) updates['tier'] = body.tier
    if (body.vendor != null) updates['vendor'] = body.vendor
    if (body.howFound != null) updates['howFound'] = body.howFound

    // Re-derive sourceCategory whenever vendor or howFound changes so the
    // cached category can't drift from the (vendor, howFound) heuristic.
    // Falls back to the existing values on the row when the patch leaves a
    // field unchanged.
    if (body.vendor != null || body.howFound != null) {
      updates['sourceCategory'] = deriveSourceCategory(
        body.vendor ?? submission.vendor,
        body.howFound ?? submission.howFound,
      )
    }

    const [updated] = await db
      .update(priceSubmissions)
      .set(updates)
      .where(eq(priceSubmissions.id, id))
      .returning()

    return ctx.json({ success: true, data: updated })
  },
)

// DELETE /v1/submissions/:id
submissionsRouter.delete('/:id', clerkAuth, requireAuth, async (ctx) => {
  const { id } = ctx.req.param()
  const { userId } = getAuthUser(ctx)

  const [submission] = await db
    .select()
    .from(priceSubmissions)
    .where(eq(priceSubmissions.id, id))
    .limit(1)

  if (!submission) {
    return ctx.json({ success: false, error: 'Not found' }, 404)
  }
  if (submission.userId !== userId) {
    return ctx.json({ success: false, error: 'Forbidden' }, 403)
  }

  await db.delete(priceSubmissions).where(eq(priceSubmissions.id, id))
  return ctx.body(null, 204)
})
