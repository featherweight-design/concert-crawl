import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  ne,
  notExists,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import {
  auditLog,
  db,
  events,
  priceSubmissions,
  userEvents,
  userProfiles,
  venues,
} from '@concert-crawl/db';
import { getAuthUser } from '../../middleware/auth.js';
import { writeContestNotifications } from '../../lib/contest-notifications.js';
import { narrowLastAdminAction } from '../../lib/last-admin-action.js';
import type { AdminVariables } from './index.js';
import { idSchema } from '../../lib/id-schema.js';
import {
  compareLeadingCounters,
  filedAtMs,
  leadingCounterOrderBy,
} from '../../lib/price-check.js';
import { resolveContest } from './lib/contest-resolve.js';

export const contestsAdminRouter = new Hono<AdminVariables>();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  // Spec §6.1 locked v1 sort to filedAt ASC; #758 amends that with an
  // explicit toggle (the admin queue's "Sort: filed-at" ghost button).
  // ASC stays the default so v1 deep-links keep their meaning.
  sort: z
    .enum(['filed-at-asc', 'filed-at-desc'])
    .optional()
    .default('filed-at-asc'),
  // #758 "All disputes" toggle — false (default) keeps the v1 behavior
  // (pending counters only = open contests); true widens to all contest
  // history (archived / corroborated / stale counters included).
  includeArchived: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
});

// GET /v1/admin/contests/prices — paginated open price contests
//
// The query pivots around the COUNTER row (priceSubmissions where
// status='pending' AND disputedSubmissionId IS NOT NULL), not the parent's
// status. A price can hold several pending counters, one per fan (B+ B9,
// migration 0099; 0041's one-per-parent index goes in 0100), so open mode
// lists the LEADING counter per parent: one row = one contest. Anchoring
// on the counter lets us ORDER BY counter.createdAt (the "filedAt" per spec)
// and survives the two creation paths historically leaving the parent in
// slightly different states (see plan Task 5 + 5b).
contestsAdminRouter.get(
  '/prices',
  zValidator('query', listQuerySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid query params' }, 422);
    }
  }),
  async (ctx) => {
    const { limit, offset, sort, includeArchived } = ctx.req.valid('query');

    // Both the page query and the total count must apply the same filter,
    // or the pager's "X–Y of TOTAL" readout drifts from the rows shown.
    //
    // Open mode lists one row per CHECK, not per counter: several fans can
    // each have an update pending on one price (B+ B9), and the row carries
    // the leading one (most confirmations, then earliest filed, then id),
    // the same counter the detail endpoint shows and resolve acts on by
    // default. `openCounterCount` says how many are waiting. History mode
    // (includeArchived) keeps one row per counter.
    const sibling = alias(priceSubmissions, 'sibling');
    const openCounter = alias(priceSubmissions, 'open_counter');
    const aheadOfThisCounter = db
      .select({ one: sql`1` })
      .from(sibling)
      .where(
        and(
          eq(
            sibling.disputedSubmissionId,
            priceSubmissions.disputedSubmissionId,
          ),
          eq(sibling.status, 'pending'),
          ne(sibling.id, priceSubmissions.id),
          // Same rank as compareLeadingCounters, at its ms precision.
          sql`(${sibling.corroborationCount}, ${filedAtMs(priceSubmissions.createdAt)}, ${priceSubmissions.id})
            > (${priceSubmissions.corroborationCount}, ${filedAtMs(sibling.createdAt)}, ${sibling.id})`,
        ),
      );
    const listWhere = includeArchived
      ? isNotNull(priceSubmissions.disputedSubmissionId)
      : and(
          eq(priceSubmissions.status, 'pending'),
          isNotNull(priceSubmissions.disputedSubmissionId),
          notExists(aheadOfThisCounter),
        );
    const direction = sort === 'filed-at-desc' ? desc : asc;

    // parentAlias = the disputed parent submission (self-join target).
    const parentAlias = alias(priceSubmissions, 'parent');
    const counterRows = await db
      .select({
        contestId: parentAlias.id,
        eventId: parentAlias.eventId,
        eventTitle: events.title,
        venueName: venues.name,
        eventDate: events.date,
        // The Price checks tab's Ticket page button and "N Watching".
        ticketUrl: events.ticketUrl,
        watching: sql<number>`(${db
          .select({ total: count() })
          .from(userEvents)
          .where(
            and(
              eq(userEvents.eventId, events.id),
              eq(userEvents.status, 'watching'),
            ),
          )})`.mapWith(Number),
        tier: parentAlias.tier,
        sourceCategory: parentAlias.sourceCategory,
        // Parent fields (the disputed corroborated submission)
        parentId: parentAlias.id,
        parentPriceMin: parentAlias.priceMin,
        parentPriceMax: parentAlias.priceMax,
        parentVendor: parentAlias.vendor,
        parentUserId: parentAlias.userId,
        parentObservedAt: parentAlias.createdAt,
        parentLastUpdatedAt: parentAlias.updatedAt,
        parentNote: parentAlias.note,
        // corroborationCount already includes the submitter's implicit
        // observation (1/2 model: default flipped 0→1 in PR #705 with the
        // (COUNT(submission_confirms)+1) backfill). This is the right field
        // for the "fans" count, NOT a SELECT COUNT(*) on submission_confirms
        // which would undercount by 1.
        parentCorroborationCount: parentAlias.corroborationCount,
        // Counter fields (the pending challenger). createdAt = filedAt per
        // spec §6.1.
        counterId: priceSubmissions.id,
        counterPriceMin: priceSubmissions.priceMin,
        counterPriceMax: priceSubmissions.priceMax,
        counterVendor: priceSubmissions.vendor,
        counterUserId: priceSubmissions.userId,
        counterObservedAt: priceSubmissions.createdAt,
        counterNote: priceSubmissions.note,
        // Counter confirms mirror the parent shape — drives the queue row's
        // counter attribution text per design table §2. corroborationCount on
        // a pending counter starts at 1 (submitter = observation #1).
        counterCorroborationCount: priceSubmissions.corroborationCount,
        // Surfaced so the queue's counter badge can reflect non-pending
        // statuses when includeArchived widens the scope (#758).
        counterStatus: priceSubmissions.status,
        filedAt: priceSubmissions.createdAt,
        // A scalar subquery that declares its own alias in its FROM.
        // db.$count(alias) rendered the alias name as a bare table name
        // ('relation "open_counter" does not exist').
        openCounterCount: sql<number>`(${db
          .select({ value: sql<number>`count(*)::int` })
          .from(openCounter)
          .where(
            and(
              eq(openCounter.disputedSubmissionId, parentAlias.id),
              eq(openCounter.status, 'pending'),
            ),
          )})`.mapWith(Number),
      })
      .from(priceSubmissions)
      .innerJoin(
        parentAlias,
        eq(parentAlias.id, priceSubmissions.disputedSubmissionId),
      )
      .innerJoin(events, eq(events.id, parentAlias.eventId))
      .innerJoin(venues, eq(venues.id, events.venueId))
      .where(listWhere)
      .orderBy(
        direction(priceSubmissions.createdAt),
        direction(priceSubmissions.id),
      )
      .limit(limit)
      .offset(offset);

    // Resolve handles for every userId surfaced across both sides via a
    // single LEFT JOIN-style lookup. Handle may be null if a profile wasn't
    // created yet; userId is canonical.
    const allUserIds = Array.from(
      new Set(
        [
          ...counterRows.map((row) => row.parentUserId),
          ...counterRows.map((row) => row.counterUserId),
        ].filter((uid): uid is string => uid !== null),
      ),
    );
    const handleMap = new Map<string, string | null>();
    if (allUserIds.length > 0) {
      const handles = await db
        .select({
          userId: userProfiles.userId,
          handle: userProfiles.handle,
        })
        .from(userProfiles)
        .where(inArray(userProfiles.userId, allUserIds));
      for (const row of handles) {
        handleMap.set(row.userId, row.handle ?? null);
      }
    }

    // `fans` count comes from corroborationCount directly (it already
    // includes the submitter's implicit observation #1). Admin=0 stays as a
    // placeholder until the submission_confirms table grows a method/kind
    // that distinguishes admin approvals from fan confirms. No separate
    // count query needed.

    const items = counterRows.map((row) => ({
      contestId: row.contestId,
      eventId: row.eventId,
      eventTitle: row.eventTitle ?? '',
      venueName: row.venueName ?? '',
      eventDate: row.eventDate ?? '',
      ticketUrl: row.ticketUrl ?? null,
      watching: row.watching,
      tier: row.tier,
      sourceCategory: row.sourceCategory,
      parent: {
        id: row.parentId,
        priceMin: row.parentPriceMin,
        priceMax: row.parentPriceMax,
        vendor: row.parentVendor,
        submitter: {
          // Pass `string | null` through verbatim — see detail handler's
          // submitter comment for rationale (don't coerce a null userId
          // into a zero-length string).
          userId: row.parentUserId,
          handle: row.parentUserId
            ? (handleMap.get(row.parentUserId) ?? null)
            : null,
        },
        confirms: {
          fans: row.parentCorroborationCount,
          admin: 0,
        },
        observedAt: row.parentObservedAt.toISOString(),
        lastUpdatedAt: row.parentLastUpdatedAt.toISOString(),
        note: row.parentNote ?? null,
      },
      counter: {
        id: row.counterId,
        priceMin: row.counterPriceMin,
        priceMax: row.counterPriceMax,
        vendor: row.counterVendor,
        submitter: {
          // Same as parent.submitter.userId — string | null.
          userId: row.counterUserId,
          handle: row.counterUserId
            ? (handleMap.get(row.counterUserId) ?? null)
            : null,
        },
        confirms: {
          fans: row.counterCorroborationCount,
          admin: 0,
        },
        observedAt: row.counterObservedAt.toISOString(),
        note: row.counterNote ?? null,
        status: row.counterStatus,
      },
      filedAt: row.filedAt.toISOString(),
      // Pending updates open on this price, the listed counter included.
      openCounterCount: row.openCounterCount,
    }));

    // `total` counts contests by their leading pending counter (matching the
    // items shape, one per parent), not by parents with status='disputed' —
    // those numbers can differ if a parent was flagged disputed but its
    // counters have since been withdrawn or archived.
    const [totalRow] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(priceSubmissions)
      .where(listWhere);

    return ctx.json({
      success: true,
      data: { items, total: totalRow?.value ?? 0, limit, offset },
    });
  },
);

const detailParamsSchema = z.object({
  contestId: idSchema,
});

// GET /v1/admin/contests/prices/:contestId — full detail for one contest.
//
// Mirrors a single row from the list endpoint (§6.1) plus an empty `history`
// array placeholder per spec §6.2. The path param is the PARENT submission id
// (the contest's stable cursor — same field the list endpoint surfaces as
// `contestId`, see line ~45).
//
// Unlike the list endpoint, this handler does NOT filter the counter by
// status='pending'. The AdminDisputePanel renders read-only banners off the
// actual parent/counter statuses for already-resolved or deferred contests, so
// the detail endpoint must surface them as-is. The counter is the leading
// pending one when the check is open (a price can hold several, one per fan),
// else the most recent: historical resolved counters stack up after multiple
// contests on the same parent, and the latest is the right surface for the
// panel. `pendingCounters` lists every open one.
// The resolved Price checks (the "Resolved" list on the Price checks tab):
// one row per `contest.resolve` audit entry, newest first. The answer, the
// decider and the date all come from that entry, so a price the check later
// touched again does not rewrite history. Registered before `/prices/:contestId`
// so "resolved" is not read as an id.
const resolvedListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const resolvedAuditMetaSchema = z.object({
  resolution: z.enum(['parent_wins', 'challenger_wins']),
  parentId: z.string().optional(),
  challengerId: z.string().optional(),
  eventId: z.string().optional(),
  parentAfter: z.object({ priceMin: z.string().nullable() }).optional(),
  challengerAfter: z.object({ priceMin: z.string().nullable() }).optional(),
});

contestsAdminRouter.get(
  '/prices/resolved',
  zValidator('query', resolvedListQuerySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid query params' }, 422);
    }
  }),
  async (ctx) => {
    const { limit, offset } = ctx.req.valid('query');
    const resolvedOnly = eq(auditLog.action, 'contest.resolve');

    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          id: auditLog.id,
          decidedAt: auditLog.createdAt,
          actorId: auditLog.actorId,
          contestId: auditLog.targetId,
          metadata: auditLog.metadata,
        })
        .from(auditLog)
        .where(resolvedOnly)
        .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(auditLog).where(resolvedOnly),
    ]);

    const parsed = rows.map((row) => ({
      row,
      meta: resolvedAuditMetaSchema.safeParse(row.metadata),
    }));
    const eventIds = [
      ...new Set(
        parsed.flatMap(({ meta }) =>
          meta.success && meta.data.eventId ? [meta.data.eventId] : [],
        ),
      ),
    ];
    const actorIds = [...new Set(rows.map((row) => row.actorId))];

    const [eventRows, handleRows] = await Promise.all([
      eventIds.length === 0
        ? []
        : db
            .select({
              id: events.id,
              title: events.title,
              date: events.date,
              venueName: venues.name,
            })
            .from(events)
            .innerJoin(venues, eq(venues.id, events.venueId))
            .where(inArray(events.id, eventIds)),
      db
        .select({ userId: userProfiles.userId, handle: userProfiles.handle })
        .from(userProfiles)
        .where(inArray(userProfiles.userId, actorIds)),
    ]);
    const eventById = new Map(eventRows.map((event) => [event.id, event]));
    const handleByUser = new Map(
      handleRows.map((profile) => [profile.userId, profile.handle]),
    );

    const resolved = parsed.flatMap(({ row, meta }) => {
      if (!meta.success) return [];
      const { resolution, eventId, parentAfter, challengerAfter } = meta.data;
      const event = eventId ? eventById.get(eventId) : undefined;
      // "Used" = the fan's update won and is now the price; "Kept" = the
      // price stood. The winning row's own price is the one named.
      const used = resolution === 'challenger_wins';
      const price = (used ? challengerAfter : parentAfter)?.priceMin ?? null;
      return [
        {
          id: row.id,
          contestId: row.contestId,
          eventId: eventId ?? null,
          eventTitle: event?.title ?? null,
          eventDate: event?.date ?? null,
          venueName: event?.venueName ?? null,
          resolution,
          answer: used ? ('used' as const) : ('kept' as const),
          price,
          decidedBy: handleByUser.get(row.actorId) ?? null,
          decidedAt: row.decidedAt,
        },
      ];
    });

    return ctx.json({
      success: true,
      data: { items: resolved, total: totalRow?.total ?? 0, limit, offset },
    });
  },
);

contestsAdminRouter.get(
  '/prices/:contestId',
  zValidator('param', detailParamsSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid contestId' }, 400);
    }
  }),
  async (ctx) => {
    const { contestId } = ctx.req.valid('param');

    // Parent = the row at :contestId. Join events + venues for the projection.
    const [parentRow] = await db
      .select({
        id: priceSubmissions.id,
        eventId: priceSubmissions.eventId,
        eventTitle: events.title,
        venueName: venues.name,
        eventDate: events.date,
        tier: priceSubmissions.tier,
        sourceCategory: priceSubmissions.sourceCategory,
        priceMin: priceSubmissions.priceMin,
        priceMax: priceSubmissions.priceMax,
        vendor: priceSubmissions.vendor,
        userId: priceSubmissions.userId,
        observedAt: priceSubmissions.createdAt,
        lastUpdatedAt: priceSubmissions.updatedAt,
        note: priceSubmissions.note,
        status: priceSubmissions.status,
        // corroborationCount already includes the submitter's implicit
        // observation (1/2 model). Used directly as `confirms.fans`; admin=0
        // is a placeholder until submission_confirms grows an admin-method
        // discriminator. Same comment as the list endpoint above.
        corroborationCount: priceSubmissions.corroborationCount,
        // Surfaced so AdminDisputePanel's read-only banner can re-display the
        // admin's resolution rationale to admins re-visiting a resolved
        // contest (spec §4 line 245). Null on actionable contests.
        archivedReason: priceSubmissions.archivedReason,
      })
      .from(priceSubmissions)
      .innerJoin(events, eq(events.id, priceSubmissions.eventId))
      .innerJoin(venues, eq(venues.id, events.venueId))
      .where(eq(priceSubmissions.id, contestId))
      .limit(1);

    if (!parentRow) {
      return ctx.json({ success: false, error: 'Contest not found' }, 404);
    }

    // Counter = the leading PENDING counter when the check is open (several
    // fans can each have one, B+ B9: most confirmations, then earliest
    // filed), the same one resolve and defer act on by default. With none
    // pending, the most recent row whose disputedSubmissionId = parent.id.
    // No status filter (spec §6.2) — read-only banners for resolved/deferred
    // states render off the actual counter.status.
    const allCounterRows = await db
      .select({
        id: priceSubmissions.id,
        priceMin: priceSubmissions.priceMin,
        priceMax: priceSubmissions.priceMax,
        vendor: priceSubmissions.vendor,
        userId: priceSubmissions.userId,
        observedAt: priceSubmissions.createdAt,
        createdAt: priceSubmissions.createdAt,
        note: priceSubmissions.note,
        status: priceSubmissions.status,
        corroborationCount: priceSubmissions.corroborationCount,
        lastAdminActionAt: priceSubmissions.lastAdminActionAt,
        lastAdminActionKind: priceSubmissions.lastAdminActionKind,
        // Same as parent.archivedReason — surfaces the admin's resolution
        // rationale on the loser side of an already-resolved contest.
        archivedReason: priceSubmissions.archivedReason,
      })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.disputedSubmissionId, contestId))
      .orderBy(desc(priceSubmissions.createdAt));
    const pendingCounterRows = allCounterRows
      .filter((row) => row.status === 'pending')
      .sort(compareLeadingCounters);
    const counterRow = pendingCounterRows[0] ?? allCounterRows[0];

    if (!counterRow) {
      // The parent exists but no row references it as a dispute — caller
      // passed a non-contest submission id. 404 keeps the contract simple:
      // either we have both sides, or we don't have a contest.
      return ctx.json({ success: false, error: 'Counter not found' }, 404);
    }

    // Resolve handles for both sides via a single LEFT JOIN-style lookup.
    // Same pattern as the list endpoint.
    const userIds = [
      parentRow.userId,
      ...pendingCounterRows.map((row) => row.userId),
      counterRow.userId,
    ].filter((uid): uid is string => uid !== null);
    const handleMap = new Map<string, string | null>();
    if (userIds.length > 0) {
      const handles = await db
        .select({
          userId: userProfiles.userId,
          handle: userProfiles.handle,
        })
        .from(userProfiles)
        .where(inArray(userProfiles.userId, userIds));
      for (const row of handles) {
        handleMap.set(row.userId, row.handle ?? null);
      }
    }

    // Pair-narrow the counter's engagement signal so kind + at can't drift.
    // Shared helper in apps/api/src/lib/last-admin-action.ts — same defensive
    // treatment as buildCounter in aggregate-by-tier.ts and the
    // counterSubmission projection in events.ts.
    const counterLastAction = narrowLastAdminAction(
      counterRow.lastAdminActionKind,
      counterRow.lastAdminActionAt,
    );

    return ctx.json({
      success: true,
      data: {
        contestId: parentRow.id,
        eventId: parentRow.eventId,
        eventTitle: parentRow.eventTitle ?? '',
        venueName: parentRow.venueName ?? '',
        eventDate: parentRow.eventDate ?? '',
        tier: parentRow.tier,
        sourceCategory: parentRow.sourceCategory,
        parent: {
          id: parentRow.id,
          priceMin: parentRow.priceMin,
          priceMax: parentRow.priceMax,
          vendor: parentRow.vendor,
          submitter: {
            // Preserve null when the row truly has no submitter (legacy /
            // anonymous backfill rows) rather than coercing to ''. The
            // empty string was a lie — it told the wire the user existed
            // but had a zero-length id. UI reads only `handle` for
            // rendering; passing `string | null` through keeps the type
            // honest with the DB column.
            userId: parentRow.userId,
            handle: parentRow.userId
              ? (handleMap.get(parentRow.userId) ?? null)
              : null,
          },
          confirms: {
            fans: parentRow.corroborationCount,
            admin: 0,
          },
          observedAt: parentRow.observedAt.toISOString(),
          lastUpdatedAt: parentRow.lastUpdatedAt.toISOString(),
          note: parentRow.note ?? null,
          status: parentRow.status,
          archivedReason: parentRow.archivedReason ?? null,
        },
        counter: {
          id: counterRow.id,
          priceMin: counterRow.priceMin,
          priceMax: counterRow.priceMax,
          vendor: counterRow.vendor,
          submitter: {
            // Same rationale as parent.submitter.userId — string | null,
            // not coerced to ''.
            userId: counterRow.userId,
            handle: counterRow.userId
              ? (handleMap.get(counterRow.userId) ?? null)
              : null,
          },
          confirms: {
            fans: counterRow.corroborationCount,
            admin: 0,
          },
          observedAt: counterRow.observedAt.toISOString(),
          note: counterRow.note ?? null,
          status: counterRow.status,
          // Paired above so an unrecognized kind in the column never leaves
          // a half-populated pair (kind=null, at=<timestamp>) on the wire.
          lastAdminActionAt: counterLastAction.at,
          lastAdminActionKind: counterLastAction.kind,
          archivedReason: counterRow.archivedReason ?? null,
        },
        filedAt: counterRow.observedAt.toISOString(),
        // Every open update on this price, leading first (B+ B9). `counter`
        // above is the first of these whenever any is pending; resolve takes
        // `challengerId` to decide on another one.
        pendingCounters: pendingCounterRows.map((row) => ({
          id: row.id,
          priceMin: row.priceMin,
          priceMax: row.priceMax,
          submitter: {
            userId: row.userId,
            handle: row.userId ? (handleMap.get(row.userId) ?? null) : null,
          },
          confirms: { fans: row.corroborationCount, admin: 0 },
          observedAt: row.observedAt.toISOString(),
          note: row.note ?? null,
        })),
        history: [],
      },
    });
  },
);

const resolveParamsSchema = z.object({
  contestId: idSchema,
});

const resolveBodySchema = z.object({
  resolution: z.enum(['parent_wins', 'challenger_wins']),
  reason: z.string().min(10).max(2000),
  // Which pending update the resolution is about, when a price has several
  // (B+ B9). Omitted, it is the leading one, the same one the detail
  // endpoint shows.
  challengerId: idSchema.optional(),
});

// POST /v1/admin/contests/prices/:contestId/resolve — atomic resolution.
//
// Spec §4.3, §6.3. The contestId path param is the PARENT submission id
// (consistent with the list + detail endpoints).
//
// The handler runs all DB mutations inside one transaction with SELECT FOR
// UPDATE on both rows up front. Sanity gates inside the transaction return a
// discriminated `precondition_failed` outcome that maps to a 409 response
// (with the precondition's reason in the body) — NOT 200, NOT a partial
// commit. Same-slot assertions (event_id / tier / source_category) defend
// against any upstream bug that could land a counter in a different slot;
// without them, a malformed counter could propagate the wrong price to the
// events projection.
//
// On status flips for BOTH winner and loser we clear lastAdminActionKind +
// lastAdminActionAt so the consumer-facing "Admin requested more info" pill
// from a previous defer doesn't persist after resolution.
//
// The events projection update is gated on event.priceSource being
// 'community' or NULL — we never overwrite a Ticketmaster/AXS/etc.-sourced
// price even if a community contest landed on the same slot. The cred award
// (+1 priceCredScore to the winner's submitter) happens regardless of the
// projection gate.
//
// Superseded cleanup archives every OTHER pending counter against the same
// parent inside the transaction. Since migration 0099 several fans can each
// have an update open on one price (B+ B9), so this is the ordinary path: one
// resolution decides the whole check.
//
// Audit + notification writes happen OUTSIDE the transaction (after commit)
// so a Sentry-tagged failure in either telemetry path can't roll back the
// resolution. Audit is driven by ctx.set('auditAction', ...) etc. and handled
// by the middleware in apps/api/src/routes/admin/index.ts. Notifications are
// fanned out via writeContestNotifications in apps/api/src/lib/contest-
// notifications.ts (helper extracted in Task 10) — it dedupes parent ===
// challenger and swallows insert failures internally.
contestsAdminRouter.post(
  '/prices/:contestId/resolve',
  zValidator('param', resolveParamsSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid contestId' }, 400);
    }
  }),
  zValidator('json', resolveBodySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json(
        { success: false, error: 'Reason must be 10–2000 characters.' },
        400,
      );
    }
  }),
  async (ctx) => {
    const { contestId } = ctx.req.valid('param');
    const { resolution, reason, challengerId } = ctx.req.valid('json');
    const admin = getAuthUser(ctx);

    const outcome = await resolveContest(
      contestId,
      resolution,
      reason,
      challengerId,
    );

    if (outcome.ok === 'not_found') {
      return ctx.json({ success: false, error: 'Contest not found' }, 404);
    }
    if (outcome.ok === 'precondition_failed') {
      return ctx.json(
        {
          success: false,
          error: outcome.reason,
          code: 'precondition_failed',
        },
        409,
      );
    }

    // Audit middleware reads these from context after the response is built.
    // Failures inside the middleware are swallowed there; the resolution
    // itself is already committed.
    ctx.set('auditActorId', admin.userId);
    ctx.set('auditAction', 'contest.resolve');
    ctx.set('auditTargetId', contestId);
    ctx.set('auditMeta', {
      resolution,
      parentId: outcome.parent.id,
      challengerId: outcome.challenger.id,
      eventId: outcome.parent.eventId,
      tier: outcome.parent.tier,
      sourceCategory: outcome.parent.sourceCategory,
      reason,
      parentBefore: outcome.before.parent,
      parentAfter: {
        status: outcome.parent.status,
        priceMin: outcome.parent.priceMin,
        priceMax: outcome.parent.priceMax,
      },
      challengerBefore: outcome.before.challenger,
      challengerAfter: {
        status: outcome.challenger.status,
        priceMin: outcome.challenger.priceMin,
        priceMax: outcome.challenger.priceMax,
      },
      eventPriceUpdated: outcome.eventPriceUpdated,
      orphanedCounterIds: outcome.orphanedCounterIds,
    });

    return ctx.json({
      success: true,
      data: {
        resolution,
        parent: outcome.parent,
        challenger: outcome.challenger,
        eventPriceUpdated: outcome.eventPriceUpdated,
      },
    });
  },
);

const deferParamsSchema = z.object({
  contestId: idSchema,
});

const deferBodySchema = z.object({
  reason: z.string().min(10).max(2000),
});

// POST /v1/admin/contests/prices/:contestId/defer — "Need more info"
// engagement signal.
//
// Spec §4.5, §6.4. The contestId path param is the PARENT submission id
// (consistent with the list, detail, and resolve endpoints).
//
// Unlike resolve, defer changes NO statuses. The counter stays `pending`, the
// parent stays `disputed` (or `corroborated` — see below), and the events
// projection is untouched. The single state mutation is on the counter row:
// `lastAdminActionKind = 'defer'`, `lastAdminActionAt = NOW()`. That's the
// surface the consumer event-detail page reads to render the quiet pill on
// the counter card per §4.5; without these columns set, the defer is
// invisible to consumers.
//
// The handler runs inside a transaction with SELECT FOR UPDATE on parent +
// counter even though only one row is mutated. This prevents races with a
// concurrent resolve: if another admin resolved the contest between the
// dropdown click and the confirm, we surface a 409 precondition_failed rather
// than silently writing engagement-signal fields onto a row that's already
// archived.
//
// Same-slot assertions (event_id / tier / source_category) are kept for
// defense-in-depth — counters inherit the parent's slot (Task 5b), so they
// should never fire, but the cost
// is one comparison per request and the failure mode (defer signals on a
// mismatched slot) would be invisible to consumers.
//
// Audit + notification writes happen OUTSIDE the transaction (after commit),
// same pattern as resolve. Notifications are fanned out via
// writeContestNotifications in apps/api/src/lib/contest-notifications.ts.
contestsAdminRouter.post(
  '/prices/:contestId/defer',
  zValidator('param', deferParamsSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid contestId' }, 400);
    }
  }),
  zValidator('json', deferBodySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json(
        { success: false, error: 'Reason must be 10–2000 characters.' },
        400,
      );
    }
  }),
  async (ctx) => {
    const { contestId } = ctx.req.valid('param');
    const { reason } = ctx.req.valid('json');
    const admin = getAuthUser(ctx);

    type DeferOutcome =
      | {
          ok: 'committed';
          parent: typeof priceSubmissions.$inferSelect;
          counter: typeof priceSubmissions.$inferSelect;
          deferredAt: Date;
        }
      | { ok: 'not_found' }
      | { ok: 'precondition_failed'; reason: string };

    const outcome: DeferOutcome = await db.transaction(async (tx) => {
      // Lock the parent row first.
      const [parent] = await tx
        .select()
        .from(priceSubmissions)
        .where(eq(priceSubmissions.id, contestId))
        .limit(1)
        .for('update');
      if (!parent) return { ok: 'not_found' };

      // Lock the leading pending counter: several fans can each have one
      // open on this parent (B+ B9), and the consumer card carries the defer
      // pill on the leading one, so that is the one deferred.
      const [counter] = await tx
        .select()
        .from(priceSubmissions)
        .where(
          and(
            eq(priceSubmissions.disputedSubmissionId, contestId),
            eq(priceSubmissions.status, 'pending'),
          ),
        )
        .orderBy(...leadingCounterOrderBy())
        .limit(1)
        .for('update');
      if (!counter) {
        return {
          ok: 'precondition_failed',
          reason: 'No pending counter exists for this contest.',
        };
      }

      // Sanity gates — symmetric with the resolve handler so a defer can't
      // silently land on a mismatched slot. The parent.disputedSubmissionId
      // null check confirms the caller passed a parent id (not a counter id).
      if (parent.disputedSubmissionId !== null) {
        return {
          ok: 'precondition_failed',
          reason: 'Target row is a counter, not a parent.',
        };
      }
      if (parent.eventId !== counter.eventId) {
        return {
          ok: 'precondition_failed',
          reason: 'Parent and challenger belong to different events.',
        };
      }
      if (parent.tier !== counter.tier) {
        return {
          ok: 'precondition_failed',
          reason: `Parent tier ${parent.tier} does not match challenger tier ${counter.tier}.`,
        };
      }
      // Treat NULL source_category as "matches anything." See the resolve
      // handler above for the full rationale — legacy parents have
      // sourceCategory=null and counters derive a non-null value, so a
      // strict `!==` check would permanently block defer on legacy contests.
      if (
        parent.sourceCategory !== null &&
        counter.sourceCategory !== null &&
        parent.sourceCategory !== counter.sourceCategory
      ) {
        return {
          ok: 'precondition_failed',
          reason: `Parent source_category ${parent.sourceCategory} does not match challenger source_category ${counter.sourceCategory}.`,
        };
      }

      // Single UPDATE — engagement-signal fields on the counter. Status
      // intentionally untouched. RETURNING captures the server-side NOW() for
      // the response body (so the client doesn't have to re-fetch to surface
      // the timestamp).
      const [updated] = await tx
        .update(priceSubmissions)
        .set({
          lastAdminActionKind: 'defer',
          lastAdminActionAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(priceSubmissions.id, counter.id))
        .returning();
      if (!updated) {
        throw new Error(
          'Post-defer read failed — counter row missing after update.',
        );
      }
      const deferredAt = updated.lastAdminActionAt;
      if (!deferredAt) {
        throw new Error(
          'Post-defer read returned null lastAdminActionAt — expected timestamp.',
        );
      }

      return {
        ok: 'committed',
        parent,
        counter: updated,
        deferredAt,
      };
    });

    if (outcome.ok === 'not_found') {
      return ctx.json({ success: false, error: 'Contest not found' }, 404);
    }
    if (outcome.ok === 'precondition_failed') {
      return ctx.json(
        {
          success: false,
          error: outcome.reason,
          code: 'precondition_failed',
        },
        409,
      );
    }

    // Audit middleware reads these from context after the response is built.
    // Same pattern as resolve. Failures inside the middleware are swallowed
    // there; the defer signal is already committed.
    ctx.set('auditActorId', admin.userId);
    ctx.set('auditAction', 'contest.defer');
    ctx.set('auditTargetId', contestId);
    ctx.set('auditMeta', {
      parentId: outcome.parent.id,
      challengerId: outcome.counter.id,
      eventId: outcome.parent.eventId,
      reason,
    });

    // Notification fan-out lives in apps/api/src/lib/contest-notifications.ts
    // (extracted in Task 10). The helper handles dedupe, JSON-encoding the
    // metadata text column (defer metadata includes kind:'defer' and a
    // denormalized reason for consumer surfacing per #737), and swallowing
    // insert failures so a notification error can't appear to roll back the
    // already-committed defer signal.
    await writeContestNotifications({
      contestId,
      parentSubmissionId: outcome.parent.id,
      challengerSubmissionId: outcome.counter.id,
      parentUserId: outcome.parent.userId,
      challengerUserId: outcome.counter.userId,
      eventId: outcome.parent.eventId,
      action: 'defer',
      deferredAt: outcome.deferredAt,
      reason,
    });

    return ctx.json({
      success: true,
      data: {
        contestId: outcome.parent.id,
        deferredAt: outcome.deferredAt.toISOString(),
        deferReason: reason,
      },
    });
  },
);
