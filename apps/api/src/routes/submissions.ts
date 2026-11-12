import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, eq, getTableColumns, inArray, sql } from 'drizzle-orm';
import {
  db,
  events,
  priceSubmissions,
  submissionConfirms,
  venues,
} from '@concert-crawl/db';
import {
  SP_POLICY,
  VENDOR_VALUES,
  deriveSourceCategory,
} from '@concert-crawl/types';
import { clerkAuth, requireAuth, getAuthUser } from '../middleware/auth.js';
import {
  PG_UNIQUE_VIOLATION,
  describeDbError,
  pendingCounterViolation,
} from '../lib/pg-errors.js';
import { idSchema } from '../lib/id-schema.js';
import { apiLogger } from '../lib/logger.js';
import {
  OTHER_UPDATE_PENDING_ERROR,
  OWN_UPDATE_PENDING_ERROR,
  UPDATE_PENDING_CODE,
  fileCounterUnderLock,
  lockParent,
  reopenPriceWhenCheckEmpty,
  settleCheckOnCounterPromotion,
} from '../lib/price-check.js';

export const submissionsRouter = new Hono();

// `price_submissions.id` is a uuid column, so an unparseable `:id` reaches
// Postgres as a cast error and surfaces as a 500 rather than the 404 the caller
// deserves. Every handler here takes the same param, so every one needs this.

// GET /v1/submissions/:id
submissionsRouter.get('/:id', clerkAuth, requireAuth, async (ctx) => {
  const parsedId = idSchema.safeParse(ctx.req.param('id'));
  if (!parsedId.success) {
    return ctx.json({ success: false, error: 'Invalid submission ID' }, 400);
  }
  const id = parsedId.data;

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
    .limit(1);

  if (!submission) {
    return ctx.json({ success: false, error: 'Not found' }, 404);
  }

  return ctx.json({ success: true, data: submission });
});

// A submission whose show is on an inactive venue is off the site, and a
// removed venue's prices are gone for good, so confirming, checking or
// editing one is refused as if it did not exist. Deleting your own still
// works, through the plain lookup in DELETE.
function selectOnActiveVenue(id: string) {
  return db
    .select(getTableColumns(priceSubmissions))
    .from(priceSubmissions)
    .innerJoin(events, eq(events.id, priceSubmissions.eventId))
    .innerJoin(
      venues,
      and(eq(venues.id, events.venueId), eq(venues.active, true)),
    )
    .where(eq(priceSubmissions.id, id))
    .limit(1);
}

// POST /v1/submissions/:id/confirm
submissionsRouter.post('/:id/confirm', clerkAuth, requireAuth, async (ctx) => {
  const parsedId = idSchema.safeParse(ctx.req.param('id'));
  if (!parsedId.success) {
    return ctx.json({ success: false, error: 'Invalid submission ID' }, 400);
  }
  const submissionId = parsedId.data;
  const { userId } = getAuthUser(ctx);

  const [submission] = await selectOnActiveVenue(submissionId);

  if (!submission) {
    return ctx.json({ success: false, error: 'Not found' }, 404);
  }
  if (submission.userId === userId) {
    return ctx.json(
      { success: false, error: 'Cannot confirm your own submission' },
      403,
    );
  }

  // Only a pending or live price takes confirms. Anything else (an archived
  // or superseded update, a price under check, a stale row) is refused:
  // the threshold CASE below would otherwise promote it straight back to
  // 'corroborated'. Lock order (lib/price-check.ts rule 4): the parent of a
  // counter first, then the row itself, re-checked under that lock.
  const CONFIRMABLE: ReadonlyArray<'pending' | 'corroborated'> = [
    'pending',
    'corroborated',
  ];
  const parentId = submission.disputedSubmissionId;
  type ConfirmOutcome =
    { kind: 'closed' } | { kind: 'done'; confirms: number; status: string };
  const outcome = await db.transaction(async (tx): Promise<ConfirmOutcome> => {
    if (parentId !== null) await lockParent(tx, parentId);
    const [locked] = await tx
      .select({
        status: priceSubmissions.status,
        corroborationCount: priceSubmissions.corroborationCount,
      })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, submissionId))
      .for('update');
    if (!locked || !CONFIRMABLE.some((status) => status === locked.status)) {
      return { kind: 'closed' };
    }

    const inserted = await tx
      .insert(submissionConfirms)
      .values({ submissionId, userId })
      .onConflictDoNothing()
      .returning();
    if (inserted.length === 0) {
      return {
        kind: 'done',
        confirms: locked.corroborationCount,
        status: locked.status,
      };
    }

    const [row] = await tx
      .update(priceSubmissions)
      .set({
        corroborationCount: sql`${priceSubmissions.corroborationCount} + 1`,
        status: sql`CASE WHEN ${priceSubmissions.corroborationCount} + 1 >= ${SP_POLICY.confirmsRequired} THEN 'corroborated'::price_submission_status ELSE ${priceSubmissions.status} END`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(priceSubmissions.id, submissionId),
          inArray(priceSubmissions.status, [...CONFIRMABLE]),
        ),
      )
      .returning({
        corroborationCount: priceSubmissions.corroborationCount,
        status: priceSubmissions.status,
      });
    if (!row) {
      // Unreachable under the row lock; throwing rolls the confirm back.
      throw new Error('Confirmed row left its confirmable status');
    }
    // A pending update that reaches the threshold wins its price check:
    // the parent and every other pending update are archived with it.
    if (
      row.status === 'corroborated' &&
      locked.status === 'pending' &&
      parentId !== null
    ) {
      await settleCheckOnCounterPromotion(tx, {
        id: submissionId,
        disputedSubmissionId: parentId,
      });
    }
    return {
      kind: 'done',
      confirms: row.corroborationCount,
      status: row.status,
    };
  });

  if (outcome.kind === 'closed') {
    return ctx.json(
      { success: false, error: 'This price is no longer open to confirm.' },
      409,
    );
  }
  return ctx.json({
    success: true,
    data: { confirms: outcome.confirms, status: outcome.status },
  });
});

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
  });

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
          details: z.flattenError(result.error),
        },
        400,
      );
  }),
  async (ctx) => {
    const parsedId = idSchema.safeParse(ctx.req.param('id'));
    if (!parsedId.success) {
      return ctx.json({ success: false, error: 'Invalid submission ID' }, 400);
    }
    const submissionId = parsedId.data;
    const { userId } = getAuthUser(ctx);
    // `vendor` is ignored on the server — see disputeBodySchema. The locked
    // price-only contest scope means the (tier, source_category) slot
    // identity is fixed; the dispute always inherits vendor from the parent.
    const { floor, ceiling } = ctx.req.valid('json');

    const [parent] = await selectOnActiveVenue(submissionId);

    if (!parent) {
      return ctx.json({ success: false, error: 'Not found' }, 404);
    }
    if (parent.userId === userId) {
      return ctx.json(
        { success: false, error: 'Cannot dispute your own submission' },
        403,
      );
    }

    // One pending counter per (parent, submitter) (B+ B9, 2026-11-11):
    // several fans may each have an update waiting on the same price, but
    // nobody can stack their own. The partial unique index
    // `price_submissions_pending_counter_user_unique_idx` (migration 0099) is
    // the source of truth; this check returns a clean 409, and the try/catch
    // below the transaction covers two racing requests from the same user.
    const [ownCounter] = await db
      .select({ id: priceSubmissions.id })
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.disputedSubmissionId, submissionId),
          eq(priceSubmissions.userId, userId),
          eq(priceSubmissions.status, 'pending'),
        ),
      )
      .limit(1);
    if (ownCounter) {
      return ctx.json(
        {
          success: false,
          error: OWN_UPDATE_PENDING_ERROR,
          code: UPDATE_PENDING_CODE,
        },
        409,
      );
    }

    const vendor = parent.vendor;

    // Filed under the parent lock (fileCounterUnderLock): the parent must
    // be live, or already under a check another fan opened. A pending,
    // stale, archived or denied price takes no update; before this, filing
    // one here and then withdrawing it reopened that price as 'corroborated'.
    try {
      const outcome = await db.transaction((tx) =>
        fileCounterUnderLock(tx, submissionId, async () => {
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
              // Dispute creates a new (tier, source_category) row. Inherit
              // the parent's sourceCategory when present; otherwise derive
              // from the new (vendor, parent.howFound) so the dispute lands
              // with a non-null source_category (matches the partial unique
              // index semantics).
              sourceCategory:
                parent.sourceCategory ??
                deriveSourceCategory(vendor, parent.howFound),
              disputedSubmissionId: submissionId,
              status: 'pending',
            })
            .returning();
          if (!created) {
            throw new Error('Dispute insert returned no rows');
          }
          return created;
        }),
      );
      if (outcome.kind === 'closed') {
        return ctx.json(
          {
            success: false,
            error: 'Can only dispute a corroborated submission',
          },
          400,
        );
      }
      return ctx.json({ success: true, data: outcome.row }, 201);
    } catch (err) {
      // Belt-and-braces: translate a unique_violation on a pending-counter
      // index into a clean 409. Drizzle wraps the postgres-js error, so the
      // helper checks both the outer error AND `err.cause`. 'any' is 0041's
      // one-per-parent index, which refuses a second fan's update until
      // migration 0100 drops it.
      const violation = pendingCounterViolation(err);
      if (violation !== null) {
        return ctx.json(
          {
            success: false,
            error:
              violation === 'own'
                ? OWN_UPDATE_PENDING_ERROR
                : OTHER_UPDATE_PENDING_ERROR,
            code: UPDATE_PENDING_CODE,
          },
          409,
        );
      }
      throw err;
    }
  },
);

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
  );

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
          details: z.flattenError(result.error),
        },
        400,
      );
  }),
  async (ctx) => {
    const parsedId = idSchema.safeParse(ctx.req.param('id'));
    if (!parsedId.success) {
      return ctx.json({ success: false, error: 'Invalid submission ID' }, 400);
    }
    const id = parsedId.data;
    const { userId } = getAuthUser(ctx);
    const body = ctx.req.valid('json');

    const [submission] = await selectOnActiveVenue(id);

    if (!submission) {
      return ctx.json({ success: false, error: 'Not found' }, 404);
    }
    if (submission.userId !== userId) {
      return ctx.json({ success: false, error: 'Forbidden' }, 403);
    }
    if (submission.status !== 'pending') {
      return ctx.json(
        { success: false, error: 'Can only edit pending submissions' },
        400,
      );
    }

    const updates: Record<string, unknown> = { updatedAt: sql`now()` };
    if (body.floor != null) updates['priceMin'] = String(body.floor);
    if (body.ceiling != null) updates['priceMax'] = String(body.ceiling);
    if (body.tier != null) updates['tier'] = body.tier;
    if (body.vendor != null) updates['vendor'] = body.vendor;
    if (body.howFound != null) updates['howFound'] = body.howFound;

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
      );
    }

    const [updated] = await db
      .update(priceSubmissions)
      .set(updates)
      .where(eq(priceSubmissions.id, id))
      .returning();

    return ctx.json({ success: true, data: updated });
  },
);

// DELETE /v1/submissions/:id
submissionsRouter.delete('/:id', clerkAuth, requireAuth, async (ctx) => {
  const parsedId = idSchema.safeParse(ctx.req.param('id'));
  if (!parsedId.success) {
    return ctx.json({ success: false, error: 'Invalid submission ID' }, 400);
  }
  const id = parsedId.data;
  const { userId } = getAuthUser(ctx);

  const [submission] = await db
    .select()
    .from(priceSubmissions)
    .where(eq(priceSubmissions.id, id))
    .limit(1);

  if (!submission) {
    return ctx.json({ success: false, error: 'Not found' }, 404);
  }
  if (submission.userId !== userId) {
    return ctx.json({ success: false, error: 'Forbidden' }, 403);
  }

  // Withdrawing an update. Lock order (lib/price-check.ts rule 4): the
  // parent first, so filing a counter, another withdrawal and a resolve all
  // serialize on it. Without that lock, two fans withdrawing the last two
  // updates at once each saw the other's still pending, neither reopened the
  // price, and it vanished (write skew); and a counter filed concurrently
  // could be missed, reopening a price with an update pending.
  const parentId = submission.disputedSubmissionId;
  await db.transaction(async (tx) => {
    if (parentId !== null) await lockParent(tx, parentId);
    const [locked] = await tx
      .select({ status: priceSubmissions.status })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, id))
      .for('update');
    await tx.delete(priceSubmissions).where(eq(priceSubmissions.id, id));
    // Withdrawing the last pending update on a price closes its check, so the
    // price goes back to live. Only a still-pending update counts: deleting
    // an archived one must not reopen anything. Savepoint: if a box-office
    // price was approved in the same slot meanwhile, the unique index refuses
    // the reopen, and the withdrawal still goes through; the box-office price
    // leads that slot.
    if (parentId !== null && locked?.status === 'pending') {
      try {
        await tx.transaction((savepoint) =>
          reopenPriceWhenCheckEmpty(savepoint, parentId),
        );
      } catch (err) {
        if (describeDbError(err).code !== PG_UNIQUE_VIOLATION) throw err;
        apiLogger.warn(
          { parentId, withdrawnId: id, db: describeDbError(err) },
          'Price check closed by withdrawal; a live box-office price holds the slot, so the old price stays out',
        );
      }
    }
  });
  return ctx.body(null, 204);
});
