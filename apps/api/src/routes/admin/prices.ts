import { Hono } from 'hono';
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  exists,
  gt,
  gte,
  ilike,
  isNull,
  lt,
  max,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import * as Sentry from '@sentry/hono/node';
import {
  auditLog,
  db,
  events,
  priceRetrievalLog,
  priceSubmissions,
  userProfiles,
  venues,
} from '@concert-crawl/db';
import { runPricePipeline } from '@concert-crawl/price-pipeline';
import { createLogger } from '@concert-crawl/logger';
import {
  SP_POLICY,
  VENDOR_VALUES,
  deriveSourceCategory,
} from '@concert-crawl/types';
import { getAuthUser } from '../../middleware/auth.js';
import { apiLogger } from '../../lib/logger.js';
import { runBackgroundTask } from '../../lib/background-tasks.js';
import type { AdminVariables } from './index.js';
import { idSchema } from '../../lib/id-schema.js';
import { setSubmissionStatus } from './lib/price-submission-status.js';
import { containsPattern } from '../../lib/escape-like.js';
import { editSubmissionPrice } from './lib/price-edit.js';
import {
  parseRejection,
  REJECTION_REASONS,
  rejectSubmission,
} from './lib/price-rejection.js';
import { todayInDenver } from '../../lib/time.js';
import { watchingCountOf } from './lib/event-counts.js';

const logger = createLogger('admin:prices');

export const pricesAdminRouter = new Hono<AdminVariables>();

const eventsQuerySchema = z.object({
  missingOnly: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true'),
  // Opt-in count flag for the new pagination component. See events.ts for
  // the same pattern. Without count=true the response is the legacy array.
  count: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * The Missing a price list: soonest show first, then the one most fans are
 * Watching, then id so the order is total (the "next" cursor depends on it).
 */
const missingOrder = () => [
  asc(events.date),
  desc(watchingCountOf()),
  asc(events.id),
];

/** Upcoming, visible shows (the base of the Missing a price tab). */
const upcomingVisibleClauses = (today: string) => [
  eq(events.status, 'upcoming'),
  gte(events.date, today),
  eq(events.hiddenFromConsumer, false),
];

// One row shape for the Missing a price list and its "next" cursor. A single
// aggregating join (not two correlated subqueries per row): price_retrieval_log
// grouped by event_id once, then LEFT JOINed in. Built per request so importing
// this router never touches the database layer (route unit tests mock it).
const missingEventsQuery = () => {
  const latestLog = db
    .select({
      eventId: priceRetrievalLog.eventId,
      lastRetrievedAt: max(priceRetrievalLog.attemptedAt).as(
        'last_retrieved_at',
      ),
      lastOutcome: sql<string | null>`(
          array_agg(${priceRetrievalLog.outcome} ORDER BY ${priceRetrievalLog.attemptedAt} DESC)
        )[1]`.as('last_outcome'),
    })
    .from(priceRetrievalLog)
    .groupBy(priceRetrievalLog.eventId)
    .as('latest_log');

  return db
    .select({
      eventId: events.id,
      eventTitle: events.title,
      artist: events.artist,
      venueName: venues.name,
      // The venue's icon tile is chosen by slug.
      venueSlug: venues.slug,
      date: events.date,
      ticketUrl: events.ticketUrl,
      priceMin: events.ticketPriceMin,
      priceMax: events.ticketPriceMax,
      priceSource: events.priceSource,
      watching: watchingCountOf(),
      lastRetrievedAt: latestLog.lastRetrievedAt,
      lastOutcome: latestLog.lastOutcome,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .leftJoin(latestLog, eq(latestLog.eventId, events.id));
};

// GET /v1/admin/prices/events — upcoming events with current price data + last retrieval info
pricesAdminRouter.get(
  '/events',
  zValidator('query', eventsQuerySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid query params' }, 422);
    }
  }),
  async (ctx) => {
    const { missingOnly, count, limit, offset } = ctx.req.valid('query');
    // Exclude admin-hidden non-concerts (#732, same pattern as #712 on the
    // Missing tab). Events flagged hidden_from_consumer=true have already
    // been triaged as non-concerts — they shouldn't appear in the missing-
    // price queue or skew the coverage %.
    const conditions = [
      ...upcomingVisibleClauses(todayInDenver()),
      ...(missingOnly ? [isNull(events.ticketPriceMin)] : []),
    ];
    const whereClause = and(...conditions);

    const rowsPromise = missingEventsQuery()
      .where(whereClause)
      .orderBy(...missingOrder())
      .limit(limit)
      .offset(offset);

    if (!count) {
      const rows = await rowsPromise;
      return ctx.json({ success: true, data: rows } as const);
    }

    const countQuery = db
      .select({ total: sql<number>`count(*)::int` })
      .from(events)
      .where(whereClause);
    const [rows, countResult] = await Promise.all([rowsPromise, countQuery]);
    const total = countResult[0]?.total ?? 0;
    return ctx.json({ success: true, data: { rows, total } } as const);
  },
);

const missingNextQuerySchema = z.object({ after: idSchema.optional() });

// GET /v1/admin/prices/missing/next?after=<eventId> — the show after `after`
// in the Missing a price order (the add panel's "Save and next"), or the first
// one without `after`. `after` need not still be missing: the position comes
// from its date, Watching count and id, so a show that just got its price
// still points at the right neighbour. `data` is null at the end of the list.
pricesAdminRouter.get(
  '/missing/next',
  zValidator('query', missingNextQuerySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid query params' }, 422);
    }
  }),
  async (ctx) => {
    const { after } = ctx.req.valid('query');
    const missing = and(
      ...upcomingVisibleClauses(todayInDenver()),
      isNull(events.ticketPriceMin),
    );

    let position: SQL | undefined;
    if (after !== undefined) {
      const [anchor] = await db
        .select({
          date: events.date,
          watching: watchingCountOf(),
        })
        .from(events)
        .where(eq(events.id, after))
        .limit(1);
      if (!anchor) {
        return ctx.json({ success: false, error: 'Event not found' }, 404);
      }
      // Strictly after `after` in (date asc, watching desc, id asc).
      position = or(
        gt(events.date, anchor.date),
        and(
          eq(events.date, anchor.date),
          lt(watchingCountOf(), anchor.watching),
        ),
        and(
          eq(events.date, anchor.date),
          eq(watchingCountOf(), anchor.watching),
          gt(events.id, after),
        ),
      );
    }

    const [row] = await missingEventsQuery()
      .where(and(missing, position))
      .orderBy(...missingOrder())
      .limit(1);
    return ctx.json({ success: true, data: row ?? null });
  },
);

// GET /v1/admin/prices/tabs — the four numbers on the Prices tab strip, in one
// call: shows missing a price, Submitted prices, open and resolved Price checks,
// and how many fans submitted a price in the last 30 days.
pricesAdminRouter.get('/tabs', async (ctx) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const notACounter = isNull(priceSubmissions.disputedSubmissionId);
  const [[missing], [submitted], [checksOpen], [checksResolved], [people]] =
    await Promise.all([
      db
        .select({ total: count() })
        .from(events)
        .where(
          and(
            ...upcomingVisibleClauses(todayInDenver()),
            isNull(events.ticketPriceMin),
          ),
        ),
      db.select({ total: count() }).from(priceSubmissions).where(notACounter),
      // One open check per price, however many fans have an update pending.
      db
        .select({
          total: countDistinct(priceSubmissions.disputedSubmissionId),
        })
        .from(priceSubmissions)
        .where(eq(priceSubmissions.status, 'pending')),
      db
        .select({ total: count() })
        .from(auditLog)
        .where(eq(auditLog.action, 'contest.resolve')),
      db
        .select({ total: countDistinct(priceSubmissions.userId) })
        .from(priceSubmissions)
        .where(gte(priceSubmissions.createdAt, since)),
    ]);
  return ctx.json({
    success: true,
    data: {
      missing: missing?.total ?? 0,
      submitted: submitted?.total ?? 0,
      checksOpen: checksOpen?.total ?? 0,
      checksResolved: checksResolved?.total ?? 0,
      peopleSubmitting: people?.total ?? 0,
    },
  });
});

// GET /v1/admin/prices/health — per-source × per-venue success rates
pricesAdminRouter.get('/health', async (ctx) => {
  const stats = await db
    .select({
      venueId: priceRetrievalLog.venueId,
      source: priceRetrievalLog.source,
      totalCount: count(),
      hitCount: count(
        sql`CASE WHEN ${priceRetrievalLog.outcome} = 'hit' THEN 1 END`,
      ),
      lastAttemptedAt: max(priceRetrievalLog.attemptedAt),
    })
    .from(priceRetrievalLog)
    .groupBy(priceRetrievalLog.venueId, priceRetrievalLog.source);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  // "0 hits in 30 days": tried recently but never succeeded
  const autoFlagged = stats.filter(
    (stat) =>
      Number(stat.hitCount) === 0 &&
      stat.lastAttemptedAt != null &&
      new Date(stat.lastAttemptedAt) >= thirtyDaysAgo,
  );

  return ctx.json({ success: true, data: { stats, autoFlagged } });
});

// GET /v1/admin/prices/log — last 100 retrieval attempts
pricesAdminRouter.get('/log', async (ctx) => {
  const rows = await db
    .select()
    .from(priceRetrievalLog)
    .orderBy(desc(priceRetrievalLog.attemptedAt))
    .limit(100);

  return ctx.json({ success: true, data: rows });
});

// GET /v1/admin/prices/coverage — % of upcoming events with price data
//
// Mirrors the /v1/admin/prices/events filter set so the % is a faithful
// summary of the queue admins actually work from:
//   - status='upcoming'                 (lifecycle state)
//   - date >= today                     (the /events surface also enforces
//                                        this; status='upcoming' alone is
//                                        insufficient since stale rows can
//                                        keep the status)
//   - hidden_from_consumer=false        (#732 — admin-triaged non-concerts
//                                        don't need prices)
//
// `::int` cast matches the rest of this file's count(*) results so JSON
// numbers are stable integers, not bigint strings via drizzle's `count()`.
pricesAdminRouter.get('/coverage', async (ctx) => {
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Denver',
  });

  const baseConditions = and(
    eq(events.status, 'upcoming'),
    gte(events.date, today),
    eq(events.hiddenFromConsumer, false),
  );

  const [total] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(events)
    .where(baseConditions);

  const [withPrice] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(events)
    .where(and(baseConditions, sql`${events.ticketPriceMin} IS NOT NULL`));

  const totalCount = total?.count ?? 0;
  const pricedCount = withPrice?.count ?? 0;
  const pct = totalCount > 0 ? Math.round((pricedCount / totalCount) * 100) : 0;

  return ctx.json({
    success: true,
    data: { total: totalCount, withPrice: pricedCount, pct },
  });
});

// GET /v1/admin/prices/submissions — community submission queue
// `count=true` switches to `{ rows, total }` for the new pagination component.
//
// Defaults to `status=pending` so the moderation queue contains only items
// that still need an admin decision — corroborated/disputed/stale items have
// already been processed and don't belong on this surface (#708). The pill
// on /admin/review uses the same status='pending' filter, so the two surfaces
// stay in lock-step. Pass `?status=all` to opt out of the default pending
// filter for audit views — returns corroborated + archived + stale rows
// alongside non-contest disputed rows (R8 narrowed the PATCH lockout to
// active-contest rows only, so a `disputed_submission_id IS NULL` row in
// status='disputed' is a legitimate admin moderation denial and audit
// callers should see it).
//
// NOTE: contest counter rows (`disputed_submission_id IS NOT NULL`) are
// ALWAYS excluded here — including when status=all — because they're owned
// by the contest endpoints (GET /v1/admin/contests/prices). The PATCH
// lockout (#754) + the partial unique index keep contest rows on a
// separate path from the regular single-submission lifecycle, so audit
// callers needing contest visibility must use the contests endpoint.
// "This fan's other prices" (redesign 4d#12): one fan's prices, matched on the
// whole handle. Not the free-text `search`, whose substring match on the handle
// would make "al" also list alice, hal and sally. A leading "@" is ignored.
const handleQuerySchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^@/, ''))
  .pipe(z.string().min(1).max(100))
  .optional();

const submissionsQuerySchema = z.object({
  count: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  // Defaults to pending (the legacy queue) when neither `status` nor `state`
  // is sent.
  status: z.enum(['pending', 'all']).optional(),
  // The Submitted prices tab's filter chips (redesign 4d). The four states are
  // mutually exclusive, so the chip counts add up to All: a price with an open
  // Price check is "price-check" whatever its own status is. Sent together with
  // `status` is an error, not a silent precedence.
  state: z.enum(['all', 'waiting', 'published', 'price-check']).optional(),
  // "Search shows or people": the show's title, the venue's name, or the
  // fan's handle (a leading "@" is ignored).
  search: z.string().trim().min(1).max(100).optional(),
  handle: handleQuerySchema,
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const stateCountsQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  handle: handleQuerySchema,
});

/** A price with a pending counter (an open Price check) filed against it. */
// A function, not a constant: the query is built per request, so importing this
// router never touches the database layer (route unit tests mock it).
const hasOpenPriceCheck = (): SQL<boolean> => {
  const openCounter = alias(priceSubmissions, 'open_counter');
  return sql<boolean>`${exists(
    db
      .select({ one: sql`1` })
      .from(openCounter)
      .where(
        and(
          eq(openCounter.disputedSubmissionId, priceSubmissions.id),
          eq(openCounter.status, 'pending'),
        ),
      ),
  )}`;
};

/** The search clause over the show, the venue and the fan's handle. */
const searchClauseOf = (search: string): SQL | undefined => {
  const pattern = containsPattern(search);
  const handle = search.replace(/^@/, '');
  // A bare "@" has no handle to look for; matching '%%' would list every fan.
  return or(
    ilike(events.title, pattern),
    ilike(venues.name, pattern),
    handle === ''
      ? undefined
      : ilike(userProfiles.handle, containsPattern(handle)),
  );
};

/** One fan's prices, on the whole handle (needs the userProfiles join). */
const handleClauseOf = (handle: string | undefined): SQL | undefined =>
  handle === undefined ? undefined : eq(userProfiles.handle, handle);

/** The WHERE clause of one filter chip. */
const stateClause = (
  state: 'all' | 'waiting' | 'published' | 'price-check',
): SQL | undefined => {
  switch (state) {
    case 'price-check':
      return hasOpenPriceCheck();
    case 'waiting':
      return and(
        eq(priceSubmissions.status, 'pending'),
        sql`NOT ${hasOpenPriceCheck()}`,
      );
    case 'published':
      return and(
        eq(priceSubmissions.status, 'corroborated'),
        sql`NOT ${hasOpenPriceCheck()}`,
      );
    default:
      return undefined;
  }
};

type SubmissionState =
  'waiting' | 'published' | 'price-check' | 'not-used' | 'stale';

/** The state a row is shown in; a price with an open Price check wins. */
const stateOf = (row: {
  status: string;
  priceCheck: boolean;
}): SubmissionState => {
  if (row.priceCheck) return 'price-check';
  if (row.status === 'pending') return 'waiting';
  if (row.status === 'corroborated') return 'published';
  if (row.status === 'stale') return 'stale';
  // archived (a rejection) and disputed both read as "Not used".
  return 'not-used';
};

pricesAdminRouter.get(
  '/submissions',
  zValidator('query', submissionsQuerySchema, (result, ctx) => {
    if (
      !result.success ||
      (result.data.state !== undefined && result.data.status !== undefined)
    ) {
      return ctx.json({ success: false, error: 'Invalid query params' }, 422);
    }
  }),
  async (ctx) => {
    const {
      count,
      status = 'pending',
      state,
      search,
      handle,
      limit,
      offset,
    } = ctx.req.valid('query');

    // Exclude contest counter rows (`disputed_submission_id IS NOT NULL`)
    // from the legacy submissions queue. Counters are adjudicated through
    // /v1/admin/contests/prices and the PATCH lockout (#754) returns 409
    // if an admin tries to action one from this surface — so leaving them
    // visible here was both un-actionable AND double-counts the pending
    // pill (matched in /v1/admin/review/counts → `prices`). The list
    // endpoint and the counts query stay in lock-step with this filter.
    const statusClause =
      state === undefined
        ? status === 'pending'
          ? eq(priceSubmissions.status, 'pending')
          : undefined
        : stateClause(state);
    const searchClause =
      search === undefined ? undefined : searchClauseOf(search);
    const whereClause = and(
      statusClause,
      searchClause,
      handleClauseOf(handle),
      isNull(priceSubmissions.disputedSubmissionId),
    );

    const rowsPromise = db
      .select({
        id: priceSubmissions.id,
        eventId: priceSubmissions.eventId,
        userId: priceSubmissions.userId,
        // The fan's @handle (null when they have none); the admin UI shows
        // this, never the Clerk id.
        handle: userProfiles.handle,
        // The fan's own avatar pair (`06/submitted-prices-mobile`), null
        // until they pick one: the admin row draws the same face fans see.
        avatarColor: userProfiles.avatarColor,
        avatarSecondColor: userProfiles.avatarSecondColor,
        // Fans behind this price: the submitter plus everyone who confirmed
        // it (corroboration_count already includes the submitter).
        backedBy: priceSubmissions.corroborationCount,
        priceCheck: hasOpenPriceCheck(),
        priceMin: priceSubmissions.priceMin,
        priceMax: priceSubmissions.priceMax,
        status: priceSubmissions.status,
        archivedReason: priceSubmissions.archivedReason,
        // Always null in the filtered result (we excluded contest rows
        // above), but surfaced on the wire so any future UI can know which
        // rows are contests without re-querying.
        disputedSubmissionId: priceSubmissions.disputedSubmissionId,
        createdAt: priceSubmissions.createdAt,
        // The most recent sighting, for abuse review. Both columns are
        // overwritten on every sighting, so this shows the LAST actor and time
        // — never the pattern. It is a lead for a human, not a signal.
        lastSeenAt: priceSubmissions.lastSeenAt,
        lastSeenBy: priceSubmissions.lastSeenBy,
        eventTitle: events.title,
        eventDate: events.date,
        ticketUrl: events.ticketUrl,
        venueName: venues.name,
      })
      .from(priceSubmissions)
      .leftJoin(events, eq(priceSubmissions.eventId, events.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .leftJoin(userProfiles, eq(priceSubmissions.userId, userProfiles.userId))
      .where(whereClause)
      .orderBy(desc(priceSubmissions.createdAt))
      .limit(limit)
      .offset(offset);

    // `rejection` is the parsed reason of a rejected price (null otherwise);
    // the raw archived_reason text stays on the row for the older client.
    const withState = (list: Awaited<typeof rowsPromise>) =>
      list.map((row) => ({
        ...row,
        state: stateOf(row),
        rejection: parseRejection(row),
      }));

    if (!count) {
      const rows = await rowsPromise;
      return ctx.json({ success: true, data: withState(rows) });
    }

    // The joins only matter to the search and handle clauses, so a plain total
    // skips them.
    const countBase = db
      .select({ total: sql<number>`count(*)::int` })
      .from(priceSubmissions);
    const countQuery =
      search === undefined && handle === undefined
        ? countBase.where(whereClause)
        : countBase
            .leftJoin(events, eq(priceSubmissions.eventId, events.id))
            .leftJoin(venues, eq(events.venueId, venues.id))
            .leftJoin(
              userProfiles,
              eq(priceSubmissions.userId, userProfiles.userId),
            )
            .where(whereClause);
    const [rows, countResult] = await Promise.all([rowsPromise, countQuery]);
    const total = countResult[0]?.total ?? 0;
    return ctx.json({ success: true, data: { rows: withState(rows), total } });
  },
);

// GET /v1/admin/prices/submissions/state-counts — the Submitted prices filter
// chips, in one query. The four states are mutually exclusive over the same base
// filter as the list (no contest counter rows), so Waiting + Published + Price
// check never exceeds All (the rest are "Not used" and stale rows, under All
// only). With `search` the chips count the matches, so they agree with the list;
// with `handle` they count that one fan's prices.
pricesAdminRouter.get(
  '/submissions/state-counts',
  zValidator('query', stateCountsQuerySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid query params' }, 422);
    }
  }),
  async (ctx) => {
    const { search, handle } = ctx.req.valid('query');
    const countBase = db
      .select({
        all: sql<number>`count(*)::int`,
        waiting: sql<number>`(count(*) FILTER (WHERE ${stateClause('waiting')}))::int`,
        published: sql<number>`(count(*) FILTER (WHERE ${stateClause('published')}))::int`,
        priceCheck: sql<number>`(count(*) FILTER (WHERE ${stateClause('price-check')}))::int`,
      })
      .from(priceSubmissions);
    const base = isNull(priceSubmissions.disputedSubmissionId);
    const [row] =
      search === undefined && handle === undefined
        ? await countBase.where(base)
        : await countBase
            .leftJoin(events, eq(priceSubmissions.eventId, events.id))
            .leftJoin(venues, eq(events.venueId, venues.id))
            .leftJoin(
              userProfiles,
              eq(priceSubmissions.userId, userProfiles.userId),
            )
            .where(
              and(
                base,
                search === undefined ? undefined : searchClauseOf(search),
                handleClauseOf(handle),
              ),
            );
    return ctx.json({
      success: true,
      data: {
        all: row?.all ?? 0,
        waiting: row?.waiting ?? 0,
        published: row?.published ?? 0,
        priceCheck: row?.priceCheck ?? 0,
      },
    });
  },
);

// GET /v1/admin/prices/submissions/count — pending submissions count for dashboard
//
// Mirrors the list endpoint's filter: contest counter rows
// (`disputed_submission_id IS NOT NULL`) are excluded so the dashboard count,
// the moderation queue list, and the `prices` pill in
// /v1/admin/review/counts all stay in lock-step. Counters are owned by the
// contest endpoints (GET /v1/admin/contests/prices) and would otherwise
// double-count alongside the `priceContests` pill on /admin/review.
pricesAdminRouter.get('/submissions/count', async (ctx) => {
  const [result] = await db
    .select({ pending: sql<number>`count(*)::int` })
    .from(priceSubmissions)
    .where(
      and(
        eq(priceSubmissions.status, 'pending'),
        isNull(priceSubmissions.disputedSubmissionId),
      ),
    );
  return ctx.json({ success: true, data: { pending: result?.pending ?? 0 } });
});

const patchSubmissionSchema = z.object({
  status: z.enum(['corroborated', 'disputed', 'stale']),
});

// PATCH /v1/admin/prices/submissions/:id — approve (corroborated), dispute, or stale
pricesAdminRouter.patch(
  '/submissions/:id',
  zValidator('json', patchSubmissionSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid status' }, 422);
    }
  }),
  async (ctx) => {
    const { id } = ctx.req.param();
    const { status } = ctx.req.valid('json');

    const result = await setSubmissionStatus(id, status);

    if (result.ok === 'contest_lockout') {
      apiLogger.warn(
        { submissionId: id },
        'PATCH lockout: contest row reached the non-contest endpoint',
      );
      // `endpoint_lockout: contest_row` is the alert tag (spec §11.3). Baseline
      // volume should be near zero — any firing is real signal that the new
      // contest UI is being bypassed.
      Sentry.captureMessage(
        'Contest row hit PATCH /v1/admin/prices/submissions/:id',
        {
          level: 'warning',
          tags: { endpoint_lockout: 'contest_row' },
          extra: { submissionId: id },
        },
      );
      return ctx.json(
        {
          success: false,
          error:
            'This submission is part of a contest. Resolve via /v1/admin/contests/prices/:contestId instead.',
        },
        409,
      );
    }

    if (!result.ok)
      return ctx.json({ success: false, error: 'Submission not found' }, 404);

    ctx.set('auditActorId', getAuthUser(ctx).userId);
    ctx.set('auditAction', 'price.submission.update');
    ctx.set('auditTargetId', id);

    return ctx.json({ success: true, data: result.updated });
  },
);

// A dollar amount with at most two decimals, within the policy's ceiling. Zero
// is allowed (a free show); the consumer path's floor of 1 is a fan-input rule.
const dollarsSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/)
  .refine((value) => Number(value) <= SP_POLICY.ceilingMax);

// `priceMax` is always sent: `null` clears the top of the range, and leaving it
// out is an error rather than a silent clear (the edit sheet sends both).
const editPriceSchema = z
  .object({
    priceMin: dollarsSchema,
    priceMax: dollarsSchema.nullable(),
  })
  .refine(
    (body) =>
      body.priceMax === null || Number(body.priceMax) >= Number(body.priceMin),
    { message: 'priceMax must be at least priceMin' },
  );

// PATCH /v1/admin/prices/submissions/:id/price — correct a waiting or published
// price (the Submitted prices row menu's "Edit price"). A published price that
// is the show's displayed figure moves the show's price with it.
pricesAdminRouter.patch(
  '/submissions/:id/price',
  zValidator('param', z.object({ id: idSchema }), (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid id' }, 400);
    }
  }),
  zValidator('json', editPriceSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid price' }, 422);
    }
  }),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const { priceMin, priceMax } = ctx.req.valid('json');

    const result = await editSubmissionPrice(id, priceMin, priceMax ?? null);
    if (result.ok === 'contest_lockout') {
      return ctx.json(
        {
          success: false,
          error:
            'This price is part of a Price check. Resolve it from the Price checks tab.',
        },
        409,
      );
    }
    if (result.ok === 'not_editable') {
      return ctx.json(
        {
          success: false,
          error: 'Only a waiting or published price can be edited',
        },
        409,
      );
    }
    if (!result.ok)
      return ctx.json({ success: false, error: 'Submission not found' }, 404);

    ctx.set('auditActorId', getAuthUser(ctx).userId);
    ctx.set('auditAction', 'price.submission.edit_price');
    ctx.set('auditTargetId', id);
    ctx.set('auditMeta', {
      before: result.before,
      after: { priceMin, priceMax: priceMax ?? null },
      eventUpdated: result.eventUpdated,
    });

    return ctx.json({ success: true, data: result.updated });
  },
);

const rejectSubmissionSchema = z.object({
  reason: z.enum(REJECTION_REASONS),
  note: z.string().trim().min(1).max(500).optional(),
});

// POST /v1/admin/prices/submissions/:id/reject — turn a waiting price down.
// The row becomes `archived` with the reason in `archived_reason`; it is not
// a Price check (that is status `disputed`), and the fan sees "Not used".
pricesAdminRouter.post(
  '/submissions/:id/reject',
  zValidator('param', z.object({ id: idSchema }), (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid id' }, 400);
    }
  }),
  zValidator('json', rejectSubmissionSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid rejection' }, 422);
    }
  }),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const { reason, note } = ctx.req.valid('json');

    const result = await rejectSubmission(id, reason, note);
    if (result.ok === 'contest_lockout') {
      return ctx.json(
        {
          success: false,
          error:
            'This price is part of a Price check. Resolve it from the Price checks tab.',
        },
        409,
      );
    }
    if (result.ok === 'not_waiting') {
      return ctx.json(
        { success: false, error: 'Only a waiting price can be rejected' },
        409,
      );
    }
    if (!result.ok)
      return ctx.json({ success: false, error: 'Submission not found' }, 404);

    ctx.set('auditActorId', getAuthUser(ctx).userId);
    ctx.set('auditAction', 'price.submission.reject');
    ctx.set('auditTargetId', id);
    ctx.set('auditMeta', { reason, note: note ?? null });

    return ctx.json({ success: true, data: result.updated });
  },
);

// GET /v1/admin/prices/submissions/:id/fan-others — the other prices the same
// fan has submitted (the row menu's "See this fan's other prices"), newest
// first, at most 20. Price check counter rows are not prices and are left out.
pricesAdminRouter.get(
  '/submissions/:id/fan-others',
  zValidator('param', z.object({ id: idSchema }), (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid id' }, 400);
    }
  }),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const [own] = await db
      .select({
        userId: priceSubmissions.userId,
        handle: userProfiles.handle,
      })
      .from(priceSubmissions)
      .leftJoin(userProfiles, eq(priceSubmissions.userId, userProfiles.userId))
      .where(eq(priceSubmissions.id, id))
      .limit(1);
    if (!own) {
      return ctx.json({ success: false, error: 'Submission not found' }, 404);
    }
    if (own.userId === null) {
      return ctx.json({
        success: true,
        data: { handle: own.handle, rows: [] },
      });
    }

    const rows = await db
      .select({
        id: priceSubmissions.id,
        eventId: priceSubmissions.eventId,
        eventTitle: events.title,
        eventDate: events.date,
        venueName: venues.name,
        priceMin: priceSubmissions.priceMin,
        priceMax: priceSubmissions.priceMax,
        status: priceSubmissions.status,
        archivedReason: priceSubmissions.archivedReason,
        priceCheck: hasOpenPriceCheck(),
        createdAt: priceSubmissions.createdAt,
      })
      .from(priceSubmissions)
      .leftJoin(events, eq(priceSubmissions.eventId, events.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(
        and(
          eq(priceSubmissions.userId, own.userId),
          ne(priceSubmissions.id, id),
          isNull(priceSubmissions.disputedSubmissionId),
        ),
      )
      .orderBy(desc(priceSubmissions.createdAt))
      .limit(20);

    return ctx.json({
      success: true,
      data: {
        handle: own.handle,
        rows: rows.map(({ archivedReason, ...row }) => ({
          ...row,
          state: stateOf(row),
          rejection: parseRejection({ ...row, archivedReason }),
        })),
      },
    });
  },
);

// GET /v1/admin/prices/activity — last 100 price retrieval attempts with event + venue context
pricesAdminRouter.get('/activity', async (ctx) => {
  const rows = await db
    .select({
      eventId: priceRetrievalLog.eventId,
      eventTitle: events.title,
      venueName: venues.name,
      date: events.date,
      source: priceRetrievalLog.source,
      outcome: priceRetrievalLog.outcome,
      latencyMs: priceRetrievalLog.latencyMs,
      attemptedAt: priceRetrievalLog.attemptedAt,
    })
    .from(priceRetrievalLog)
    .leftJoin(events, eq(priceRetrievalLog.eventId, events.id))
    .leftJoin(venues, eq(events.venueId, venues.id))
    .orderBy(asc(events.date), desc(priceRetrievalLog.attemptedAt))
    .limit(100);

  return ctx.json({ success: true, data: rows });
});

const postAdminSubmissionSchema = z.object({
  eventId: idSchema,
  priceMin: z.string(),
  priceMax: z.string().optional(),
  vendor: z.enum(VENDOR_VALUES),
  howFound: z.enum(['bought_myself', 'saw_listing', 'at_the_venue']),
});

// POST /v1/admin/prices/submissions — admin manually enters a price (corroborated, tier GA)
pricesAdminRouter.post(
  '/submissions',
  zValidator('json', postAdminSubmissionSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json(
        { success: false, error: 'Invalid submission data' },
        422,
      );
    }
  }),
  async (ctx) => {
    const { eventId, priceMin, priceMax, vendor, howFound } =
      ctx.req.valid('json');
    const adminUser = getAuthUser(ctx);

    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event)
      return ctx.json({ success: false, error: 'Event not found' }, 404);

    // The Missing a price tab adds a price to a show without one. A show that
    // already has a price is changed through a Price check, not overwritten.
    const added = await db.transaction(async (tx) => {
      // The guard is the UPDATE's own predicate, so two admins adding at once
      // cannot both pass: the second finds the price set and gets no row.
      const claimed = await tx
        .update(events)
        .set({
          ticketPriceMin: priceMin,
          ticketPriceMax: priceMax ?? null,
          priceSource: 'community',
        })
        .where(and(eq(events.id, eventId), isNull(events.ticketPriceMin)))
        .returning({ id: events.id });
      if (claimed.length === 0) return false;

      await tx.insert(priceSubmissions).values({
        eventId,
        userId: adminUser.userId,
        tier: 'GA',
        vendor,
        howFound,
        // Admin-inserted rows need a non-null source_category so the partial
        // unique index covers them. Use the same (vendor, howFound) heuristic
        // as the consumer submit path.
        sourceCategory: deriveSourceCategory(vendor, howFound),
        priceMin,
        priceMax: priceMax ?? null,
        status: 'corroborated',
      });
      return true;
    });
    if (!added) {
      return ctx.json(
        { success: false, error: 'This show already has a price' },
        409,
      );
    }

    ctx.set('auditActorId', adminUser.userId);
    ctx.set('auditAction', 'price.submission.admin_add');
    ctx.set('auditTargetId', eventId);

    return ctx.json({ success: true }, 201);
  },
);

// POST /v1/admin/prices/pipeline/:eventId — on-demand price pipeline run
pricesAdminRouter.post('/pipeline/:eventId', async (ctx) => {
  const { eventId } = ctx.req.param();

  const [event] = await db
    .select({
      id: events.id,
      venueId: events.venueId,
      artist: events.artist,
      date: events.date,
      ticketUrl: events.ticketUrl,
      venue: {
        priceUrl: venues.priceUrl,
        crawlPausedAt: venues.crawlPausedAt,
      },
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event)
    return ctx.json({ success: false, error: 'Event not found' }, 404);
  if (!event.venueId)
    return ctx.json(
      { success: false, error: 'Event has no associated venue' },
      422,
    );

  // The pipeline fetches the venue's own price page, and a paused venue's
  // pages are not fetched at all.
  if (event.venue.crawlPausedAt !== null)
    return ctx.json(
      { success: false, error: 'Crawling is paused for this venue' },
      409,
    );

  const narrowedVenueId = event.venueId;

  runBackgroundTask(async () => {
    try {
      await runPricePipeline({
        eventId: event.id,
        venueId: narrowedVenueId,
        artist: event.artist,
        date: event.date,
        priceUrl: event.venue.priceUrl,
        ticketUrl: event.ticketUrl,
      });
    } catch (err) {
      logger.error({ err, eventId }, 'on-demand price pipeline failed');
    }
  });

  ctx.set('auditActorId', getAuthUser(ctx).userId);
  ctx.set('auditAction', 'price.pipeline.run');
  ctx.set('auditTargetId', eventId);

  return ctx.json(
    { success: true, data: { eventId, message: 'Pipeline started' } },
    202,
  );
});
