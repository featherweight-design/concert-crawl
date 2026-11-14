import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { validationHook } from '../../lib/validator.js';
import { z } from 'zod';
import { httpUrl } from '../../lib/url-schema.js';
import { and, eq, desc, inArray, sql, type SQL } from 'drizzle-orm';
import { db, feedback, userProfiles } from '@concert-crawl/db';
import {
  ADMIN_FEEDBACK_STATUSES,
  ADMIN_FEEDBACK_VIEW_STATUSES,
  FEEDBACK_CATEGORIES,
  type AdminFeedbackCounts,
  type AdminFeedbackItem,
  type AdminFeedbackStatus,
} from '@concert-crawl/types';
import { getAuthUser } from '../../middleware/auth.js';
import type { AdminVariables } from './index.js';
import { idSchema } from '../../lib/id-schema.js';

const feedbackIdSchema = z.object({ id: idSchema });

const statusSchema = z.enum(ADMIN_FEEDBACK_STATUSES);

const listQuerySchema = z.object({
  status: statusSchema.optional(),
  // To read / Done, admin redesign decision 3. Combines with `status` (AND).
  view: z.enum(['to_read', 'done']).optional(),
  category: z.enum(FEEDBACK_CATEGORIES).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const patchBodySchema = z.object({
  status: statusSchema.optional(),
  adminNotes: z.string().nullable().optional(),
  issueUrl: z.union([httpUrl(), z.null()]).optional(),
});

const DONE_STATUSES: readonly AdminFeedbackStatus[] =
  ADMIN_FEEDBACK_VIEW_STATUSES.done;

const isDone = (status: AdminFeedbackStatus): boolean =>
  DONE_STATUSES.includes(status);

type ResolvedTransition = 'resolved' | 'reopened' | null;

/**
 * Moving from To read into Done records who and when; moving from Done back to
 * To read clears both. A move within Done (resolved to archived, say) keeps the
 * original resolver, because the item was already done.
 */
const resolvedTransition = (
  from: AdminFeedbackStatus,
  to: AdminFeedbackStatus,
): ResolvedTransition => {
  if (!isDone(from) && isDone(to)) return 'resolved';
  if (isDone(from) && !isDone(to)) return 'reopened';
  return null;
};

/**
 * Feedback rows with `resolvedBy` as the resolver's handle, never the Clerk
 * id (admin redesign rule 7). A resolver with no profile reads as null.
 */
const selectItems = async (
  where: SQL | undefined,
  limit: number,
): Promise<AdminFeedbackItem[]> => {
  const rows = await db
    .select({
      id: feedback.id,
      userId: feedback.userId,
      pageUrl: feedback.pageUrl,
      category: feedback.category,
      message: feedback.message,
      metadata: feedback.metadata,
      status: feedback.status,
      adminNotes: feedback.adminNotes,
      issueUrl: feedback.issueUrl,
      createdAt: feedback.createdAt,
      resolvedByHandle: userProfiles.handle,
      resolvedAt: feedback.resolvedAt,
    })
    .from(feedback)
    .leftJoin(userProfiles, eq(userProfiles.userId, feedback.resolvedBy))
    .where(where)
    .orderBy(desc(feedback.createdAt), desc(feedback.id))
    .limit(limit);

  return rows.map(({ resolvedByHandle, metadata, ...row }) => ({
    ...row,
    metadata: isRecord(metadata) ? metadata : null,
    createdAt: row.createdAt.toISOString(),
    resolvedBy: resolvedByHandle ?? null,
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
  }));
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const feedbackAdminRouter = new Hono<AdminVariables>();

// GET /v1/admin/feedback?view=to_read&category=bug&status=unread&limit=100
feedbackAdminRouter.get(
  '/',
  zValidator('query', listQuerySchema, validationHook),
  async (ctx) => {
    const { status, view, category, limit } = ctx.req.valid('query');

    const data = await selectItems(
      and(
        status ? eq(feedback.status, status) : undefined,
        view
          ? inArray(feedback.status, [...ADMIN_FEEDBACK_VIEW_STATUSES[view]])
          : undefined,
        category ? eq(feedback.category, category) : undefined,
      ),
      limit,
    );

    return ctx.json({ success: true, data });
  },
);

// GET /v1/admin/feedback/counts: `unread` for the existing badge, plus the
// To read and Done view totals.
feedbackAdminRouter.get('/counts', async (ctx) => {
  const toRead = [...ADMIN_FEEDBACK_VIEW_STATUSES.to_read];
  const done = [...ADMIN_FEEDBACK_VIEW_STATUSES.done];
  const [result] = await db
    .select({
      unread: sql<number>`count(*) FILTER (WHERE ${feedback.status} = 'unread')::int`,
      toRead: sql<number>`count(*) FILTER (WHERE ${inArray(feedback.status, toRead)})::int`,
      done: sql<number>`count(*) FILTER (WHERE ${inArray(feedback.status, done)})::int`,
    })
    .from(feedback);

  const data: AdminFeedbackCounts = {
    unread: result?.unread ?? 0,
    toRead: result?.toRead ?? 0,
    done: result?.done ?? 0,
  };
  return ctx.json({ success: true, data });
});

// PATCH /v1/admin/feedback/:id: update status, adminNotes, issueUrl. A status
// move into Done records the acting admin in resolved_by/resolved_at; a move
// back to To read clears them.
feedbackAdminRouter.patch(
  '/:id',
  zValidator('param', feedbackIdSchema, validationHook),
  zValidator('json', patchBodySchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const body = ctx.req.valid('json');
    const actor = getAuthUser(ctx);

    if (
      body.status === undefined &&
      body.adminNotes === undefined &&
      body.issueUrl === undefined
    ) {
      return ctx.json({ success: false, error: 'No fields to update' }, 400);
    }

    const outcome = await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ status: feedback.status })
        .from(feedback)
        .where(eq(feedback.id, id))
        .for('update');
      if (!current) return null;

      const transition =
        body.status === undefined
          ? null
          : resolvedTransition(current.status, body.status);

      await tx
        .update(feedback)
        .set({
          ...(body.status !== undefined && { status: body.status }),
          ...(body.adminNotes !== undefined && {
            adminNotes: body.adminNotes,
          }),
          ...(body.issueUrl !== undefined && { issueUrl: body.issueUrl }),
          ...(transition === 'resolved' && {
            resolvedBy: actor.userId,
            resolvedAt: new Date(),
          }),
          ...(transition === 'reopened' && {
            resolvedBy: null,
            resolvedAt: null,
          }),
        })
        .where(eq(feedback.id, id));

      return { from: current.status, transition };
    });

    if (!outcome) {
      return ctx.json({ success: false, error: 'Feedback not found' }, 404);
    }

    ctx.set('auditAction', 'feedback.update');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', actor.userId);
    if (body.status !== undefined) {
      ctx.set('auditMeta', {
        status: { from: outcome.from, to: body.status },
        ...(outcome.transition !== null && { resolved: outcome.transition }),
      });
    }

    const [updated] = await selectItems(eq(feedback.id, id), 1);
    return ctx.json({ success: true, data: updated });
  },
);
