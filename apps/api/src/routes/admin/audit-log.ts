import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, desc, eq, gte, like, lt, not, or, sql } from 'drizzle-orm';
import { auditLog, db, userProfiles } from '@concert-crawl/db';
import type { AuditLogItem } from '@concert-crawl/types';
import { validationHook } from '../../lib/validator.js';
import type { AdminVariables } from './index.js';

// GET-only: the admin audit middleware skips reads. Done for you reads the
// system rows here, and the Activity log reuses it. The actor is a handle or a
// `system:` name, never a Clerk id.

export const auditLogAdminRouter = new Hono<AdminVariables>();

const SYSTEM_ACTOR_PREFIX = 'system:';
const ADMIN_FALLBACK_ACTOR = 'an admin';

const querySchema = z.object({
  actor: z.enum(['system', 'admin']).optional(),
  since: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().min(1).max(200).optional(),
});

// Keyset cursor over (created_at, id), both newest first. Postgres keeps
// microseconds and a JS Date keeps milliseconds, so rows are ordered and
// compared on the millisecond-truncated time: the cursor then names exactly
// the position it was read from, and no row is skipped or repeated.
const createdMs = sql<Date>`date_trunc('milliseconds', ${auditLog.createdAt})`;

const cursorSchema = z.object({ at: z.iso.datetime(), id: z.guid() });

const encodeCursor = (at: Date, id: string): string =>
  Buffer.from(JSON.stringify({ at: at.toISOString(), id })).toString(
    'base64url',
  );

const decodeCursor = (raw: string): { at: Date; id: string } | null => {
  try {
    const parsed = cursorSchema.safeParse(
      JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')),
    );
    return parsed.success
      ? { at: new Date(parsed.data.at), id: parsed.data.id }
      : null;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

auditLogAdminRouter.get(
  '/',
  zValidator('query', querySchema, validationHook),
  async (ctx) => {
    const { actor, since, limit, cursor } = ctx.req.valid('query');

    let after: { at: Date; id: string } | null = null;
    if (cursor !== undefined) {
      after = decodeCursor(cursor);
      if (!after) {
        return ctx.json({ success: false, error: 'Invalid cursor' }, 400);
      }
    }

    const isSystem = like(auditLog.actorId, `${SYSTEM_ACTOR_PREFIX}%`);
    const rows = await db
      .select({
        id: auditLog.id,
        actorId: auditLog.actorId,
        handle: userProfiles.handle,
        action: auditLog.action,
        targetId: auditLog.targetId,
        metadata: auditLog.metadata,
        createdAt: createdMs,
      })
      .from(auditLog)
      .leftJoin(userProfiles, eq(userProfiles.userId, auditLog.actorId))
      .where(
        and(
          actor === 'system' ? isSystem : undefined,
          actor === 'admin' ? not(isSystem) : undefined,
          since === undefined
            ? undefined
            : gte(auditLog.createdAt, new Date(since)),
          after === null
            ? undefined
            : or(
                lt(createdMs, after.at),
                and(eq(createdMs, after.at), lt(auditLog.id, after.id)),
              ),
        ),
      )
      .orderBy(desc(createdMs), desc(auditLog.id))
      .limit(limit + 1);

    const page = rows.slice(0, limit);
    const last = page.at(-1);
    const nextCursor =
      rows.length > limit && last
        ? encodeCursor(new Date(last.createdAt), last.id)
        : null;

    const data: AuditLogItem[] = page.map((row) => {
      const system = row.actorId.startsWith(SYSTEM_ACTOR_PREFIX);
      return {
        id: row.id,
        actor: system ? row.actorId : (row.handle ?? ADMIN_FALLBACK_ACTOR),
        actorKind: system ? 'system' : 'admin',
        action: row.action,
        targetId: row.targetId,
        metadata: isRecord(row.metadata) ? row.metadata : null,
        createdAt: new Date(row.createdAt).toISOString(),
      };
    });

    return ctx.json({ success: true, data, nextCursor });
  },
);
