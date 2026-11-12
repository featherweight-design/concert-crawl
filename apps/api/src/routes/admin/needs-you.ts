// GET /v1/admin/needs-you — the admin "Needs you" queue: every decision only a
// human can make, ranked by when fans will notice. Stage 1: list, count and
// snooze. Answering is a later stage.

import { zValidator } from '@hono/zod-validator';
import { and, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { adminQueueSnoozes, db } from '@concert-crawl/db';
import { getAuthUser } from '../../middleware/auth.js';
import { validationHook } from '../../lib/validator.js';
import type { AdminVariables } from './index.js';
import {
  countNeedsYou,
  listNeedsYou,
  summarizeNeedsYou,
} from './lib/needs-you/index.js';
import { NEEDS_YOU_KINDS, parseItemKey } from './lib/needs-you/keys.js';
import { loadNeedsYouItems } from './lib/needs-you/sources.js';

export const needsYouAdminRouter = new Hono<AdminVariables>();

// `z.enum` needs a non-empty tuple; the guard keeps it honest if the list is
// ever emptied.
const [firstKind, ...otherKinds] = NEEDS_YOU_KINDS;
const kindSchema = z.enum([firstKind ?? 'bug', ...otherKinds]);

const listQuerySchema = z.object({ kind: kindSchema.optional() });

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
    const { kind } = ctx.req.valid('query');
    const now = new Date();
    // The count always describes the whole queue, not the filtered view, so the
    // badge does not change when an admin narrows the list.
    const all = await listNeedsYou({ now });
    const data =
      kind === undefined ? all : all.filter((item) => item.kind === kind);
    return ctx.json({
      success: true,
      data,
      count: await summarizeNeedsYou(all, now),
    });
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
