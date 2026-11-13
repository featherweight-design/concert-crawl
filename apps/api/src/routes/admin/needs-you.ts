// GET /v1/admin/needs-you — the admin "Needs you" queue: every decision only a
// human can make, ranked by when fans will notice. Stage 1: list, count and
// snooze, and answers with undo.

import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { adminQueueSnoozes, auditLog, db } from '@concert-crawl/db';
import { createLogger } from '@concert-crawl/logger';
import { getAuthUser } from '../../middleware/auth.js';
import { idSchema } from '../../lib/id-schema.js';
import { validationHook } from '../../lib/validator.js';
import type { NeedsYouNotUsefulSnooze } from '@concert-crawl/types';
import type { AdminVariables } from './index.js';
import { FORMER_ADMIN, adminNamesOf, nameOf } from './lib/admin-names.js';
import { ANSWER_HANDLERS, NAVIGATION_SLUGS } from './lib/needs-you/answers.js';
import {
  NEEDS_YOU_ANSWER_ACTION,
  NEEDS_YOU_UNDO_ACTION,
  countNeedsYou,
  listNeedsYou,
  summarizeNeedsYou,
} from './lib/needs-you/index.js';
import { NEEDS_YOU_KINDS, isKind, parseItemKey } from './lib/needs-you/keys.js';
import { loadNeedsYouItems } from './lib/needs-you/sources.js';

const logger = createLogger('admin:needs-you');

export const needsYouAdminRouter = new Hono<AdminVariables>();

// `z.enum` needs a non-empty tuple; the guard keeps it honest if the list is
// ever emptied.
const [firstKind, ...otherKinds] = NEEDS_YOU_KINDS;
const kindSchema = z.enum([firstKind ?? 'bug', ...otherKinds]);

const listQuerySchema = z.object({
  kind: kindSchema.optional(),
  // The venue Overview's In Needs you card (3b): one venue's items.
  venueId: idSchema.optional(),
});

const snoozesQuerySchema = z.object({ venueId: idSchema });

const snoozeIdParamSchema = z.object({ id: idSchema });

const keyParamSchema = z.object({
  key: z
    .string()
    .min(3)
    .max(300)
    .refine((key) => parseItemKey(key) !== null, 'Unknown item kind'),
});

const MAX_SNOOZE_MS = 366 * 24 * 60 * 60 * 1000;

const snoozeBodySchema = z.union([
  z
    .object({
      until: z
        .string()
        .datetime({ offset: true })
        .refine(
          (value) => Date.parse(value) > Date.now(),
          'until must be in the future',
        )
        // A snooze is for a while, not for good: a far-future value is a typo
        // (a wrong year) that would hide a decision from the queue for years.
        .refine(
          (value) => Date.parse(value) <= Date.now() + MAX_SNOOZE_MS,
          'until must be within a year',
        ),
    })
    .strict(),
  z
    .object({
      notUseful: z.literal(true),
      reason: z.string().trim().max(500).optional(),
    })
    .strict(),
]);

needsYouAdminRouter.get(
  '/',
  zValidator('query', listQuerySchema, validationHook),
  async (ctx) => {
    const { kind, venueId } = ctx.req.valid('query');
    const now = new Date();
    // A venue's own view never shows the badge, so it needs no whole-queue list:
    // only the asked-for kind's sources load, and the summary (its handled-today
    // count) is skipped, so `count` is left out. The sources still read every
    // venue and are filtered here; scoping them by venue in SQL is a follow-up.
    if (venueId !== undefined) {
      const scoped = await listNeedsYou({ now, ...(kind && { kind }) });
      return ctx.json({
        success: true,
        data: scoped.filter((item) => item.venueId === venueId),
      });
    }
    const all = await listNeedsYou({ now });
    const data =
      kind === undefined ? all : all.filter((item) => item.kind === kind);
    // The count always describes the whole queue, not the filtered view, so
    // the badge does not change when an admin narrows the list.
    return ctx.json({
      success: true,
      data,
      count: await summarizeNeedsYou(all, now),
    });
  },
);

// One venue's Not useful entries, for the venue Overview's WARNINGS YOU TURNED
// OFF (3b). Only Not useful rows are listed: a timed snooze is per item and has
// no venue card to show it on. Turn back on is DELETE /snoozes/:id.
needsYouAdminRouter.get(
  '/snoozes',
  zValidator('query', snoozesQuerySchema, validationHook),
  async (ctx) => {
    const { venueId } = ctx.req.valid('query');
    const rows = await db
      .select({
        id: adminQueueSnoozes.id,
        kind: adminQueueSnoozes.kind,
        reason: adminQueueSnoozes.reason,
        createdAt: adminQueueSnoozes.createdAt,
        createdBy: adminQueueSnoozes.createdBy,
      })
      .from(adminQueueSnoozes)
      .where(
        and(
          eq(adminQueueSnoozes.venueId, venueId),
          eq(adminQueueSnoozes.notUseful, true),
        ),
      )
      .orderBy(desc(adminQueueSnoozes.createdAt));
    const names = await adminNamesOf(rows.map((row) => row.createdBy));
    const data: NeedsYouNotUsefulSnooze[] = rows.flatMap((row) =>
      isKind(row.kind)
        ? [
            {
              id: row.id,
              kind: row.kind,
              venueId,
              reason: row.reason,
              createdAt: row.createdAt.toISOString(),
              createdByName: nameOf(names, row.createdBy) ?? FORMER_ADMIN,
            },
          ]
        : [],
    );
    return ctx.json({ success: true, data });
  },
);

// Turn back on one Not useful entry by its id. Only a Not useful row matches,
// so a timed snooze sharing the id space is never touched.
needsYouAdminRouter.delete(
  '/snoozes/:id',
  zValidator('param', snoozeIdParamSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const [removed] = await db
      .delete(adminQueueSnoozes)
      .where(
        and(
          eq(adminQueueSnoozes.id, id),
          eq(adminQueueSnoozes.notUseful, true),
        ),
      )
      .returning({
        id: adminQueueSnoozes.id,
        kind: adminQueueSnoozes.kind,
        venueId: adminQueueSnoozes.venueId,
      });
    if (!removed) {
      return ctx.json({ success: false, error: 'Snooze not found' }, 404);
    }
    ctx.set('auditAction', 'needs_you.unsnooze');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', getAuthUser(ctx).userId);
    ctx.set('auditMeta', {
      notUseful: true,
      kind: removed.kind,
      venueId: removed.venueId,
    });
    return ctx.json({ success: true, data: { id } });
  },
);

needsYouAdminRouter.get('/count', async (ctx) => {
  return ctx.json({ success: true, data: await countNeedsYou(new Date()) });
});

needsYouAdminRouter.post(
  '/items/:key/snooze',
  zValidator('param', keyParamSchema, validationHook),
  zValidator('json', snoozeBodySchema, validationHook),
  async (ctx) => {
    const { key } = ctx.req.valid('param');
    const body = ctx.req.valid('json');
    const parsedKey = parseItemKey(key);
    if (!parsedKey) {
      return ctx.json({ success: false, error: 'Unknown item kind' }, 400);
    }
    const { userId: actorId } = getAuthUser(ctx);

    // Both shapes need a key that names a current item: a typo or a stale key
    // would otherwise leave an orphan row and a misleading audit entry.
    const items = await loadNeedsYouItems({ now: new Date() }, parsedKey.kind);
    const item = items.find((candidate) => candidate.key === key);
    if (!item) {
      return ctx.json({ success: false, error: 'Item not found' }, 404);
    }

    if ('until' in body) {
      const until = new Date(body.until);
      // An expired snooze keeps its row, so a re-snooze must upsert.
      await db
        .insert(adminQueueSnoozes)
        .values({
          itemKey: key,
          kind: parsedKey.kind,
          until,
          createdBy: actorId,
        })
        .onConflictDoUpdate({
          target: adminQueueSnoozes.itemKey,
          targetWhere: sql`${adminQueueSnoozes.itemKey} is not null`,
          set: { until, createdBy: actorId, createdAt: new Date() },
        });
      ctx.set('auditAction', 'needs_you.snooze');
      ctx.set('auditTargetId', key);
      ctx.set('auditActorId', actorId);
      ctx.set('auditMeta', { until: until.toISOString() });
      return ctx.json({
        success: true,
        data: { key, until: until.toISOString() },
      });
    }

    // Not useful is per kind per venue, so it takes the venue of the item the
    // key names.
    if (item.venueId === null) {
      return ctx.json(
        { success: false, error: 'This item is not tied to a venue' },
        422,
      );
    }
    const venueId = item.venueId;
    await db
      .insert(adminQueueSnoozes)
      .values({
        kind: item.kind,
        venueId,
        notUseful: true,
        reason: body.reason ?? null,
        createdBy: actorId,
      })
      .onConflictDoUpdate({
        target: [adminQueueSnoozes.kind, adminQueueSnoozes.venueId],
        targetWhere: sql`${adminQueueSnoozes.notUseful}`,
        set: {
          reason: body.reason ?? null,
          createdBy: actorId,
          createdAt: new Date(),
        },
      });
    ctx.set('auditAction', 'needs_you.snooze');
    ctx.set('auditTargetId', key);
    ctx.set('auditActorId', actorId);
    ctx.set('auditMeta', {
      notUseful: true,
      kind: item.kind,
      venueId,
      reason: body.reason ?? null,
    });
    return ctx.json({ success: true, data: { key, notUseful: true } });
  },
);

needsYouAdminRouter.delete(
  '/items/:key/snooze',
  zValidator('param', keyParamSchema, validationHook),
  async (ctx) => {
    const { key } = ctx.req.valid('param');
    const parsedKey = parseItemKey(key);
    if (!parsedKey) {
      return ctx.json({ success: false, error: 'Unknown item kind' }, 400);
    }
    const { userId: actorId } = getAuthUser(ctx);

    const removed = await db
      .delete(adminQueueSnoozes)
      .where(eq(adminQueueSnoozes.itemKey, key))
      .returning({ id: adminQueueSnoozes.id });

    // Clearing a Not useful needs the item's venue; if the item is still a
    // current one, its kind-and-venue mute goes too.
    const items = await loadNeedsYouItems({ now: new Date() }, parsedKey.kind);
    const item = items.find((candidate) => candidate.key === key);
    let clearedNotUseful = 0;
    if (item && item.venueId !== null) {
      const cleared = await db
        .delete(adminQueueSnoozes)
        .where(
          and(
            eq(adminQueueSnoozes.kind, item.kind),
            eq(adminQueueSnoozes.venueId, item.venueId),
            eq(adminQueueSnoozes.notUseful, true),
          ),
        )
        .returning({ id: adminQueueSnoozes.id });
      clearedNotUseful = cleared.length;
    }

    ctx.set('auditAction', 'needs_you.unsnooze');
    ctx.set('auditTargetId', key);
    ctx.set('auditActorId', actorId);
    // Reported apart: dropping the kind-and-venue mute reaches every item of
    // that kind at that venue, and the admin should see that they did it.
    ctx.set('auditMeta', {
      clearedSnoozes: removed.length,
      clearedNotUseful,
    });
    return ctx.json({
      success: true,
      data: { key, clearedSnoozes: removed.length, clearedNotUseful },
    });
  },
);

const answerBodySchema = z.looseObject({
  answer: z.string().trim().min(1).max(64),
});

const answerRecordSchema = z.object({
  slug: z.string(),
  kind: z.string(),
  before: z.record(z.string(), z.unknown()).nullable(),
});

// POST /v1/admin/needs-you/items/:key/answer — `{ answer: <slug>, ...params }`.
// Writes its own audit row (not the middleware's) so the response can name the
// row an undo points at.
needsYouAdminRouter.post(
  '/items/:key/answer',
  zValidator('param', keyParamSchema, validationHook),
  zValidator('json', answerBodySchema, validationHook),
  async (ctx) => {
    const { key } = ctx.req.valid('param');
    const { answer: slug, ...params } = ctx.req.valid('json');
    const parsedKey = parseItemKey(key);
    if (!parsedKey) {
      return ctx.json({ success: false, error: 'Unknown item kind' }, 400);
    }
    const actorId = getAuthUser(ctx).userId;

    // The key must still name a current item: an answer is to a live question.
    const items = await loadNeedsYouItems({ now: new Date() }, parsedKey.kind);
    const item = items.find((candidate) => candidate.key === key);
    if (!item) {
      return ctx.json({ success: false, error: 'Item not found' }, 404);
    }

    const option = item.answers.find((candidate) => candidate.slug === slug);
    if (!option) {
      return ctx.json(
        {
          success: false,
          error: `Answer not offered for this item. Allowed: ${item.answers.map((candidate) => candidate.slug).join(', ')}`,
          allowed: item.answers.map((candidate) => candidate.slug),
        },
        400,
      );
    }
    if (NAVIGATION_SLUGS.has(slug)) {
      return ctx.json(
        {
          success: false,
          error: 'This answer is navigation only, not an endpoint',
          code: 'navigation',
        },
        400,
      );
    }
    const handler = ANSWER_HANDLERS.get(slug);
    if (!handler || !handler.kinds.includes(item.kind)) {
      return ctx.json(
        { success: false, error: 'This answer has no handler' },
        400,
      );
    }

    const outcome = await handler.run(item, params, actorId);
    if (!outcome.ok) {
      return ctx.json(
        {
          success: false,
          error: outcome.error,
          ...(outcome.code === undefined ? {} : { code: outcome.code }),
        },
        outcome.status,
      );
    }

    // Notifying and non-undoable answers record no prior state.
    const before =
      option.undoable && !option.notifiesFans ? outcome.before : null;
    // The answer has already committed by here. A failing audit insert is
    // logged loudly and the answer still reports success (without an undo):
    // a 500 would invite a retry of an action that already happened.
    let auditId: string | null = null;
    try {
      const [audit] = await db
        .insert(auditLog)
        .values({
          actorId,
          action: NEEDS_YOU_ANSWER_ACTION,
          targetId: key,
          metadata: {
            slug,
            kind: item.kind,
            before,
            params: outcome.params,
            ...(outcome.result ? { result: outcome.result } : {}),
          },
        })
        .returning({ id: auditLog.id });
      auditId = audit?.id ?? null;
    } catch (err: unknown) {
      logger.error(
        { err, key, slug, actorId },
        'needs-you answer applied but its audit row failed',
      );
    }

    return ctx.json({
      success: true,
      data: {
        key,
        slug,
        auditId,
        undoable: before !== null && auditId !== null,
        ...(outcome.result ? { result: outcome.result } : {}),
      },
    });
  },
);

const undoParamSchema = z.object({ auditId: idSchema });

// POST /v1/admin/needs-you/answers/:auditId/undo — take back an undoable
// answer. No expiry; refused with 409 once the item's state has moved on.
needsYouAdminRouter.post(
  '/answers/:auditId/undo',
  zValidator('param', undoParamSchema, validationHook),
  async (ctx) => {
    const { auditId } = ctx.req.valid('param');
    const actorId = getAuthUser(ctx).userId;

    const [original] = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.id, auditId),
          eq(auditLog.action, NEEDS_YOU_ANSWER_ACTION),
        ),
      );
    if (!original) {
      return ctx.json({ success: false, error: 'Answer not found' }, 404);
    }
    const record = answerRecordSchema.safeParse(original.metadata);
    if (!record.success) {
      return ctx.json(
        { success: false, error: 'The recorded answer is unreadable' },
        422,
      );
    }
    const { slug, kind, before } = record.data;
    const handler = ANSWER_HANDLERS.get(slug);
    if (!handler?.undo || before === null) {
      return ctx.json(
        { success: false, error: 'This answer cannot be undone' },
        400,
      );
    }
    const undo = handler.undo;

    // The advisory lock serializes two undos of one answer, so the
    // already-undone check and the undo audit row cannot interleave.
    const outcome = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`needs-you-undo:${auditId}`}))`,
      );
      const [existing] = await tx
        .select({ id: auditLog.id })
        .from(auditLog)
        .where(
          and(
            eq(auditLog.action, NEEDS_YOU_UNDO_ACTION),
            sql`${auditLog.metadata}->>'answerAuditId' = ${auditId}`,
          ),
        )
        .limit(1);
      if (existing) {
        return {
          ok: false as const,
          status: 409 as const,
          error: 'Already undone',
        };
      }
      const result = await undo(before, actorId);
      if (!result.ok) return result;
      const [row] = await tx
        .insert(auditLog)
        .values({
          actorId,
          action: NEEDS_YOU_UNDO_ACTION,
          targetId: original.targetId,
          metadata: {
            answerAuditId: auditId,
            slug,
            kind,
            restored: result.restored,
          },
        })
        .returning({ id: auditLog.id });
      return { ok: true as const, undoAuditId: row?.id ?? null };
    });

    if (!outcome.ok) {
      return ctx.json({ success: false, error: outcome.error }, outcome.status);
    }
    return ctx.json({
      success: true,
      data: { auditId, undoAuditId: outcome.undoAuditId },
    });
  },
);
