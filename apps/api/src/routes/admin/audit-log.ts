import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
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
import {
  AUDIT_AREAS,
  type AuditLogActor,
  type AuditLogItem,
} from '@concert-crawl/types';
import { handleQuerySchema, validationHook } from '../../lib/validator.js';
import { isRecord } from '../../lib/is-record.js';
import { avatarColumns, avatarOf } from '../../lib/avatar.js';
import { apiLogger } from '../../lib/logger.js';
import { MT_TIME_ZONE, todayInDenver } from '../../lib/time.js';
import { staffUserIds } from './people.js';
import { areaOfAction, auditAreaFilter } from './lib/audit-area.js';
import { resolveAuditTargets } from './lib/audit-targets.js';
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
        ...avatarColumns(),
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
            : auditAreaFilter(area, auditLog.action),
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
        // The actor's own colours for their PersonAvatar (addendum 6 #24);
        // a system actor has none.
        actorAvatar: system ? null : avatarOf(row),
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

// ---------------------------------------------------------------------------
// The Activity log's day picker and Anyone menu (addendum 6 #37). Days are
// Mountain Time calendar days, the same window the log reads.
// ---------------------------------------------------------------------------

/** Rows from MT midnight of `startDay` up to MT midnight of `endDay`. */
const mtDays = (startDay: string, endDay: string) =>
  and(
    sql`${auditLog.createdAt} >= (${startDay}::date::timestamp AT TIME ZONE ${MT_TIME_ZONE})`,
    sql`${auditLog.createdAt} < (${endDay}::date::timestamp AT TIME ZONE ${MT_TIME_ZONE})`,
  );

/** `YYYY-MM-DD` plus `days` calendar days. */
const addDays = (day: string, days: number): string => {
  const at = new Date(`${day}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
};

const daysQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month is YYYY-MM'),
  // The same filters as the log, so a dot never leads to an empty day.
  actorHandle: handleQuerySchema,
  area: areaSchema,
});

// GET /v1/admin/audit-log/days?month=YYYY-MM — the MT days of that month with
// at least one change: the day picker's dots.
auditLogAdminRouter.get(
  '/days',
  zValidator('query', daysQuerySchema, validationHook),
  async (ctx) => {
    const { month, actorHandle, area } = ctx.req.valid('query');
    const first = `${month}-01`;
    const next = new Date(`${first}T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const day = sql<string>`to_char(${auditLog.createdAt} AT TIME ZONE ${MT_TIME_ZONE}, 'YYYY-MM-DD')`;

    const rows = await db
      .selectDistinct({ day })
      .from(auditLog)
      .leftJoin(userProfiles, eq(userProfiles.userId, auditLog.actorId))
      .where(
        and(
          mtDays(first, next.toISOString().slice(0, 10)),
          actorHandle === undefined
            ? undefined
            : eq(userProfiles.handle, actorHandle),
          area === undefined
            ? undefined
            : auditAreaFilter(area, auditLog.action),
        ),
      )
      .orderBy(day);

    return ctx.json({ success: true, data: rows.map((row) => row.day) });
  },
);

const actorsQuerySchema = z.object({
  // The MT day the counts are for; today when absent.
  day: z.iso.date().optional(),
});

// GET /v1/admin/audit-log/actors?day=YYYY-MM-DD — the Anyone menu: every
// admin and sub-admin, plus anyone else who changed something that day, with
// that day's count. You first, then by count, then by handle. A person with no
// handle cannot be filtered on (the log filters by handle), so is left out.
auditLogAdminRouter.get(
  '/actors',
  zValidator('query', actorsQuerySchema, validationHook),
  async (ctx) => {
    const day = ctx.req.valid('query').day ?? todayInDenver();
    const me = getAuth(ctx)?.userId ?? null;

    const counted = await db
      .select({
        actorId: auditLog.actorId,
        count: sql<number>`count(*)::int`,
      })
      .from(auditLog)
      .where(
        and(
          mtDays(day, addDays(day, 1)),
          not(like(auditLog.actorId, `${SYSTEM_ACTOR_PREFIX}%`)),
        ),
      )
      .groupBy(auditLog.actorId);

    // Staff comes from Clerk (People's cached scan). If Clerk is down the
    // menu still lists everyone who changed something that day.
    let staff: string[] = [];
    try {
      staff = await staffUserIds();
    } catch (err: unknown) {
      apiLogger.warn({ err }, 'audit-log actors: staff scan failed');
    }

    const counts = new Map(counted.map((row) => [row.actorId, row.count]));
    const ids = [...new Set([...staff, ...counts.keys()])];
    const profiles =
      ids.length === 0
        ? []
        : await db
            .select({
              userId: userProfiles.userId,
              handle: userProfiles.handle,
              ...avatarColumns(),
            })
            .from(userProfiles)
            .where(inArray(userProfiles.userId, ids));

    const data: AuditLogActor[] = profiles
      .flatMap((row) =>
        row.handle === null
          ? []
          : [
              {
                handle: row.handle,
                ...avatarOf(row),
                count: counts.get(row.userId) ?? 0,
                you: row.userId === me,
              },
            ],
      )
      .sort(
        (left, right) =>
          Number(right.you) - Number(left.you) ||
          right.count - left.count ||
          left.handle.localeCompare(right.handle),
      );

    return ctx.json({ success: true, data });
  },
);
