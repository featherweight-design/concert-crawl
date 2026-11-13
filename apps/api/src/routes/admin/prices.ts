import { Hono } from 'hono';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  max,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import * as Sentry from '@sentry/hono/node';
import {
  db,
  events,
  priceRetrievalLog,
  priceSubmissions,
  userProfiles,
  venues,
} from '@concert-crawl/db';
import { runPricePipeline } from '@concert-crawl/price-pipeline';
import { createLogger } from '@concert-crawl/logger';
import { VENDOR_VALUES, deriveSourceCategory } from '@concert-crawl/types';
import { getAuthUser } from '../../middleware/auth.js';
import { apiLogger } from '../../lib/logger.js';
import { runBackgroundTask } from '../../lib/background-tasks.js';
import type { AdminVariables } from './index.js';
import { idSchema } from '../../lib/id-schema.js';
import { setSubmissionStatus } from './lib/price-submission-status.js';
import { containsPattern } from '../../lib/escape-like.js';

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
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Denver',
    });

    // Exclude admin-hidden non-concerts (#732, same pattern as #712 on the
    // Missing tab). Events flagged hidden_from_consumer=true have already
    // been triaged as non-concerts — they shouldn't appear in the missing-
    // price queue or skew the coverage %.
    const conditions = [
      eq(events.status, 'upcoming'),
      gte(events.date, today),
      eq(events.hiddenFromConsumer, false),
      ...(missingOnly ? [isNull(events.ticketPriceMin)] : []),
    ];
    const whereClause = and(...conditions);

    // Use a single aggregating join instead of two correlated subqueries per row.
    // The subquery groups price_retrieval_log by event_id once, then LEFT JOINs in.
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

    const rowsPromise = db
      .select({
        eventId: events.id,
        eventTitle: events.title,
        artist: events.artist,
        venueName: venues.name,
        date: events.date,
        ticketUrl: events.ticketUrl,
        priceMin: events.ticketPriceMin,
        priceMax: events.ticketPriceMax,
        priceSource: events.priceSource,
        lastRetrievedAt: latestLog.lastRetrievedAt,
        lastOutcome: latestLog.lastOutcome,
      })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .leftJoin(latestLog, eq(latestLog.eventId, events.id))
      .where(whereClause)
      .orderBy(asc(events.date), asc(events.id))
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
const submissionsQuerySchema = z.object({
  count: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  status: z.enum(['pending', 'all']).optional().default('pending'),
  // The Submitted prices tab's filter chips (redesign 4d). When given it
  // replaces `status`; the four states are mutually exclusive, so the chip
  // counts add up to All: a price with an open Price check is "price-check"
  // whatever its own status is.
  state: z.enum(['all', 'waiting', 'published', 'price-check']).optional(),
  // "Search shows or people": the show's title, the venue's name, or the
  // fan's handle.
  search: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/** A price with a pending counter (an open Price check) filed against it. */
const hasOpenPriceCheck = sql<boolean>`EXISTS (
  SELECT 1 FROM price_submissions counter
  WHERE counter.disputed_submission_id = ${priceSubmissions.id}
    AND counter.status = 'pending'
)`;

/** The WHERE clause of one filter chip. */
const stateClause = (
  state: 'all' | 'waiting' | 'published' | 'price-check',
): SQL | undefined => {
  switch (state) {
    case 'price-check':
      return hasOpenPriceCheck;
    case 'waiting':
      return and(
        eq(priceSubmissions.status, 'pending'),
        sql`NOT ${hasOpenPriceCheck}`,
      );
    case 'published':
      return and(
        eq(priceSubmissions.status, 'corroborated'),
        sql`NOT ${hasOpenPriceCheck}`,
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
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid query params' }, 422);
    }
  }),
  async (ctx) => {
    const { count, status, state, search, limit, offset } =
      ctx.req.valid('query');

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
    const pattern = search === undefined ? undefined : containsPattern(search);
    const searchClause =
      pattern === undefined
        ? undefined
        : or(
            ilike(events.title, pattern),
            ilike(venues.name, pattern),
            ilike(userProfiles.handle, pattern),
          );
    const whereClause = and(
      statusClause,
      searchClause,
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
        // Fans who confirmed this price (the submitter is not counted).
        backedBy: sql<number>`(
          SELECT count(*)::int FROM submission_confirms sc
          WHERE sc.submission_id = ${priceSubmissions.id}
        )`,
        priceCheck: hasOpenPriceCheck,
        priceMin: priceSubmissions.priceMin,
        priceMax: priceSubmissions.priceMax,
        status: priceSubmissions.status,
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

    const withState = (
      list: Awaited<typeof rowsPromise>,
    ): (Awaited<typeof rowsPromise>[number] & { state: SubmissionState })[] =>
      list.map((row) => ({ ...row, state: stateOf(row) }));

    if (!count) {
      const rows = await rowsPromise;
      return ctx.json({ success: true, data: withState(rows) });
    }

    const countQuery = db
      .select({ total: sql<number>`count(*)::int` })
      .from(priceSubmissions)
      .leftJoin(events, eq(priceSubmissions.eventId, events.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .leftJoin(userProfiles, eq(priceSubmissions.userId, userProfiles.userId))
      .where(whereClause);
    const [rows, countResult] = await Promise.all([rowsPromise, countQuery]);
    const total = countResult[0]?.total ?? 0;
    return ctx.json({ success: true, data: { rows: withState(rows), total } });
  },
);

// GET /v1/admin/prices/submissions/counts — the Submitted prices filter chips.
// The four states are mutually exclusive over the same base filter as the list
// (no contest counter rows), so Waiting + Published + Price check never exceeds
// All (the rest are "Not used" and stale rows, shown under All only).
pricesAdminRouter.get('/submissions/counts', async (ctx) => {
  const base = isNull(priceSubmissions.disputedSubmissionId);
  const countWhere = async (clause: SQL | undefined): Promise<number> => {
    const [row] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(priceSubmissions)
      .where(and(base, clause));
    return row?.total ?? 0;
  };
  const [all, waiting, published, priceCheck] = await Promise.all([
    countWhere(undefined),
    countWhere(stateClause('waiting')),
    countWhere(stateClause('published')),
    countWhere(stateClause('price-check')),
  ]);
  return ctx.json({
    success: true,
    data: { all, waiting, published, priceCheck },
  });
});

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

    await db.transaction(async (tx) => {
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

      await tx
        .update(events)
        .set({
          ticketPriceMin: priceMin,
          ticketPriceMax: priceMax ?? null,
          priceSource: 'community',
        })
        .where(eq(events.id, eventId));
    });

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
