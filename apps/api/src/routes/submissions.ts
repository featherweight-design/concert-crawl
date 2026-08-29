import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { db, priceSubmissions, submissionConfirms } from '@concert-crawl/db'
import {
  SP_POLICY,
  VENDOR_VALUES,
  deriveSourceCategory,
} from '@concert-crawl/types'
import { clerkAuth, requireAuth, getAuthUser } from '../middleware/auth.js'
import { isPendingCounterUniqueViolation } from '../lib/pg-errors.js'

export const submissionsRouter = new Hono()

// `price_submissions.id` is a uuid column, so an unparseable `:id` reaches
// Postgres as a cast error and surfaces as a 500 rather than the 404 the caller
// deserves. Every handler here takes the same param, so every one needs this.
const submissionIdSchema = z.string().uuid()

// GET /v1/submissions/:id
submissionsRouter.get('/:id', clerkAuth, requireAuth, async (ctx) => {
  const parsedId = submissionIdSchema.safeParse(ctx.req.param('id'))
  if (!parsedId.success) {
    return ctx.json({ success: false, error: 'Invalid submission ID' }, 400)
  }
  const id = parsedId.data

  // Explicit projection, not `select()`. Submission ids are public — they ship
  // in TierHeadline — so any signed-in user can read any row by id, and a
  // `select()` here publishes every column on the table by default. Two are
  // deliberately withheld: `lastSeenBy`, another member's Clerk id, and
  // `userId`, the submitter's own (a pre-existing leak this projection closes).
  // `lastSeenAt` stays: it is a timestamp rather than an identity, and the
  // stale badge already tells the reader as much.
  const [submission] = await db
    .select({
      id: priceSubmissions.id,
      eventId: priceSubmissions.eventId,
      tier: priceSubmissions.tier,
      priceMin: priceSubmissions.priceMin,
      priceMax: priceSubmissions.priceMax,
      vendor: priceSubmissions.vendor,
      sourceCategory: priceSubmissions.sourceCategory,
      howFound: priceSubmissions.howFound,
      note: priceSubmissions.note,
      status: priceSubmissions.status,
      corroborationCount: priceSubmissions.corroborationCount,
      disputedSubmissionId: priceSubmissions.disputedSubmissionId,
      lastAdminActionAt: priceSubmissions.lastAdminActionAt,
      lastAdminActionKind: priceSubmissions.lastAdminActionKind,
      lastSeenAt: priceSubmissions.lastSeenAt,
      createdAt: priceSubmissions.createdAt,
      updatedAt: priceSubmissions.updatedAt,
    })
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
  const parsedId = submissionIdSchema.safeParse(ctx.req.param('id'))
  if (!parsedId.success) {
    return ctx.json({ success: false, error: 'Invalid submission ID' }, 400)
  }
  const submissionId = parsedId.data
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
    // Vendor is accepted-but-ignored for backwards compatibility — pre-PR-3
    // clients still pass it, and rejecting their payload would break the
    // existing dispute flow. The locked price-only contest scope means the
    // server unconditionally inherits vendor from the parent submission; this
    // field is purely a no-op now and gets dropped from the schema in the
    // Contract PR once the consumer drops it.
    vendor: z.enum(VENDOR_VALUES).optional(),
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
    const parsedId = submissionIdSchema.safeParse(ctx.req.param('id'))
    if (!parsedId.success) {
      return ctx.json({ success: false, error: 'Invalid submission ID' }, 400)
    }
    const submissionId = parsedId.data
    const { userId } = getAuthUser(ctx)
    // `vendor` is ignored on the server — see disputeBodySchema. The locked
    // price-only contest scope means the (tier, source_category) slot
    // identity is fixed; the dispute always inherits vendor from the parent.
    const { floor, ceiling } = ctx.req.valid('json')

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

    // 1-pending-counter-per-parent invariant (locked design decision — see
    // docs/superpowers/specs/2026-06-22-admin-contest-review-design.md §4.6).
    // The DB partial unique index `price_submissions_pending_counter_unique_idx`
    // (migration 0041) is the source of truth; this app-level check returns a
    // clean 409 to consumers instead of letting them race straight into the
    // raw unique_violation. The try/catch below the transaction catches the
    // narrow window where two requests race past this SELECT and only one
    // INSERT survives the index.
    const [existingCounter] = await db
      .select({ id: priceSubmissions.id })
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.disputedSubmissionId, submissionId),
          eq(priceSubmissions.status, 'pending'),
        ),
      )
      .limit(1)
    if (existingCounter) {
      return ctx.json(
        {
          success: false,
          error:
            'Another challenge is already pending against this submission.',
        },
        409,
      )
    }

    const vendor = parent.vendor

    let disputeRow: typeof priceSubmissions.$inferSelect
    try {
      disputeRow = await db.transaction(async (tx) => {
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

        if (!created) {
          throw new Error('Dispute insert returned no rows')
        }

        await tx
          .update(priceSubmissions)
          .set({ status: 'disputed', updatedAt: sql`now()` })
          .where(eq(priceSubmissions.id, submissionId))

        return created
      })
    } catch (err) {
      // Belt-and-braces: translate the DB unique_violation on the partial
      // unique index into the same clean 409 the pre-insert SELECT returns.
      // Drizzle wraps the underlying postgres-js error, so check both the
      // outer error AND `err.cause` for SQLSTATE 23505 + the index name.
      if (isPendingCounterUniqueViolation(err)) {
        return ctx.json(
          {
            success: false,
            error:
              'Another challenge is already pending against this submission.',
          },
          409,
        )
      }
      throw err
    }

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
    vendor: z.enum(VENDOR_VALUES).optional(),
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
    const parsedId = submissionIdSchema.safeParse(ctx.req.param('id'))
    if (!parsedId.success) {
      return ctx.json({ success: false, error: 'Invalid submission ID' }, 400)
    }
    const id = parsedId.data
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

    // Re-derive sourceCategory only when the existing row has NULL (legacy)
    // and vendor or howFound is changing. If the existing row already has an
    // explicit value (e.g. 'resale' picked at submit time, or a future PATCH
    // accepting sourceCategory directly), preserve it — PATCH should not
    // silently flip provenance when the API has no way to set it explicitly.
    if (
      submission.sourceCategory == null &&
      (body.vendor != null || body.howFound != null)
    ) {
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
  const parsedId = submissionIdSchema.safeParse(ctx.req.param('id'))
  if (!parsedId.success) {
    return ctx.json({ success: false, error: 'Invalid submission ID' }, 400)
  }
  const id = parsedId.data
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
