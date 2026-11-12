import { Hono } from 'hono';
import { endDelisting } from '@concert-crawl/db/upcoming-events';
import { zValidator } from '@hono/zod-validator';
import { validationHook } from '../../lib/validator.js';
import { activeSoldOutWhere, isSoldOutSql } from '../../lib/sold-out.js';
import { clearSoldOut } from '../../lib/clear-sold-out.js';
import { z } from 'zod';
import { httpUrl } from '../../lib/url-schema.js';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  auditLog,
  db,
  eventReports,
  events,
  notifications,
  userEvents,
  venues,
} from '@concert-crawl/db';
import {
  fanoutWatchNotification,
  WATCH_CATEGORY_FROM_REPORT_STATUS,
} from '@concert-crawl/push';
import { getAuthUser } from '../../middleware/auth.js';
import type { AdminVariables } from './index.js';
import {
  missingEventsSelect,
  missingEventsWhere,
  withMissingClassification,
} from './lib/missing-events.js';
import { idSchema } from '../../lib/id-schema.js';
import { eventPatchSchema, updateEvent } from './lib/event-update.js';
import { mergeEvents } from './lib/event-merge.js';
import { setHiddenFromConsumer, verifyEvent } from './lib/event-actions.js';

const eventIdSchema = z.object({ id: idSchema });

const MISSING_DATA_FLAGS = [
  'no-price',
  'no-show-time',
  'no-genre',
  'no-doors-time',
] as const;
type MissingDataFlag = (typeof MISSING_DATA_FLAGS)[number];
const MISSING_DATA_FLAG_SET = new Set<MissingDataFlag>(MISSING_DATA_FLAGS);

const isMissingDataFlag = (val: string): val is MissingDataFlag =>
  MISSING_DATA_FLAG_SET.has(val as MissingDataFlag);

const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

const csvStrings = z
  .string()
  .optional()
  .transform((val) =>
    val === undefined || val === ''
      ? []
      : val
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
  );

const csvMissingFlags = z
  .string()
  .optional()
  .transform((val, ctx) => {
    if (val === undefined || val === '') return [] as MissingDataFlag[];
    const items = val
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    const valid: MissingDataFlag[] = [];
    for (const item of items) {
      if (!isMissingDataFlag(item)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid missingData flag: ${item}`,
        });
        return z.NEVER;
      }
      valid.push(item);
    }
    return valid;
  });

const listQuerySchema = z.object({
  // Opt-in count flag for the new pagination component. When true, the
  // response wraps the array as `{ rows, total }` where `total` ignores
  // limit/offset. Default returns the legacy array so existing callers
  // (sidebar, watching, etc.) keep working unchanged.
  count: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  // When omitted, no verification filter is applied — used by PR 4's
  // All-events tab to surface both verified and unverified events.
  // The legacy callers (Review tab + missing fetch) pass it explicitly.
  verified: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  // Stale-event detection filter (#607). When `missing=true`, scope the list
  // to events the crawler stopped seeing — first_missing_at IS NOT NULL,
  // status = upcoming, date >= today — ordered most-recently-disappeared
  // first so the Admin > Review tab can surface them for triage. The
  // `verified` filter is intentionally ignored in this mode: a verified show
  // that vanishes is the most important case to surface.
  missing: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  // Saved views, not orthogonal predicates:
  //   'hidden-flagged-for-review' → hidden_from_consumer AND
  //     is_concert_review_needed — the classification review queue.
  //   'non-concert' → hidden_from_consumer alone, the superset. The review
  //     queue only ever returns rows the classifier was unsure about, so a
  //     hidden row carrying no review flag — an admin's own mistaken
  //     "Mark non-concert" — is invisible in the narrower view.
  view: z.enum(['hidden-flagged-for-review', 'non-concert']).optional(),
  // PR 5 — search + range + multi-tag filters. Comma-separated lists.
  query: z.string().trim().min(1).max(200).optional(),
  dateFrom: z.string().regex(dateOnlyRegex).optional(),
  dateTo: z.string().regex(dateOnlyRegex).optional(),
  genre: csvStrings,
  missingData: csvMissingFlags,
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

type EventsListView = z.infer<typeof listQuerySchema>['view'];

const viewClauses = (view: EventsListView): SQL[] => {
  switch (view) {
    case 'hidden-flagged-for-review':
      return [
        eq(events.hiddenFromConsumer, true),
        eq(events.isConcertReviewNeeded, true),
      ];
    case 'non-concert':
      return [eq(events.hiddenFromConsumer, true)];
    case undefined:
      return [];
  }
};

export const eventsAdminRouter = new Hono<AdminVariables>();

// GET /v1/admin/events/count — returns unverified + verified counts for badges/filter rail
eventsAdminRouter.get('/count', async (ctx) => {
  const [pendingResult, approvedResult] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(events)
      .where(eq(events.verified, false))
      .limit(1)
      .offset(0),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(events)
      .where(eq(events.verified, true))
      .limit(1)
      .offset(0),
  ]);

  return ctx.json({
    success: true,
    data: {
      pending: pendingResult[0]?.total ?? 0,
      approved: approvedResult[0]?.total ?? 0,
    },
  });
});

// PATCH /v1/admin/events/reports/:reportId/resolve — admin resolve a fan event report
const resolveReportSchema = z.object({
  resolution: z.enum(['promoted', 'rejected', 'needs-more-info']),
  adminNote: z.string().max(500).optional(),
});

eventsAdminRouter.patch(
  '/reports/:reportId/resolve',
  zValidator('json', resolveReportSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid input' }, 422);
    }
  }),
  async (ctx) => {
    const { reportId } = ctx.req.param();
    const { resolution, adminNote } = ctx.req.valid('json');

    const [report] = await db
      .select({
        id: eventReports.id,
        eventId: eventReports.eventId,
        status: eventReports.status,
        resolvedAt: eventReports.resolvedAt,
        createdAt: eventReports.createdAt,
      })
      .from(eventReports)
      .where(eq(eventReports.id, reportId))
      .limit(1);

    if (!report) {
      return ctx.json({ success: false, error: 'Report not found' }, 404);
    }

    if (report.resolvedAt != null) {
      return ctx.json(
        { success: false, error: 'Report already resolved' },
        400,
      );
    }

    // Pre-state check: does promoting this report actually flip user-visible
    // state? cancelled/postponed compare against events.status; sold-out
    // compares against whether another live promoted sold-out already exists.
    // Fan-out only fires on real transitions so duplicate confirmed reports
    // don't re-spam watchers.
    let isRealTransition = false;
    if (resolution === 'promoted') {
      if (report.status === 'cancelled' || report.status === 'postponed') {
        const [eventRow] = await db
          .select({ status: events.status, delistedAt: events.delistedAt })
          .from(events)
          .where(eq(events.id, report.eventId))
          .limit(1);
        // A delisted show was cancelled silently by the sweep (B+ A5).
        isRealTransition =
          eventRow?.status !== report.status || eventRow.delistedAt !== null;
      } else if (report.status === 'sold-out') {
        // Excludes the current report because we haven't run the update
        // below yet — its resolution is still null, so the resolution=
        // 'promoted' filter naturally omits it. Any match here is another
        // pre-existing promoted sold-out on this event.
        const existing = await db
          .select({ id: eventReports.id })
          .from(eventReports)
          .where(activeSoldOutWhere(report.eventId))
          .limit(1);
        isRealTransition = existing.length === 0;
      }
    }

    // Promoting a Tickets available is clearing the sold-out it answered,
    // which must still be live (the same rule as the fan threshold). The
    // sold-out reports it cleared go in the audit.
    let clearedSoldOut: string[] = [];
    if (resolution === 'promoted' && report.status === 'available') {
      clearedSoldOut = await clearSoldOut(
        report.eventId,
        adminNote ?? `cleared by tickets available report ${reportId}`,
        { filedAt: report.createdAt },
      );
      if (clearedSoldOut.length === 0) {
        return ctx.json(
          {
            success: false,
            error: 'No live sold-out for this report to clear',
            code: 'not_sold_out',
          },
          409,
        );
      }
    }

    const [updated] = await db
      .update(eventReports)
      .set({
        resolvedAt: new Date(),
        resolution,
        adminNote: adminNote ?? null,
      })
      .where(eq(eventReports.id, reportId))
      .returning();

    // If promoted and report maps to an event status — update the event
    if (resolution === 'promoted') {
      if (report.status === 'cancelled' || report.status === 'postponed') {
        await db
          .update(events)
          .set({ status: report.status, ...endDelisting() })
          .where(eq(events.id, report.eventId));
      }

      // #1064: fan out watch notifications to every user watching this event.
      // Best-effort — the resolve above already committed. Excluding
      // 'available' (handled above) narrows the status to the mapping's keys
      // without an `as` cast; the compiler forces us to update the mapping if
      // a new report status is added later. Gated on isRealTransition so a
      // second promoted cancelled/postponed/sold-out on an already-flagged
      // event doesn't duplicate notifications.
      if (isRealTransition && report.status !== 'available') {
        await fanoutWatchNotification(
          {
            db,
            notifications,
            userEvents,
            events,
            venues,
          },
          {
            eventId: report.eventId,
            category: WATCH_CATEGORY_FROM_REPORT_STATUS[report.status],
            // #1311: the promoted report IS the transition; the user-confirm
            // auto-promote path uses the same marker, so a report promoted by
            // both paths notifies once.
            transition: `report:${reportId}`,
          },
        );
      }
    }

    const actor = getAuthUser(ctx);
    ctx.set('auditAction', 'event.report.resolve');
    ctx.set('auditTargetId', reportId);
    ctx.set('auditActorId', actor.userId);
    ctx.set('auditMeta', {
      resolution,
      adminNote: adminNote ?? null,
      ...(clearedSoldOut.length > 0 && {
        clearedSoldOutReportIds: clearedSoldOut,
      }),
    });

    return ctx.json({ success: true, data: updated });
  },
);

// GET /v1/admin/events?verified=false&limit=50&offset=0
// GET /v1/admin/events?missing=true — filter to events the crawler stopped
// returning (stale-event detection, see issue #607). When `missing=true`,
// the `verified` filter is ignored and rows are ordered date ASC so the
// soonest upcoming show surfaces first. Each missing row is enriched with a
// `classification` (duplicate | moved | crawl_gap | removed) derived from four
// per-row SQL signals, a `clusterCount` of how many missing events share the
// same venue, and — when the matcher found a relocation candidate — a
// `movedCandidate` of { id, reason: 'date' | 'venue', title, date, venueName }.
eventsAdminRouter.get(
  '/',
  zValidator('query', listQuerySchema, validationHook),
  async (ctx) => {
    const {
      count,
      verified,
      missing,
      view,
      query,
      dateFrom,
      dateTo,
      genre,
      missingData,
      limit,
      offset,
    } = ctx.req.valid('query');

    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Denver',
    });

    // Build query as two separate branches because the order-by and where
    // shape differ — keeping them inline (rather than mutating a builder)
    // keeps Drizzle's type inference happy.
    const baseSelect = db
      .select({
        id: events.id,
        title: events.title,
        artist: events.artist,
        date: events.date,
        doorsTime: events.doorsTime,
        showTime: events.showTime,
        ticketPriceMin: events.ticketPriceMin,
        ticketPriceMax: events.ticketPriceMax,
        confidenceScore: sql<number | null>`(${events.confidenceScore})::float`,
        verified: events.verified,
        hiddenFromConsumer: events.hiddenFromConsumer,
        isConcertReviewNeeded: events.isConcertReviewNeeded,
        status: events.status,
        extractionStrategy: events.extractionStrategy,
        sourceUrl: events.sourceUrl,
        genre: events.genre,
        createdAt: events.createdAt,
        lastSeenAt: events.lastSeenAt,
        firstMissingAt: events.firstMissingAt,
        venueId: events.venueId,
        venueName: venues.name,
        isSoldOut: isSoldOutSql(),
      })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id));

    // PR 5 filter clauses. Each is undefined when its param is omitted, which
    // drizzle's `and()` treats as a no-op — so callers compose freely.
    const queryLike = query ? `%${query}%` : null;
    const searchClause = queryLike
      ? or(
          ilike(events.title, queryLike),
          ilike(events.artist, queryLike),
          ilike(venues.name, queryLike),
        )
      : undefined;

    const genreClause =
      genre.length > 0
        ? sql`${events.genre} && ARRAY[${sql.join(
            genre.map((tag) => sql`${tag}`),
            sql`, `,
          )}]::text[]`
        : undefined;

    const missingDataClauses = missingData.map((flag) => {
      switch (flag) {
        case 'no-price':
          return isNull(events.ticketPriceMin);
        case 'no-show-time':
          return isNull(events.showTime);
        case 'no-genre':
          return or(
            isNull(events.genre),
            sql`coalesce(cardinality(${events.genre}), 0) = 0`,
          );
        case 'no-doors-time':
          return isNull(events.doorsTime);
      }
    });

    // dateFrom defaults to today when not provided — preserves the legacy
    // "show upcoming only" behavior for callers that don't opt in to past
    // events. dateTo is open-ended unless caller supplies it.
    const effectiveDateFrom = dateFrom ?? today;
    const dateFromClause = gte(events.date, effectiveDateFrom);
    const dateToClause = dateTo ? lte(events.date, dateTo) : undefined;

    // Same WHERE shape used for both the row fetch and the count(*) query
    // when count=true. Pulling it out as a single expression guarantees the
    // count tracks the rows for any callers that opt in.
    //
    // The missing branch also excludes admin-hidden events (#712): an event
    // that's been marked non-concert (hidden_from_consumer=true) and then
    // stops appearing in crawls is not actionable — it should drop out of
    // the missing queue and the review/counts pill in lock-step.
    const whereClause = missing
      ? missingEventsWhere(today)
      : and(
          ...viewClauses(view),
          verified === undefined ? undefined : eq(events.verified, verified),
          dateFromClause,
          dateToClause,
          searchClause,
          genreClause,
          ...missingDataClauses,
        );

    // Keep the two branches fully separate so Drizzle's inferred types narrow
    // correctly for withMissingClassification (which requires venueHorizon +
    // hasLiveSibling — fields only present in missingEventsSelect).
    if (missing) {
      const missingQuery = missingEventsSelect(today)
        .where(whereClause)
        .orderBy(asc(events.date), desc(events.firstMissingAt))
        .limit(limit)
        .offset(offset);

      if (!count) {
        const rows = await missingQuery;
        return ctx.json({
          success: true,
          data: withMissingClassification(rows),
        });
      }

      const countQuery = db
        .select({ total: sql<number>`count(*)::int` })
        .from(events)
        .leftJoin(venues, eq(events.venueId, venues.id))
        .where(whereClause);

      const [rows, countResult] = await Promise.all([missingQuery, countQuery]);
      const total = countResult[0]?.total ?? 0;
      return ctx.json({
        success: true,
        data: { rows: withMissingClassification(rows), total },
      });
    }

    const rowsPromise = baseSelect
      .where(whereClause)
      .orderBy(asc(events.date), desc(events.createdAt))
      .limit(limit)
      .offset(offset);

    if (!count) {
      const rows = await rowsPromise;
      return ctx.json({ success: true, data: rows });
    }

    // count=true: parallelize the row fetch and the count so the extra query
    // doesn't double the response time. The count needs the missing branch's
    // venue join only if a future filter references venues.name — today it
    // does (search), so we count off the same joined view.
    const countQuery = db
      .select({ total: sql<number>`count(*)::int` })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(whereClause);

    const [rows, countResult] = await Promise.all([rowsPromise, countQuery]);
    const total = countResult[0]?.total ?? 0;
    return ctx.json({ success: true, data: { rows, total } });
  },
);

// POST /v1/admin/events/bulk-auto-approve — approve all unverified events above a confidence threshold
// Used as a one-time backfill after the auto-approve threshold was introduced in the crawler.
eventsAdminRouter.post(
  '/bulk-auto-approve',
  zValidator(
    'json',
    z.object({
      confidenceThreshold: z.number().min(0).max(1).default(0.7),
    }),
    validationHook,
  ),
  async (ctx) => {
    const { confidenceThreshold } = ctx.req.valid('json');

    const updated = await db
      .update(events)
      .set({ verified: true, updatedAt: new Date() })
      .where(
        and(
          eq(events.verified, false),
          gte(events.confidenceScore, String(confidenceThreshold)),
        ),
      )
      .returning({ ok: sql<number>`1` });

    const actor = getAuthUser(ctx);
    ctx.set('auditAction', 'event.bulk_auto_approve');
    ctx.set('auditActorId', actor.userId);
    ctx.set('auditMeta', {
      count: updated.length,
      confidenceThreshold,
    });

    return ctx.json({ success: true, data: { approved: updated.length } });
  },
);

// PATCH /v1/admin/events/:id/verify — approve an event (set verified=true)
eventsAdminRouter.patch(
  '/:id/verify',
  zValidator('param', eventIdSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');

    const updated = await verifyEvent(id);

    if (!updated) {
      return ctx.json({ success: false, error: 'Event not found' }, 404);
    }

    const actor = getAuthUser(ctx);
    ctx.set('auditAction', 'event.verify');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', actor.userId);

    return ctx.json({ success: true, data: updated });
  },
);

// GET /v1/admin/events/:id — single event for the admin editor surface.
// Same projection as the list endpoint so the editor can hydrate every
// section from a single payload.
eventsAdminRouter.get(
  '/:id',
  zValidator('param', eventIdSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');

    const [row] = await db
      .select({
        id: events.id,
        title: events.title,
        artist: events.artist,
        date: events.date,
        doorsTime: events.doorsTime,
        showTime: events.showTime,
        ticketPriceMin: events.ticketPriceMin,
        ticketPriceMax: events.ticketPriceMax,
        confidenceScore: sql<number | null>`(${events.confidenceScore})::float`,
        verified: events.verified,
        hiddenFromConsumer: events.hiddenFromConsumer,
        isConcertReviewNeeded: events.isConcertReviewNeeded,
        status: events.status,
        extractionStrategy: events.extractionStrategy,
        sourceUrl: events.sourceUrl,
        genre: events.genre,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        lastSeenAt: events.lastSeenAt,
        firstMissingAt: events.firstMissingAt,
        venueId: events.venueId,
        venueName: venues.name,
        // Admin-editable (#992): the tour kicker is only ever auto-populated
        // by the LLM extractor, so JSON-LD venues need a manual entry path.
        tourName: events.tourName,
        isSoldOut: isSoldOutSql(),
      })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.id, id))
      .limit(1);

    if (!row) {
      return ctx.json({ success: false, error: 'Not found' } as const, 404);
    }

    return ctx.json({ success: true, data: row } as const);
  },
);

// PATCH /v1/admin/events/:id — partial update (verified, status, content fields)
eventsAdminRouter.patch(
  '/:id',
  zValidator('param', eventIdSchema, validationHook),
  zValidator('json', eventPatchSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const body = ctx.req.valid('json');

    const updated = await updateEvent(id, body);
    if (!updated) {
      return ctx.json({ success: false, error: 'Not found' } as const, 404);
    }

    const actor = getAuthUser(ctx);
    ctx.set('auditAction', 'event.update');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', actor.userId);

    return ctx.json({ success: true, data: updated } as const);
  },
);

// DELETE /v1/admin/events/:id — remove an event from the catalog.
// PR 6 loosened the original "unverified-only" guard: admins can delete
// verified events too (every delete is audit-logged).
eventsAdminRouter.delete(
  '/:id',
  zValidator('param', eventIdSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');

    const [deleted] = await db
      .delete(events)
      .where(eq(events.id, id))
      .returning();

    if (!deleted) {
      return ctx.json({ success: false, error: 'Event not found' }, 404);
    }

    const actor = getAuthUser(ctx);
    ctx.set('auditAction', 'event.delete');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', actor.userId);
    ctx.set('auditMeta', { wasVerified: deleted.verified });

    return ctx.json({ success: true });
  },
);

// POST /v1/admin/events/:id/sold-out — admin-authored sold-out event_report,
// auto-promoted on creation. Idempotent: if an active promoted sold-out report
// already exists, returns 200 with that row instead of creating a duplicate.
const markSoldOutSchema = z.object({
  evidenceMethod: z
    .enum(['venue_site', 'saw_listing', 'bought_myself', 'other'])
    .optional()
    .default('other'),
  evidenceUrl: httpUrl(500).optional(),
  note: z.string().max(280).optional(),
});

eventsAdminRouter.post(
  '/:id/sold-out',
  zValidator('param', eventIdSchema, validationHook),
  zValidator('json', markSoldOutSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid input' }, 422);
    }
  }),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const { evidenceMethod, evidenceUrl, note } = ctx.req.valid('json');
    const actor = getAuthUser(ctx);

    // Verify the event exists before authoring a report against it.
    const [eventRow] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, id))
      .limit(1);

    if (!eventRow) {
      return ctx.json({ success: false, error: 'Event not found' }, 404);
    }

    // Idempotency check: if an active promoted sold-out report already exists,
    // return it instead of inserting a duplicate. "Active" here means resolved
    // with resolution='promoted' (i.e. the event is currently marked sold out).
    //
    // Race-safety: the SELECT-then-INSERT pattern below would race under
    // concurrent admin POSTs. Migration 0032 enforces this invariant at the
    // DB layer with a partial unique index on event_reports
    // (event_id) WHERE status='sold-out' AND resolved_at IS NOT NULL
    // AND resolution='promoted'. The INSERT below catches the resulting
    // unique-violation, re-queries for the now-existing row, and returns it
    // (so the API behavior stays consistent regardless of which caller won).
    const fetchExisting = () =>
      db.select().from(eventReports).where(activeSoldOutWhere(id)).limit(1);

    const [existing] = await fetchExisting();

    if (existing) {
      // Audit even on the idempotent path so admin actions are always traceable.
      ctx.set('auditAction', 'event.sold_out.mark');
      ctx.set('auditTargetId', id);
      ctx.set('auditActorId', actor.userId);
      ctx.set('auditMeta', {
        reportId: existing.id,
        idempotent: true,
      });
      return ctx.json({ success: true, data: existing }, 200);
    }

    let created: typeof eventReports.$inferSelect | undefined;
    try {
      const inserted = await db
        .insert(eventReports)
        .values({
          eventId: id,
          reporterId: actor.userId,
          status: 'sold-out',
          evidenceMethod,
          evidenceUrl: evidenceUrl ?? null,
          note: note ?? null,
          resolvedAt: new Date(),
          resolution: 'promoted',
          adminNote: 'admin-authored — auto-promoted on creation',
        })
        .returning();
      created = inserted[0];
    } catch (err) {
      // Unique-violation from the partial index = another concurrent POST won
      // the race. Treat as idempotent: re-query and return that row at 200.
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code?: string }).code === '23505'
      ) {
        const [winner] = await fetchExisting();
        if (winner) {
          ctx.set('auditAction', 'event.sold_out.mark');
          ctx.set('auditTargetId', id);
          ctx.set('auditActorId', actor.userId);
          ctx.set('auditMeta', {
            reportId: winner.id,
            idempotent: true,
            raceLost: true,
          });
          return ctx.json({ success: true, data: winner }, 200);
        }
      }
      throw err;
    }

    ctx.set('auditAction', 'event.sold_out.mark');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', actor.userId);
    ctx.set('auditMeta', {
      reportId: created?.id ?? null,
      evidenceMethod,
      evidenceUrl: evidenceUrl ?? null,
    });

    // #1064: fan out watch.soldout to every user watching this event. Only on
    // the freshly-created path — the idempotent early-return above already
    // covers the "already sold out" case (watchers were notified on the
    // original mark).
    // `created` is always set by a successful INSERT ... RETURNING; the
    // guard only narrows the type so the marker never names a missing row.
    if (created) {
      await fanoutWatchNotification(
        {
          db,
          notifications,
          userEvents,
          events,
          venues,
        },
        {
          eventId: id,
          category: 'watch.soldout',
          // #1311: the admin-authored promoted sold-out report IS the
          // transition. Marking available and then sold out again creates a
          // new report, so a second genuine sell-out notifies again.
          transition: `report:${created.id}`,
        },
      );
    }

    return ctx.json({ success: true, data: created }, 201);
  },
);

// POST /v1/admin/events/:id/available — inverse of Mark Sold Out. Dismisses
// the active promoted sold-out report. The row is preserved (resolution flipped
// to 'rejected') because its history is meaningful. Idempotent no-op when no
// active sold-out report exists.
const markAvailableSchema = z.object({
  note: z.string().max(500).optional(),
});

eventsAdminRouter.post(
  '/:id/available',
  zValidator('param', eventIdSchema, validationHook),
  zValidator('json', markAvailableSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid input' }, 422);
    }
  }),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const { note } = ctx.req.valid('json');
    const actor = getAuthUser(ctx);

    // Verify the event exists — return 404 for unknown IDs so this endpoint
    // doesn't masquerade a bogus call as a successful no-op (matches the
    // sold-out endpoint and the rest of admin/events).
    const [eventRow] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, id))
      .limit(1);

    if (!eventRow) {
      return ctx.json({ success: false, error: 'Event not found' }, 404);
    }

    const cleared = await clearSoldOut(id, note ?? 'admin marked available');

    // 204 either way (idempotent no-op when nothing was active). Audit only
    // when we actually cleared something — admin action with no DB effect
    // doesn't earn an audit row.
    if (cleared.length > 0) {
      ctx.set('auditAction', 'event.sold_out.clear');
      ctx.set('auditTargetId', id);
      ctx.set('auditActorId', actor.userId);
      ctx.set('auditMeta', { reportIds: cleared });
    }

    return ctx.body(null, 204);
  },
);

// PR 10 — bulk endpoints. Each action audit-logs once per affected event so
// the audit log mirrors per-row admin actions (lets compliance reconstruct
// who touched which event without parsing a single batched meta blob).
const BULK_MAX = 100;

const bulkIdsSchema = z.object({
  ids: z.array(idSchema).min(1).max(BULK_MAX),
});

const bulkDeleteSchema = bulkIdsSchema.extend({
  confirmation: z.literal('DELETE'),
});

// POST /v1/admin/events/bulk/unverify — send a list of events back to review.
// Mutation + per-event audit inserts run inside a single transaction so the
// audit log can't drift out of sync with the row state on a transient DB error.
eventsAdminRouter.post(
  '/bulk/unverify',
  zValidator('json', bulkIdsSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid input' }, 422);
    }
  }),
  async (ctx) => {
    const { ids } = ctx.req.valid('json');
    const actor = getAuthUser(ctx);

    const count = await db.transaction(async (tx) => {
      const updated = await tx
        .update(events)
        .set({ verified: false, updatedAt: new Date() })
        .where(inArray(events.id, ids))
        .returning({ id: events.id });
      if (updated.length > 0) {
        await tx.insert(auditLog).values(
          updated.map((row) => ({
            actorId: actor.userId,
            action: 'event.bulk_unverify',
            targetId: row.id,
            metadata: null,
          })),
        );
      }
      return updated.length;
    });

    return ctx.json({ success: true, data: { count } });
  },
);

// POST /v1/admin/events/bulk/mark-non-concert — set hiddenFromConsumer=true.
//
// Scoped to rows currently visible, mirroring bulk/mark-as-concert (#814 R2):
// bulk-dock selections survive pagination, so the body can carry rows that
// are already hidden, and those must not bump updatedAt or write audit
// entries for a transition that didn't happen (#815).
eventsAdminRouter.post(
  '/bulk/mark-non-concert',
  zValidator('json', bulkIdsSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid input' }, 422);
    }
  }),
  async (ctx) => {
    const { ids } = ctx.req.valid('json');
    const actor = getAuthUser(ctx);

    const count = await db.transaction(async (tx) => {
      const changed = await setHiddenFromConsumer(tx, ids, true);
      if (changed.length > 0) {
        await tx.insert(auditLog).values(
          changed.map((changedId) => ({
            actorId: actor.userId,
            action: 'event.bulk_mark_non_concert',
            targetId: changedId,
            metadata: null,
          })),
        );
      }
      return changed.length;
    });

    return ctx.json({ success: true, data: { count } });
  },
);

// POST /v1/admin/events/bulk/mark-as-concert — set hiddenFromConsumer=false
// (the inverse of bulk/mark-non-concert; surfaced via the classification
// review queue chip in the All Events bulk dock, issue #809). Does NOT
// touch is_concert_review_needed — that flag reflects the LLM's view,
// not the admin's resolution, per the classification-review-queue spec.
//
// The WHERE filter scopes the update to rows currently in
// hiddenFromConsumer=true, so the endpoint only bumps updatedAt and emits
// audit entries for rows that actually transitioned. Bulk-dock selections
// survive pagination, so the request body can include rows the caller no
// longer sees as hidden; without the filter, those rows would still flip
// updatedAt and emit audit noise. The mirror cleanup for bulk/mark-non-
// concert landed in #815. (#809; #814 review round 2)
eventsAdminRouter.post(
  '/bulk/mark-as-concert',
  zValidator('json', bulkIdsSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid input' }, 422);
    }
  }),
  async (ctx) => {
    const { ids } = ctx.req.valid('json');
    const actor = getAuthUser(ctx);

    const count = await db.transaction(async (tx) => {
      const changed = await setHiddenFromConsumer(tx, ids, false);
      if (changed.length > 0) {
        await tx.insert(auditLog).values(
          changed.map((changedId) => ({
            actorId: actor.userId,
            action: 'event.bulk_mark_as_concert',
            targetId: changedId,
            metadata: null,
          })),
        );
      }
      return changed.length;
    });

    return ctx.json({ success: true, data: { count } });
  },
);

// POST /v1/admin/events/bulk/delete — permanent removal with typed-DELETE gate.
eventsAdminRouter.post(
  '/bulk/delete',
  zValidator('json', bulkDeleteSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid input' }, 422);
    }
  }),
  async (ctx) => {
    const { ids } = ctx.req.valid('json');
    const actor = getAuthUser(ctx);

    const count = await db.transaction(async (tx) => {
      const deleted = await tx
        .delete(events)
        .where(inArray(events.id, ids))
        .returning({ id: events.id });
      if (deleted.length > 0) {
        await tx.insert(auditLog).values(
          deleted.map((row) => ({
            actorId: actor.userId,
            action: 'event.bulk_delete',
            targetId: row.id,
            metadata: null,
          })),
        );
      }
      return deleted.length;
    });

    return ctx.json({ success: true, data: { count } });
  },
);

const mergeSchema = z.object({
  targetId: idSchema,
  /**
   * Fire the watch-update fan-out on the target after the merge commits.
   * Defaults to false because an ordinary de-duplication merge must stay
   * silent; only a confirmed relocation tells watchers anything. This is a
   * path discriminator, not an admin checkbox — surfacing it as a toggle
   * would invite it being left off on the one case it exists for.
   */
  notifyWatchers: z.boolean().optional().default(false),
  /**
   * Provenance: present when the admin confirmed a matcher suggestion rather
   * than hand-searching a target. Recorded on the audit row so confirmed
   * suggestions can be counted against hand-searched merges — without that
   * denominator the relaxed matcher can never be calibrated, and "suggest,
   * never auto-apply" stays permanent rather than provisional.
   *
   * Audit only. It never decides what the notification says; that is derived
   * from the rows below, because a client claim must not choose the copy a
   * watcher reads.
   */
  suggestion: z
    .object({ reason: z.union([z.literal('date'), z.literal('venue')]) })
    .nullish(),
});

// POST /v1/admin/events/:id/merge — fold a source event into a target event,
// moving every user-side reference (watchlist rows, sold-out/cancelled reports,
// price submissions, price retrieval logs) onto the target, then deleting the
// source event row. The whole thing runs inside one transaction: if any move
// fails, nothing is persisted (so the FK cascade on DELETE can't orphan moved
// rows). The audit log captures the source id, target id, and per-table move
// counts so we can reconstruct what happened from the audit row alone.
//
// `user_events` has a UNIQUE (user_id, event_id). If the same user already has
// the target event on their list, we can't move the source row — it would
// duplicate the key. Those rows are dropped from the source side; the target
// wins and the count is reported separately as `userEventsDropped`.
eventsAdminRouter.post(
  '/:id/merge',
  zValidator('param', eventIdSchema, validationHook),
  zValidator('json', mergeSchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json({ success: false, error: 'Invalid input' }, 422);
    }
  }),
  async (ctx) => {
    const { id: sourceId } = ctx.req.valid('param');
    const { targetId, notifyWatchers, suggestion } = ctx.req.valid('json');
    const actor = getAuthUser(ctx);

    if (sourceId === targetId) {
      return ctx.json(
        { success: false, error: 'Source and target must differ' },
        422,
      );
    }

    const result = await mergeEvents({
      sourceId,
      targetId,
      actorId: actor.userId,
      notifyWatchers,
      suggestion,
    });
    if (result.ok === 'source_not_found') {
      return ctx.json({ success: false, error: 'Source event not found' }, 404);
    }
    if (result.ok === 'target_not_found') {
      return ctx.json({ success: false, error: 'Target event not found' }, 404);
    }
    const referencesMoved = result.referencesMoved;

    return ctx.json({
      success: true,
      data: { mergedInto: targetId, referencesMoved },
    });
  },
);
