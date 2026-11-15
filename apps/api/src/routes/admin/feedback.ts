import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { validationHook } from '../../lib/validator.js';
import { z } from 'zod';
import { httpUrl } from '../../lib/url-schema.js';
import { and, eq, desc, ilike, inArray, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db, feedback, userProfiles } from '@concert-crawl/db';
import {
  ADMIN_FEEDBACK_KIND_CATEGORIES,
  ADMIN_FEEDBACK_KINDS,
  ADMIN_FEEDBACK_STATUSES,
  ADMIN_FEEDBACK_VIEW_STATUSES,
  FEEDBACK_CATEGORIES,
  feedbackScreenshotOf,
  type AdminFeedbackCounts,
  type AdminFeedbackItem,
  type AdminFeedbackStatus,
} from '@concert-crawl/types';
import { containsPattern } from '../../lib/escape-like.js';
import type { DbExecutor } from '../../lib/db-executor.js';
import { getAuthUser } from '../../middleware/auth.js';
import type { AdminVariables } from './index.js';
import { idSchema } from '../../lib/id-schema.js';
import { isRecord } from '../../lib/is-record.js';

const feedbackIdSchema = z.object({ id: idSchema });

const statusSchema = z.enum(ADMIN_FEEDBACK_STATUSES);

const listQuerySchema = z
  .object({
    status: statusSchema.optional(),
    // To read / Done, admin redesign decision 3. Combines with `status` (AND).
    view: z.enum(['to_read', 'done']).optional(),
    category: z.enum(FEEDBACK_CATEGORIES).optional(),
    // A kind chip (P47-19 PR 4): bugs = bug + error_report. Combines (AND).
    kind: z.enum(ADMIN_FEEDBACK_KINDS).optional(),
    // Done's "Search feedback": a case-insensitive contains match on the
    // message, LIKE metacharacters escaped. Blank after trimming means no
    // search.
    // The cap bounds the raw input, before trimming.
    search: z
      .string()
      .max(200)
      // Postgres text can't hold NUL; refuse it here as a 400, not a 500.
      .refine((value) => !value.includes('\u0000'), 'search has a NUL')
      .trim()
      .optional()
      .transform((value) => (value ? value : undefined)),
    limit: z.coerce.number().int().min(1).max(200).default(100),
  })
  .refine(
    // A category outside the kind's would AND to an empty list; say so instead.
    ({ kind, category }) =>
      !kind ||
      !category ||
      ADMIN_FEEDBACK_KIND_CATEGORIES[kind].some((each) => each === category),
    { message: 'category is not in kind', path: ['category'] },
  );

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

// A function, not a module-level object: route unit tests mock
// `@concert-crawl/db` without `feedback`, and reading it at import time would
// fail every suite that loads the admin router.
const itemColumns = () => ({
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
  resolvedAt: feedback.resolvedAt,
});

type ItemRow = Pick<
  typeof feedback.$inferSelect,
  keyof ReturnType<typeof itemColumns>
>;

/**
 * The wire shape, with `resolvedBy` as the resolver's handle, never the Clerk
 * id (admin redesign rule 7). A resolver with no profile reads as null.
 * `AdminFeedbackItem.metadata` is typed as an object, so a non-object jsonb
 * value (never written by the feedback endpoint) reads as null.
 */
const SCREENSHOT_KEYS: ReadonlySet<string> = new Set([
  'screenshot',
  'screenshotDataUrl',
]);

/**
 * The metadata as a screen may read it: the screenshot (or the legacy
 * `screenshotDataUrl`) only when it is our own inline image format, under
 * `screenshot`. Rows stored before the write check may hold any string, and
 * no admin screen should ever be handed an unchecked one.
 */
const sanitisedMetadata = (
  metadata: Record<string, unknown>,
): Record<string, unknown> => {
  const rest = Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !SCREENSHOT_KEYS.has(key)),
  );
  const screenshot = feedbackScreenshotOf(metadata);
  return screenshot === null ? rest : { ...rest, screenshot };
};

const toItem = (
  { metadata, ...row }: ItemRow,
  handles: { submittedBy: string | null; resolvedBy: string | null },
): AdminFeedbackItem => ({
  ...row,
  metadata: isRecord(metadata) ? sanitisedMetadata(metadata) : null,
  createdAt: row.createdAt.toISOString(),
  submittedBy: handles.submittedBy,
  resolvedBy: handles.resolvedBy,
  resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
});

/**
 * Items with both handles: the submitter's and the resolver's, each read from
 * user_profiles and null when there is no profile (or no user). Never the
 * Clerk id (admin redesign rule 7).
 */
const selectItems = async (
  where: SQL | undefined,
  limit: number,
  executor: DbExecutor = db,
): Promise<AdminFeedbackItem[]> => {
  const submitter = alias(userProfiles, 'submitter');
  const resolver = alias(userProfiles, 'resolver');
  const rows = await executor
    .select({
      ...itemColumns(),
      submittedByHandle: submitter.handle,
      resolvedByHandle: resolver.handle,
    })
    .from(feedback)
    .leftJoin(submitter, eq(submitter.userId, feedback.userId))
    .leftJoin(resolver, eq(resolver.userId, feedback.resolvedBy))
    .where(where)
    .orderBy(desc(feedback.createdAt), desc(feedback.id))
    .limit(limit);

  return rows.map(({ submittedByHandle, resolvedByHandle, ...row }) =>
    toItem(row, {
      submittedBy: submittedByHandle ?? null,
      resolvedBy: resolvedByHandle ?? null,
    }),
  );
};

export const feedbackAdminRouter = new Hono<AdminVariables>();

// GET /v1/admin/feedback?view=to_read&kind=bugs&category=bug&status=unread&search=map&limit=100
feedbackAdminRouter.get(
  '/',
  zValidator('query', listQuerySchema, validationHook),
  async (ctx) => {
    const { status, view, category, kind, search, limit } =
      ctx.req.valid('query');

    const data = await selectItems(
      and(
        status ? eq(feedback.status, status) : undefined,
        view
          ? inArray(feedback.status, [...ADMIN_FEEDBACK_VIEW_STATUSES[view]])
          : undefined,
        category ? eq(feedback.category, category) : undefined,
        kind
          ? inArray(feedback.category, [
              ...ADMIN_FEEDBACK_KIND_CATEGORIES[kind],
            ])
          : undefined,
        search ? ilike(feedback.message, containsPattern(search)) : undefined,
      ),
      limit,
    );

    return ctx.json({ success: true, data });
  },
);

// GET /v1/admin/feedback/counts: `unread` for the existing badge, the To read
// and Done view totals, and each kind chip's count inside To read.
feedbackAdminRouter.get('/counts', async (ctx) => {
  const toRead = [...ADMIN_FEEDBACK_VIEW_STATUSES.to_read];
  const done = [...ADMIN_FEEDBACK_VIEW_STATUSES.done];
  const inToReadKind = (kind: keyof typeof ADMIN_FEEDBACK_KIND_CATEGORIES) =>
    sql<number>`count(*) FILTER (WHERE ${and(
      inArray(feedback.status, toRead),
      inArray(feedback.category, [...ADMIN_FEEDBACK_KIND_CATEGORIES[kind]]),
    )})::int`;
  const [result] = await db
    .select({
      unread: sql<number>`count(*) FILTER (WHERE ${feedback.status} = 'unread')::int`,
      toRead: sql<number>`count(*) FILTER (WHERE ${inArray(feedback.status, toRead)})::int`,
      done: sql<number>`count(*) FILTER (WHERE ${inArray(feedback.status, done)})::int`,
      bugs: inToReadKind('bugs'),
      ideas: inToReadKind('ideas'),
      venues: inToReadKind('venues'),
    })
    .from(feedback);

  const data: AdminFeedbackCounts = {
    unread: result?.unread ?? 0,
    toRead: result?.toRead ?? 0,
    done: result?.done ?? 0,
    kinds: {
      bugs: result?.bugs ?? 0,
      ideas: result?.ideas ?? 0,
      venues: result?.venues ?? 0,
    },
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

      // Re-sending the current status is not a transition: no audit status
      // entry, and resolved_by/at stay as they are.
      const nextStatus =
        body.status !== undefined && body.status !== current.status
          ? body.status
          : undefined;
      const transition =
        nextStatus === undefined
          ? null
          : resolvedTransition(current.status, nextStatus);

      const [row] = await tx
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
        .where(eq(feedback.id, id))
        .returning({ id: feedback.id });
      if (!row) return null;

      // Re-read through the list's select, so the answer carries both
      // handles exactly as GET does.
      const [item] = await selectItems(eq(feedback.id, id), 1, tx);
      // The row was just written in this transaction, so a miss is a bug:
      // throw, so the write rolls back rather than commit unaudited.
      if (!item) throw new Error(`feedback ${id} vanished after its update`);

      return {
        from: current.status,
        nextStatus,
        transition,
        item,
      };
    });

    if (!outcome) {
      return ctx.json({ success: false, error: 'Feedback not found' }, 404);
    }

    ctx.set('auditAction', 'feedback.update');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', actor.userId);
    if (outcome.nextStatus !== undefined) {
      ctx.set('auditMeta', {
        status: { from: outcome.from, to: outcome.nextStatus },
        ...(outcome.transition !== null && { resolved: outcome.transition }),
      });
    }

    return ctx.json({ success: true, data: outcome.item });
  },
);
