import { Hono } from 'hono';
import { getAuth } from '@hono/clerk-auth';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  like,
  lt,
  not,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  artists,
  auditLog,
  db,
  eventReports,
  events,
  inviteCodes,
  priceSubmissions,
  userProfiles,
  venues,
} from '@concert-crawl/db';
import { FEATURE_FLAGS } from '@concert-crawl/entitlements';
import { containsPattern } from '../../lib/escape-like.js';
import {
  AUDIT_ACTION_KEYS,
  AUDIT_AREAS,
  type AuditLogActor,
  type AuditLogItem,
} from '@concert-crawl/types';
import { handleQuerySchema, validationHook } from '../../lib/validator.js';
import { isRecord } from '../../lib/is-record.js';
import { avatarColumns, avatarOf } from '../../lib/avatar.js';
import { apiLogger } from '../../lib/logger.js';
import { MT_TIME_ZONE, todayInDenver } from '../../lib/time.js';
import { staffRoles } from './people.js';
import { addDays } from './lib/needs-you/keys.js';
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

/**
 * The action keys whose sentences the typed search matches (addendum 6 #37,
 * PR C): the web matches the words against its sentence table, which only it
 * has, and sends the keys. `?actions=a,b` or repeated. At most 200 values,
 * and an unknown key is a 400, never ignored.
 */
const actionsSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) =>
    (Array.isArray(value) ? value : [value])
      .flatMap((part) => part.split(','))
      .map((part) => part.trim())
      .filter((part) => part !== ''),
  )
  .pipe(z.array(z.enum(AUDIT_ACTION_KEYS)).max(200))
  .transform((keys) => (keys.length === 0 ? undefined : [...new Set(keys)]))
  .optional();

/** "Search the log": trimmed, 1 to 100 characters; blank is no search. */
const searchQuerySchema = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const querySchema = z
  .object({
    actor: z.enum(['system', 'admin']).optional(),
    // One admin, by the whole handle (the same filter as Prices' `handle`).
    actorHandle: handleQuerySchema,
    area: areaSchema,
    search: searchQuerySchema,
    actions: actionsSchema,
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
    const {
      actor,
      actorHandle,
      area,
      search,
      actions,
      since,
      until,
      limit,
      cursor,
    } = ctx.req.valid('query');

    let after: { at: Date; id: string } | null = null;
    if (cursor !== undefined) {
      after = decodeCursor(cursor);
      if (!after) {
        return ctx.json({ success: false, error: 'Invalid cursor' }, 400);
      }
    }

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
          actorKindFilter(actor),
          searchFilter(search, actions),
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

// The zone is inlined as a literal, as costs.ts does: the day expression sits
// in both SELECT DISTINCT and ORDER BY, and two bind parameters would break
// Postgres's matching of the two. A constant, never input.
const mtZone = () => sql.raw(`'${MT_TIME_ZONE}'`);

/** Rows from MT midnight of `startDay` up to MT midnight of `endDay`. */
const mtDays = (startDay: string, endDay: string) =>
  and(
    sql`${auditLog.createdAt} >= (${startDay}::date::timestamp AT TIME ZONE ${mtZone()})`,
    sql`${auditLog.createdAt} < (${endDay}::date::timestamp AT TIME ZONE ${mtZone()})`,
  );

/**
 * "Search the log" (addendum 6 #37, PR C): a parameterized, escaped ILIKE
 * over what a row says, plus the action keys whose sentences the web matched
 * (`actions`; the sentences live only in the web's copy). A row matches on:
 * its action key; the actor's handle or system id; the name of what it
 * changed, looked up by `target_id` as lib/audit-targets.ts names it (a
 * venue, show, artist, person, invite code, a report's or a price's show, or
 * a feature flag's label); or its metadata, which keeps a deleted target's
 * name. A leading `@` is dropped, as handles show with one.
 * Expects the caller's join on the actor's profile.
 */
const searchFilter = (
  search: string | undefined,
  actions: readonly string[] | undefined,
) => {
  if (search === undefined && actions === undefined) return undefined;
  const byAction =
    actions === undefined ? undefined : inArray(auditLog.action, [...actions]);
  if (search === undefined) return byAction;
  const words = search.replace(/^@/, '');
  if (words === '') return byAction;
  const pattern = containsPattern(words);
  const lowered = words.toLowerCase();
  const flagTargets = Object.entries(FEATURE_FLAGS)
    .filter(
      ([key, flag]) =>
        key.toLowerCase().includes(lowered) ||
        flag.label.toLowerCase().includes(lowered),
    )
    .map(([key]) => `feature_flag:${key}`);
  const targetIn = (ids: SQL) => sql`${auditLog.targetId} IN (${ids})`;
  return or(
    byAction,
    ilike(auditLog.action, pattern),
    ilike(auditLog.actorId, pattern),
    ilike(userProfiles.handle, pattern),
    sql`${auditLog.metadata}::text ILIKE ${pattern}`,
    flagTargets.length === 0
      ? undefined
      : inArray(auditLog.targetId, flagTargets),
    targetIn(
      sql`SELECT ${eventReports.id}::text FROM ${eventReports} INNER JOIN ${events} ON ${events.id} = ${eventReports.eventId} WHERE ${events.title} ILIKE ${pattern}`,
    ),
    targetIn(
      sql`SELECT ${priceSubmissions.id}::text FROM ${priceSubmissions} INNER JOIN ${events} ON ${events.id} = ${priceSubmissions.eventId} WHERE ${events.title} ILIKE ${pattern}`,
    ),
    targetIn(
      sql`SELECT ${venues.id}::text FROM ${venues} WHERE ${venues.name} ILIKE ${pattern}`,
    ),
    targetIn(
      sql`SELECT ${events.id}::text FROM ${events} WHERE ${events.title} ILIKE ${pattern}`,
    ),
    targetIn(
      sql`SELECT ${artists.id}::text FROM ${artists} WHERE ${artists.name} ILIKE ${pattern}`,
    ),
    targetIn(
      sql`SELECT ${inviteCodes.id}::text FROM ${inviteCodes} WHERE ${inviteCodes.code} ILIKE ${pattern}`,
    ),
    // A person's row keys their Clerk id. The subquery's own FROM shadows
    // the outer join on the actor's profile.
    targetIn(
      sql`SELECT ${userProfiles.userId} FROM ${userProfiles} WHERE ${userProfiles.handle} ILIKE ${pattern}`,
    ),
  );
};

/** The log's actor and area filters, shared by the list, days and actors. */
const actorKindFilter = (actor: 'system' | 'admin' | undefined) => {
  const isSystem = like(auditLog.actorId, `${SYSTEM_ACTOR_PREFIX}%`);
  if (actor === 'system') return isSystem;
  if (actor === 'admin') return not(isSystem);
  return undefined;
};

const daysQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month is YYYY-MM'),
  // The same filters as the log, so a dot never leads to an empty day.
  actor: z.enum(['system', 'admin']).optional(),
  actorHandle: handleQuerySchema,
  area: areaSchema,
  search: searchQuerySchema,
  actions: actionsSchema,
});

// GET /v1/admin/audit-log/days?month=YYYY-MM — the MT days of that month with
// at least one change: the day picker's dots.
auditLogAdminRouter.get(
  '/days',
  zValidator('query', daysQuerySchema, validationHook),
  async (ctx) => {
    const { month, actor, actorHandle, area, search, actions } =
      ctx.req.valid('query');
    const first = `${month}-01`;
    // The 1st of the next month: day 32 of any month lands in the next one.
    const next = `${addDays(first, 32).slice(0, 7)}-01`;
    const day = sql<string>`to_char(${auditLog.createdAt} AT TIME ZONE ${mtZone()}, 'YYYY-MM-DD')`;

    const rows = await db
      .selectDistinct({ day })
      .from(auditLog)
      .leftJoin(userProfiles, eq(userProfiles.userId, auditLog.actorId))
      .where(
        and(
          mtDays(first, next),
          actorKindFilter(actor),
          searchFilter(search, actions),
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
  // The page filter and the search, so a count matches the rows picking that
  // person shows.
  area: areaSchema,
  search: searchQuerySchema,
  actions: actionsSchema,
});

// GET /v1/admin/audit-log/actors?day=YYYY-MM-DD — the Anyone menu: every
// admin and sub-admin, plus anyone else who changed something that day, with
// that day's count. You first, then by count, then by handle. A person with no
// handle cannot be filtered on (the log filters by handle), so is left out.
auditLogAdminRouter.get(
  '/actors',
  zValidator('query', actorsQuerySchema, validationHook),
  async (ctx) => {
    const query = ctx.req.valid('query');
    const day = query.day ?? todayInDenver();
    const me = getAuth(ctx)?.userId ?? null;

    // Staff comes from Clerk (People's cached scan), read alongside the
    // counts. If Clerk is down the menu still lists that day's actors.
    const [counted, staff] = await Promise.all([
      db
        .select({
          actorId: auditLog.actorId,
          count: sql<number>`count(*)::int`,
        })
        .from(auditLog)
        // The search reads the actor's handle, as the list's does.
        .leftJoin(userProfiles, eq(userProfiles.userId, auditLog.actorId))
        .where(
          and(
            mtDays(day, addDays(day, 1)),
            actorKindFilter('admin'),
            query.area === undefined
              ? undefined
              : auditAreaFilter(query.area, auditLog.action),
            searchFilter(query.search, query.actions),
          ),
        )
        .groupBy(auditLog.actorId),
      staffRoles().catch((err: unknown) => {
        apiLogger.warn({ err }, 'audit-log actors: staff scan failed');
        return new Map<string, 'admin' | 'sub_admin'>();
      }),
    ]);

    const counts = new Map(counted.map((row) => [row.actorId, row.count]));
    const ids = [...new Set([...staff.keys(), ...counts.keys()])];
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
                role: staff.get(row.userId) ?? null,
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
