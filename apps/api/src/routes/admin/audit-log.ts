import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  like,
  lt,
  not,
  or,
  sql,
} from 'drizzle-orm';
import { auditLog, db, userProfiles } from '@concert-crawl/db';
import { AUDIT_AREAS, type AuditLogItem } from '@concert-crawl/types';
import { handleQuerySchema, validationHook } from '../../lib/validator.js';
import {
  areaOfAction,
  prefixesOfAreas,
  resolveAuditTargets,
} from './lib/audit-targets.js';
import type { AdminVariables } from './index.js';

// GET-only: the admin audit middleware skips reads. Done for you reads the
// system rows here, and the Activity log reuses it. The actor is a handle or a
// `system:` name, never a Clerk id.

export const auditLogAdminRouter = new Hono<AdminVariables>();

const SYSTEM_ACTOR_PREFIX = 'system:';
const ADMIN_FALLBACK_ACTOR = 'an admin';

// One or many pages: `?area=venues,people` or `?area=venues&area=people`.
// Any name outside the closed list is a 400, never silently no filter; an
// empty value (`?area=`, `?area=,`) is no filter. Repeats are collapsed, and
// the closed enum bounds the list, so there is no separate max.
const areaSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => {
    const parts = [
      ...new Set(
        (Array.isArray(value) ? value : [value])
          .flatMap((part) => part.split(','))
          .map((part) => part.trim())
          .filter((part) => part !== ''),
      ),
    ];
    return parts.length === 0 ? undefined : parts;
  })
  .pipe(z.array(z.enum(AUDIT_AREAS)).optional())
  .optional();

const querySchema = z
  .object({
    actor: z.enum(['system', 'admin']).optional(),
    // One admin, by the whole handle (the same filter as Prices' `handle`).
    actorHandle: handleQuerySchema,
    area: areaSchema,
    since: z.iso.datetime().optional(),
    // Exclusive: `since` and `until` a day apart are that day's rows.
    until: z.iso.datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().min(1).max(200).optional(),
  })
  .refine(
    ({ since, until }) =>
      since === undefined ||
      until === undefined ||
      Date.parse(until) > Date.parse(since),
    { path: ['until'], message: 'until must be after since' },
  );

// Keyset cursor over (created_at, id), both newest first. Postgres keeps
// microseconds and a JS Date keeps milliseconds, so rows are ordered and
// compared on the millisecond-truncated time: the cursor then names exactly
// the position it was read from, and no row is skipped or repeated.
// Built per call: some route tests mock drizzle-orm without `sql`, and a
// module-level use would fail those suites on import.
const createdMs = () => sql`date_trunc('milliseconds', ${auditLog.createdAt})`;

// The same instant as epoch milliseconds, read as a double so the value never
// depends on how a driver parses a timestamp expression.
const createdEpochMs = () =>
  sql<number>`(extract(epoch from ${createdMs()}) * 1000)::float8`;

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
    const { actor, actorHandle, area, since, until, limit, cursor } =
      ctx.req.valid('query');

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
        createdEpochMs: createdEpochMs(),
      })
      .from(auditLog)
      .leftJoin(userProfiles, eq(userProfiles.userId, auditLog.actorId))
      .where(
        and(
          actor === 'system' ? isSystem : undefined,
          actor === 'admin' ? not(isSystem) : undefined,
          // The joined profile's handle, so a system row never matches.
          actorHandle === undefined
            ? undefined
            : eq(userProfiles.handle, actorHandle),
          area === undefined
            ? undefined
            : inArray(
                sql`split_part(${auditLog.action}, '.', 1)`,
                prefixesOfAreas(area),
              ),
          since === undefined
            ? undefined
            : gte(auditLog.createdAt, new Date(since)),
          until === undefined
            ? undefined
            : lt(auditLog.createdAt, new Date(until)),
          after === null
            ? undefined
            : or(
                sql`${createdMs()} < ${after.at.toISOString()}::timestamptz`,
                and(
                  sql`${createdMs()} = ${after.at.toISOString()}::timestamptz`,
                  lt(auditLog.id, after.id),
                ),
              ),
        ),
      )
      .orderBy(desc(createdMs()), desc(auditLog.id))
      .limit(limit + 1);

    const page = rows.slice(0, limit);
    const last = page.at(-1);
    const nextCursor =
      rows.length > limit && last
        ? encodeCursor(new Date(Number(last.createdEpochMs)), last.id)
        : null;

    const targets = await resolveAuditTargets(page);

    const data: AuditLogItem[] = page.map((row, index) => {
      const system = row.actorId.startsWith(SYSTEM_ACTOR_PREFIX);
      return {
        id: row.id,
        actor: system ? row.actorId : (row.handle ?? ADMIN_FALLBACK_ACTOR),
        actorKind: system ? 'system' : 'admin',
        action: row.action,
        area: areaOfAction(row.action),
        targetId: row.targetId,
        target: targets[index] ?? null,
        metadata: isRecord(row.metadata) ? row.metadata : null,
        createdAt: new Date(Number(row.createdEpochMs)).toISOString(),
      };
    });

    return ctx.json({ success: true, data, nextCursor });
  },
);
