import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { validationHook, zodIssuesResponse } from '../../lib/validator.js';
import {
  activeSoldOutWhere,
  ADMIN_AUTHORED_SOLD_OUT_NOTE,
  isSoldOutSql,
} from '../../lib/sold-out.js';
import { clearSoldOut } from '../../lib/clear-sold-out.js';
import type { DbExecutor } from '../../lib/db-executor.js';
import { apiLogger } from '../../lib/logger.js';
import {
  classifySaleRefusal,
  lockEventForSaleWrite,
  NotOnSaleError,
  notOnSaleBody,
  PAST_LOCKED_BODY,
  PastLockedError,
} from '../../lib/past-lock.js';
import { promoteReport } from '../../lib/promote-report.js';
import { z } from 'zod';
import { httpUrl } from '../../lib/url-schema.js';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  max,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  auditLog,
  db,
  eventReports,
  events,
  findUpcomingKeyHolder,
  moveEventVenue,
  notifications,
  priceRetrievalLog,
  priceSubmissions,
  userEvents,
  venues,
} from '@concert-crawl/db';
import { deriveTicketLinks } from '@concert-crawl/crawler-core/ticket-links';
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
import { EVENT_NIGHT_UNIQUE_INDEX, mergeEvents } from './lib/event-merge.js';
import { deleteManualEvents } from './lib/event-delete.js';
import { containsPattern } from '../../lib/escape-like.js';
import { setHiddenFromConsumer, verifyEvent } from './lib/event-actions.js';
import {
  eventListQuerySchema,
  eventListStatusSql,
  hiddenReasonSql,
  listAdminEvents,
} from './lib/events-browse.js';
import {
  submittedPriceWhere,
  watchingCountOf,
  wentCountOf,
} from './lib/event-counts.js';
import {
  loadMergeCandidates,
  loadMergePreview,
  mergePreviewQuerySchema,
} from './lib/event-merge-preview.js';
import { loadSoldOutRecord } from './lib/sold-out-record.js';
import { todayInDenver } from '../../lib/time.js';
import { isUniqueViolationOn } from '../../lib/pg-errors.js';
import {
  createEventSchema,
  createManualEvent,
  duplicateQuerySchema,
  findDuplicates,
  lineupBodySchema,
  readLineup,
  saveLineup,
} from './lib/event-create.js';

const eventIdSchema = z.object({ id: idSchema });

// POST /:id/venue. The code matches Add a show's venue field. Lowercased as
// `idSchema` does: the same-venue no-op compares ids in code, so a mixed-case
// copy of the current venue's id must still read as the same venue.
const venueMoveBodySchema = z.object({
  venueId: z
    .guid({ error: 'venue_required' })
    .transform((id) => id.toLowerCase()),
});

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

// GET /v1/admin/events/list — the admin Events page (4b-1): Upcoming or Past,
// search, venue and status filters, No price and Hidden, with the chip and
// popover counts. Registered before `/:id` so `list` is never read as an id.
eventsAdminRouter.get(
  '/list',
  zValidator('query', eventListQuerySchema, validationHook),
  async (ctx) => {
    const data = await listAdminEvents(ctx.req.valid('query'), todayInDenver());
    return ctx.json({ success: true, data } as const);
  },
);

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

    // Promoting any report goes through the shared writes, which decide under
    // the event's and the report's row locks: whether it is news (fan-out
    // fires only on a real transition) is read there too. A past show is 409
    // `past_locked` (except a cancelled report on a postponed show whose date
    // passed, which promotes) and a missing event 404, with nothing written and no
    // audit row; a report resolved before the lock keeps the already-resolved
    // answer.
    let isRealTransition = false;
    const alreadyResolved = () =>
      ctx.json({ success: false, error: 'Report already resolved' }, 400);
    const refusal = (err: unknown) =>
      classifySaleRefusal(err, {
        msg: 'admin report resolve',
        eventId: report.eventId,
        reportId,
      });

    // Promoting a Tickets available is clearing the sold-out it answered,
    // which must still be live (the same rule as the fan threshold). The
    // sold-out reports it cleared go in the audit.
    let clearedSoldOut: string[] = [];
    if (resolution === 'promoted' && report.status === 'available') {
      let clear: Awaited<ReturnType<typeof clearSoldOut>>;
      try {
        clear = await clearSoldOut(
          report.eventId,
          adminNote ?? `cleared by tickets available report ${reportId}`,
          {
            report: {
              id: reportId,
              filedAt: report.createdAt,
              onPast: 'refuse',
            },
          },
        );
      } catch (err) {
        const refused = refusal(err);
        if (refused === 'past') return ctx.json(PAST_LOCKED_BODY, 409);
        if (refused === 'missing') {
          return ctx.json({ success: false, error: 'Event not found' }, 404);
        }
        throw err;
      }
      if (clear.outcome === 'already_resolved') return alreadyResolved();
      if (clear.outcome !== 'cleared') {
        return ctx.json(
          {
            success: false,
            error: 'No live sold-out for this report to clear',
            code: 'not_sold_out',
          },
          409,
        );
      }
      clearedSoldOut = clear.cleared;
    }

    let updated: typeof eventReports.$inferSelect | undefined;
    // Sold-out, cancelled and postponed promote through promoteReport. Here a
    // past show refuses (409) rather than closing, so `closedAsMoot` means the
    // report changed nothing on a live show: a second sold-out on a show
    // already sold out, a postponed or sold-out report on a cancelled show, or
    // a sold-out on a postponed one. It closes as moot (rejected) and tells
    // nobody.
    let closedAsMoot = false;
    if (resolution === 'promoted' && report.status !== 'available') {
      let promotion: Awaited<ReturnType<typeof promoteReport>>;
      try {
        promotion = await promoteReport(
          report.eventId,
          reportId,
          report.status,
          { onPast: 'refuse', adminNote: adminNote ?? null },
        );
      } catch (err) {
        const refused = refusal(err);
        if (refused === 'past') return ctx.json(PAST_LOCKED_BODY, 409);
        if (refused === 'missing') {
          return ctx.json({ success: false, error: 'Event not found' }, 404);
        }
        throw err;
      }
      if (promotion.outcome === 'already_resolved') return alreadyResolved();
      ({ report: updated, isRealTransition } = promotion);
      closedAsMoot = promotion.outcome === 'moot';
    } else if (resolution === 'promoted') {
      // A Tickets available: clearSoldOut above already resolved this report
      // as promoted, with the note, in its own transaction. Answer with it.
      [updated] = await db
        .select()
        .from(eventReports)
        .where(eq(eventReports.id, reportId))
        .limit(1);
    } else {
      // Matched on `resolved_at IS NULL`, so a reject or needs-more-info
      // never writes over a report a fan threshold promoted after the read
      // above; that report keeps the already-resolved answer.
      [updated] = await db
        .update(eventReports)
        .set({
          resolvedAt: new Date(),
          resolution,
          adminNote: adminNote ?? null,
        })
        .where(
          and(eq(eventReports.id, reportId), isNull(eventReports.resolvedAt)),
        )
        .returning();
      if (!updated) return alreadyResolved();
    }

    if (resolution === 'promoted') {
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
      ...(closedAsMoot && { closedAsMoot: true }),
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
    const queryLike = query ? containsPattern(query) : null;
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

// GET /v1/admin/events/duplicate?venueId&date&title — Add a show's amber
// warning (B+ addendum 5): the shows already at that venue that night, the
// likeliest first. A warning only; POST never refuses a show for it.
// Registered before `/:id` so `duplicate` is never read as an id.
eventsAdminRouter.get(
  '/duplicate',
  zValidator('query', duplicateQuerySchema, validationHook),
  async (ctx) => {
    const duplicates = await findDuplicates(ctx.req.valid('query'));
    return ctx.json({ success: true, data: { duplicates } } as const);
  },
);

// POST /v1/admin/events — Add a show by hand (admin 4a-3b). A show the
// crawler can't see: `manual`, `created_by` the admin, verified, its lineup
// written to the four arrays through the crawl's canonicaliser and linked in
// `event_artists`, all in one transaction. Field errors are 400s whose issue
// messages are ADD_SHOW_ERROR_CODES. A show already that night is NOT refused
// (the GET above warns); only a row already holding this show's exact crawl
// key (venue, date, headliner, show time) is a 409 `duplicate_show` with its
// `existingId`, because the unique index the crawl upserts on cannot hold two.
eventsAdminRouter.post(
  '/',
  zValidator('json', createEventSchema, validationHook),
  async (ctx) => {
    const body = ctx.req.valid('json');
    const actor = getAuthUser(ctx);

    const result = await createManualEvent(body, actor.userId);
    if (result.kind === 'duplicate') {
      return ctx.json(
        {
          success: false,
          error: 'duplicate_show',
          existingId: result.existingId,
        } as const,
        409,
      );
    }
    if (result.kind === 'invalid') {
      return zodIssuesResponse(ctx, result.issues);
    }

    const detail = await loadEventDetail(result.id, actor.userId);
    ctx.set('auditAction', 'event.create');
    ctx.set('auditTargetId', result.id);
    ctx.set('auditActorId', actor.userId);
    ctx.set('auditMeta', {
      title: body.title,
      venueId: body.venueId,
      date: body.date,
      lineup: body.lineup.map(({ name, role }) => ({ name, role })),
    });
    return ctx.json({ success: true, data: detail } as const, 201);
  },
);

// PUT /v1/admin/events/:id/lineup — save a show's lineup (admin 4a-3b), on a
// crawled or manual show, upcoming or past. Rewrites the four arrays, sets
// `lineup_edited_at` so the crawl keeps the admin's bill, and relinks
// `event_artists`, in one transaction under the row lock. Unmatched names
// keep their text and link once an artist by that name exists.
eventsAdminRouter.put(
  '/:id/lineup',
  zValidator('param', eventIdSchema, validationHook),
  zValidator('json', lineupBodySchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const { lineup } = ctx.req.valid('json');
    const actor = getAuthUser(ctx);

    const result = await saveLineup(id, lineup);
    if (result.kind === 'not_found') {
      return ctx.json({ success: false, error: 'Not found' } as const, 404);
    }
    if (result.kind === 'invalid') {
      return zodIssuesResponse(ctx, result.issues);
    }

    const detail = await loadEventDetail(id, actor.userId);
    ctx.set('auditAction', 'event.lineup.update');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', actor.userId);
    ctx.set('auditMeta', { before: result.before, after: result.after });
    return ctx.json({ success: true, data: detail } as const);
  },
);

// POST /v1/admin/events/:id/venue — change a show's venue (admin E2-C). Its own
// route rather than a PATCH field: a venue change writes a crawl redirect,
// can collide on the crawl key, tells Watchers through the relocation copy and
// audits under its own keys, none of which the field-by-field PATCH does.
// The rules live in moveEventVenue (@concert-crawl/db):
//   - a crawled show still to come (or postponed) is 409 `crawled_show`,
//     nothing written: its venue's calendar owns it;
//   - a manual show still to come (or postponed) is the Moved flow: the old crawl key
//     goes on a 'moved' redirect so the old venue's next crawl drops the
//     listing instead of inserting it again, Watchers hear the new room
//     (unless the show is cancelled), audit `event.venue.move`;
//   - a played show, crawled or manual, is a silent correction, audit
//     `event.venue.correct`;
//   - the same venue changes nothing (`outcome: 'unchanged'`, no audit);
//   - an unknown or removed venue is 400 `venue_not_found`, as Add a show;
//   - an upcoming show whose key is held at the new venue is 409
//     `duplicate_show` with `existingId`, and nothing changes.
eventsAdminRouter.post(
  '/:id/venue',
  zValidator('param', eventIdSchema, validationHook),
  zValidator('json', venueMoveBodySchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const { venueId } = ctx.req.valid('json');
    const actor = getAuthUser(ctx);

    let result: Awaited<ReturnType<typeof moveEventVenue>>;
    try {
      result = await moveEventVenue({
        eventId: id,
        venueId,
        actorId: actor.userId,
        today: todayInDenver,
        deriveTicketLinks,
      });
    } catch (err) {
      // A row that took the key after the pre-check: the update failed on the
      // unique index and the transaction rolled back.
      if (!isUniqueViolationOn(err, EVENT_NIGHT_UNIQUE_INDEX)) {
        apiLogger.error(
          { err, eventId: id, venueId },
          'admin venue move: write failed',
        );
        throw err;
      }
      apiLogger.warn(
        { eventId: id, venueId },
        'admin venue move: race lost to a show taking the key',
      );
      const existingId = await keyHolderAt(id, venueId);
      return ctx.json(
        { success: false, error: 'duplicate_show', existingId } as const,
        409,
      );
    }

    switch (result.kind) {
      case 'not_found':
        return ctx.json({ success: false, error: 'Not found' } as const, 404);
      case 'venue_not_found':
        return zodIssuesResponse(ctx, [
          { code: 'custom', path: ['venueId'], message: 'venue_not_found' },
        ]);
      case 'crawled_show':
        return ctx.json(
          { success: false, error: 'crawled_show' } as const,
          409,
        );
      case 'duplicate':
        return ctx.json(
          {
            success: false,
            error: 'duplicate_show',
            existingId: result.existingId,
          } as const,
          409,
        );
      case 'unchanged':
      case 'moved':
      case 'corrected':
        break;
    }

    // After commit: the fan-out is best-effort and never throws. The event
    // keeps its id, so every Watcher of it is someone for whom the room
    // changed. The committed updated_at names this move (#1311).
    let watchersNotified = 0;
    if (result.kind === 'moved' && result.notifyWatchers) {
      const sent = await fanoutWatchNotification(
        { db, notifications, userEvents, events, venues },
        {
          eventId: id,
          category: 'watch.postponed',
          transition: `venue:${result.updatedAt.toISOString()}`,
          // Both rooms as the committing transaction saw them, so a second
          // move landing before this runs cannot mix them.
          relocated: {
            fromVenueName: result.before.venueName,
            ...(result.after.venueName !== null && {
              toVenueName: result.after.venueName,
            }),
          },
        },
      );
      watchersNotified = sent.watchersNotified;
    }

    const detail = await loadEventDetail(id, actor.userId);
    return ctx.json({
      success: true,
      data: { outcome: result.kind, watchersNotified, event: detail },
    } as const);
  },
);

/** Who holds this event's crawl key at `venueId`, for a 409 found late. */
async function keyHolderAt(
  eventId: string,
  venueId: string,
): Promise<string | null> {
  const [row] = await db
    .select({
      date: events.date,
      canonicalArtist: events.canonicalArtist,
      showTime: events.showTime,
    })
    .from(events)
    .where(eq(events.id, eventId));
  if (!row) return null;
  return findUpcomingKeyHolder(db, { venueId, ...row }, eventId);
}

// GET /v1/admin/events/:id — single event for the admin editor surface.
// The list endpoint's projection plus the editor-only fields (the admin's
// own price, `mySubmissionId` and `mySubmission`), so the editor hydrates
// every section from a single payload.
eventsAdminRouter.get(
  '/:id',
  zValidator('param', eventIdSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const detail = await loadEventDetail(id, getAuthUser(ctx).userId);
    if (!detail) {
      return ctx.json({ success: false, error: 'Not found' } as const, 404);
    }
    return ctx.json({ success: true, data: detail } as const);
  },
);

/**
 * The admin detail payload GET /:id returns, which Add a show and the lineup
 * save answer with too. Null when the event does not exist. `actorId` picks
 * the admin's own price.
 */
async function loadEventDetail(id: string, actorId: string) {
  const today = todayInDenver();

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
      // The show's own page, which "On the venue's site" prefers.
      eventUrl: events.eventUrl,
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
      // Admin 4b-2 (Event edit). Additive: the old editor ignores them.
      venueSlug: venues.slug,
      ticketUrl: events.ticketUrl,
      delistedAt: events.delistedAt,
      listStatus: eventListStatusSql(today),
      hiddenReason: hiddenReasonSql(),
      watchingCount: watchingCountOf(),
      wentCount: wentCountOf(),
      // Admin 4a-3b: added by hand (and by whom), and whether an admin
      // saved the lineup (the crawl then keeps it).
      manual: events.manual,
      createdBy: events.createdBy,
      lineupEditedAt: events.lineupEditedAt,
      // Read for `lineup` below, not returned as is.
      bill: {
        headliners: events.headliners,
        supportingArtists: events.supportingArtists,
      },
      submittedPriceCount: sql<number>`(${db
        .select({ total: count() })
        .from(priceSubmissions)
        .where(
          and(eq(priceSubmissions.eventId, events.id), submittedPriceWhere()),
        )})`.mapWith(Number),
      priceRetrievedAt: sql<Date | null>`(${db
        .select({ at: max(priceRetrievalLog.attemptedAt) })
        .from(priceRetrievalLog)
        .where(eq(priceRetrievalLog.eventId, events.id))})`.mapWith(
        (value: string | Date | null) =>
          value === null ? null : new Date(value),
      ),
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(eq(events.id, id))
    .limit(1);

  if (!row) return null;
  const { bill, ...fields } = row;

  // The admin's own live price on this show, which Edit price opens.
  // With it, B+ addendum 7 §6's evidence behind a Sold out (null unless
  // it is), and the lineup; the reads are independent.
  const [[mine], soldOutRecord, lineup] = await Promise.all([
    db
      .select({
        id: priceSubmissions.id,
        priceMin: priceSubmissions.priceMin,
        priceMax: priceSubmissions.priceMax,
        // Pending, corroborated or disputed: says which route can edit it.
        status: priceSubmissions.status,
      })
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.eventId, id),
          eq(priceSubmissions.userId, actorId),
          submittedPriceWhere(),
        ),
      )
      .orderBy(desc(priceSubmissions.createdAt))
      .limit(1),
    row.isSoldOut ? loadSoldOutRecord(id) : Promise.resolve(null),
    readLineup(db, bill),
  ]);

  // `mySubmission` carries the prices Edit price opens with.
  // `mySubmissionId` is the field #418 shipped, kept as the contract.
  return {
    ...fields,
    lineup,
    mySubmissionId: mine?.id ?? null,
    mySubmission: mine ?? null,
    soldOutRecord,
  };
}

// PATCH /v1/admin/events/:id — partial update (verified, status, content fields)
eventsAdminRouter.patch(
  '/:id',
  zValidator('param', eventIdSchema, validationHook),
  zValidator('json', eventPatchSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const body = ctx.req.valid('json');

    // Past lock, on this PATCH only: a show whose stored date is before today
    // in Denver (the list's Past side) may change `hiddenFromConsumer` and the
    // corrections of B+ addendum 5 §4 (`title`, `doorsTime`, `showTime`, and
    // `date` to another past date), which tell no watcher. A past show stored
    // as postponed may make the `title` correction and change `date`,
    // `doorsTime`, `showTime` and `status`, so it can be rescheduled. A field
    // re-sent at its stored value is not a change. Anything else is 409
    // `past_locked`, read under the row lock, and not audited. Corrections
    // audit as `event.update`, like every other edit.
    //
    // A date or show-time change (or a status change back to upcoming) that
    // would land on another upcoming row's night at the venue (the partial
    // unique index the crawler upserts on) is 409 `duplicate_show` rather
    // than a 500.
    let updated: Awaited<ReturnType<typeof updateEvent>>;
    try {
      updated = await updateEvent(id, body, { lockPast: true });
    } catch (err) {
      if (err instanceof PastLockedError) {
        return ctx.json(PAST_LOCKED_BODY, 409);
      }
      if (isUniqueViolationOn(err, EVENT_NIGHT_UNIQUE_INDEX)) {
        apiLogger.warn({ eventId: id }, 'admin event PATCH: duplicate_show');
        return ctx.json(
          { success: false, error: 'duplicate_show' } as const,
          409,
        );
      }
      throw err;
    }
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

// DELETE /v1/admin/events/:id — remove a show an admin added by mistake.
// Only a manual row nobody depends on (E5-a, plan 4b#10; the guard is
// lib/event-delete.ts): a crawled row is 409 `not_manual` (the crawl would
// re-add it; hide it instead), and a manual row with Watchers, Submitted
// prices or incoming redirects is 409 `has_dependents` with the counts.
// The legacy editor's Delete calls this route too.
eventsAdminRouter.delete(
  '/:id',
  zValidator('param', eventIdSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');

    const result = await db.transaction((tx) => deleteManualEvents(tx, [id]));

    const [refusal] = result.skipped;
    if (refusal?.reason === 'not_manual') {
      return ctx.json({ success: false, error: 'not_manual' } as const, 409);
    }
    if (refusal?.reason === 'has_dependents') {
      return ctx.json(
        {
          success: false,
          error: 'has_dependents',
          counts: refusal.counts,
        } as const,
        409,
      );
    }
    const [deleted] = result.deleted;
    if (!deleted) {
      return ctx.json({ success: false, error: 'Event not found' }, 404);
    }

    const actor = getAuthUser(ctx);
    ctx.set('auditAction', 'event.delete');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', actor.userId);
    ctx.set('auditMeta', {
      title: deleted.title,
      venueId: deleted.venueId,
      venueName: deleted.venueName,
      date: deleted.date,
      wasVerified: deleted.wasVerified,
    });

    return ctx.json({ success: true });
  },
);

// POST /v1/admin/events/:id/sold-out — admin-authored sold-out event_report,
// auto-promoted on creation. Idempotent: if an active promoted sold-out report
// already exists, returns 200 with that row instead of creating a duplicate.
// The mark records how the admin knows (B+ addendum 7 §6). Every web caller
// sends a method (Event edit's form waits for a pick, and the one-tap actions
// send `other`), so the old `.default('other')` was dropped once that web
// build was live on prod (the contract step). A body without one is a 422.
const markSoldOutSchema = z.object({
  evidenceMethod: z.enum([
    'venue_site',
    'saw_listing',
    'bought_myself',
    'other',
  ]),
  evidenceUrl: httpUrl(500).optional(),
  note: z.string().max(280).optional(),
});

// Migration 0032's partial unique index: one live promoted sold-out per event.
const ACTIVE_SOLD_OUT_UNIQUE_INDEX =
  'event_reports_one_active_sold_out_per_event_idx';

type SoldOutMarkOutcome =
  | {
      kind: 'existing';
      report: typeof eventReports.$inferSelect;
      raceLost: boolean;
    }
  | { kind: 'created'; report: typeof eventReports.$inferSelect | undefined };

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

    // "Active" means resolved with resolution='promoted' (i.e. the event is
    // currently marked sold out).
    const fetchExisting = (executor: DbExecutor) =>
      executor
        .select()
        .from(eventReports)
        .where(activeSoldOutWhere(id))
        .limit(1);
    // One path, under the event's row lock. lockEventForSaleWrite checks
    // existence, the past lock (today read after the lock, so a PATCH that
    // moved the date, or midnight passing while this waited, is caught) and
    // that the show is on sale: a cancelled, postponed or delisted show is
    // 409 `not_on_sale`, also before idempotency, so re-marking one that is
    // already sold out is refused too.
    // The past lock answers before idempotency, so re-marking a PAST show
    // that is already sold out is 409 `past_locked`, not the idempotent 200
    // it was before the lock: its sale state is history either way, and the
    // refusal writes nothing and audits nothing. Concurrent admin POSTs
    // serialize on the lock and the loser finds the winner's report.
    // Migration 0032's partial unique index backs the invariant for any
    // writer that skips the lock: the insert runs in a savepoint, so its
    // unique violation leaves this transaction usable and the recovery read
    // is still made under the lock.
    let outcome: SoldOutMarkOutcome;
    try {
      outcome = await db.transaction(
        async (tx): Promise<SoldOutMarkOutcome> => {
          await lockEventForSaleWrite(tx, id);

          const [existing] = await fetchExisting(tx);
          if (existing) {
            return { kind: 'existing', report: existing, raceLost: false };
          }

          try {
            const [inserted] = await tx.transaction(async (savepoint) =>
              savepoint
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
                  adminNote: ADMIN_AUTHORED_SOLD_OUT_NOTE,
                })
                .returning(),
            );
            return { kind: 'created', report: inserted };
          } catch (err) {
            if (!isUniqueViolationOn(err, ACTIVE_SOLD_OUT_UNIQUE_INDEX)) {
              apiLogger.error(
                { err, eventId: id },
                'admin mark sold out: insert failed',
              );
              throw err;
            }
            apiLogger.warn(
              { eventId: id },
              'admin mark sold out: race lost to a concurrent sold-out',
            );
            const [winner] = await fetchExisting(tx);
            if (!winner) throw err;
            return { kind: 'existing', report: winner, raceLost: true };
          }
        },
      );
    } catch (err) {
      // A cancelled, postponed or delisted show has no sale to sell out.
      // Like past_locked, the refusal writes nothing and audits nothing.
      if (err instanceof NotOnSaleError) {
        apiLogger.warn(
          { eventId: id, reason: err.reason },
          'admin mark sold out: refused, show not on sale',
        );
        return ctx.json(notOnSaleBody(err.reason), 409);
      }
      const refused = classifySaleRefusal(err, {
        msg: 'admin mark sold out',
        eventId: id,
      });
      if (refused === 'past') return ctx.json(PAST_LOCKED_BODY, 409);
      if (refused === 'missing') {
        return ctx.json({ success: false, error: 'Event not found' }, 404);
      }
      throw err;
    }

    if (outcome.kind === 'existing') {
      // Audit even on the idempotent path so admin actions are always
      // traceable.
      ctx.set('auditAction', 'event.sold_out.mark');
      ctx.set('auditTargetId', id);
      ctx.set('auditActorId', actor.userId);
      ctx.set('auditMeta', {
        reportId: outcome.report.id,
        idempotent: true,
        ...(outcome.raceLost && { raceLost: true }),
      });
      return ctx.json({ success: true, data: outcome.report }, 200);
    }

    const created = outcome.report;
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

    // clearSoldOut takes the event's row lock and applies the past lock
    // (postponed-passed included) before any write, so a refusal changes
    // nothing, audits nothing and tells no watcher. An unknown id is 404 so
    // this endpoint doesn't masquerade a bogus call as a successful no-op
    // (matches the sold-out endpoint and the rest of admin/events).
    let cleared: string[];
    try {
      ({ cleared } = await clearSoldOut(id, note ?? 'admin marked available'));
    } catch (err) {
      const refused = classifySaleRefusal(err, {
        msg: 'admin mark available',
        eventId: id,
      });
      if (refused === 'past') return ctx.json(PAST_LOCKED_BODY, 409);
      if (refused === 'missing') {
        return ctx.json({ success: false, error: 'Event not found' }, 404);
      }
      throw err;
    }

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
// Each row takes the single delete's guard (lib/event-delete.ts): the rows it
// allows are deleted, the rest are skipped and reported with the reason, so a
// mixed batch is a 200. `count` stays for the callers that read only it.
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

    // One audit row per call, written in the same transaction, even when
    // every row was refused: the request and its refusals are on record.
    const result = await db.transaction(async (tx) => {
      const outcome = await deleteManualEvents(tx, ids);
      await tx.insert(auditLog).values({
        actorId: actor.userId,
        action: 'event.bulk_delete',
        targetId: null,
        metadata: {
          deletedIds: outcome.deleted.map((row) => row.id),
          // Title, venue and date of each deleted show.
          deleted: outcome.deleted,
          skipped: outcome.skipped,
          // Ids that named no event (already gone, or never existed).
          missing: outcome.missing,
        },
      });
      return outcome;
    });

    return ctx.json({
      success: true,
      data: {
        count: result.deleted.length,
        deletedIds: result.deleted.map((row) => row.id),
        skipped: result.skipped,
        missing: result.missing,
      },
    });
  },
);

// GET /v1/admin/events/:id/merge-candidates — the merge panel's pick list
// (admin 4b E4): the other live listings at this venue on this date,
// likeliest first. Read only; see lib/event-merge-preview.ts.
eventsAdminRouter.get(
  '/:id/merge-candidates',
  zValidator('param', eventIdSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const candidates = await loadMergeCandidates(id);
    if (candidates === null) {
      return ctx.json({ success: false, error: 'Not found' } as const, 404);
    }
    return ctx.json({ success: true, data: { candidates } } as const);
  },
);

// GET /v1/admin/events/:id/merge-preview?source=[&move=true] — the merge
// panel's compare step (admin 4b E4): keeping `:id` and merging `source` into
// it (POST /:source/merge { targetId: :id }), each listing's counts, the
// Watchers after (each person once), the kept price, and the blank fields the
// merge fills from `source` (and those it skips). 409 `not_mergeable` with
// the reason the POST would refuse it for (`same_id`, `past_mismatch`).
eventsAdminRouter.get(
  '/:id/merge-preview',
  zValidator('param', eventIdSchema, validationHook),
  zValidator('query', mergePreviewQuerySchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const { source, move } = ctx.req.valid('query');
    const result = await loadMergePreview({
      keptId: id,
      sourceId: source,
      today: todayInDenver(),
      move,
    });
    if (result.ok === 'not_found') {
      return ctx.json(
        {
          success: false,
          error:
            result.which === 'event'
              ? 'Event not found'
              : 'Source event not found',
        } as const,
        404,
      );
    }
    if (result.ok === 'not_mergeable') {
      return ctx.json(
        {
          success: false,
          error: 'not_mergeable',
          reason: result.reason,
        } as const,
        409,
      );
    }
    return ctx.json({ success: true, data: result.data } as const);
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
  /**
   * A confirmed relocation: the source is the old listing of a show that
   * moved. Skips the admin merge's rules (the blank-field fill and the past
   * rule; lib/event-merge.ts). The de-duplication merge leaves it off.
   */
  relocation: z.boolean().optional().default(false),
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
    const { targetId, notifyWatchers, suggestion, relocation } =
      ctx.req.valid('json');
    const actor = getAuthUser(ctx);

    if (sourceId === targetId) {
      return ctx.json(
        { success: false, error: 'Source and target must differ' },
        422,
      );
    }

    // Admin 4b E4: the admin's merge fills the kept row's blank fields from
    // the other row and refuses a past row with a non-past one (409
    // `not_mergeable`, reason `past_mismatch`). Venue and night are NOT
    // checked: A3 merges across venue or day, and a relocation is exactly
    // such a pair. Only `relocation: true` skips the rules, as the Needs-you
    // move answers do; `notifyWatchers` alone does not.
    const result = await mergeEvents({
      sourceId,
      targetId,
      actorId: actor.userId,
      notifyWatchers,
      suggestion,
      relocation,
    });
    if (result.ok === 'source_not_found') {
      return ctx.json({ success: false, error: 'Source event not found' }, 404);
    }
    if (result.ok === 'target_not_found') {
      return ctx.json({ success: false, error: 'Target event not found' }, 404);
    }
    if (result.ok === 'past_mismatch' || result.ok === 'time_taken') {
      return ctx.json(
        {
          success: false,
          error: 'not_mergeable',
          reason: result.ok,
        } as const,
        409,
      );
    }
    const { referencesMoved, filled, skipped } = result;

    return ctx.json({
      success: true,
      data: { mergedInto: targetId, referencesMoved, filled, skipped },
    });
  },
);
