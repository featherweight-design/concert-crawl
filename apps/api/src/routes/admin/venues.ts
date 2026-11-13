import { isAccountWideErrorClass } from '@concert-crawl/crawler-core/crawl-error-class';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { validationHook } from '../../lib/validator.js';
import { z } from 'zod';
import { httpUrl } from '../../lib/url-schema.js';
import { venueSlug } from '../../lib/venue-slug-schema.js';
import Anthropic from '@anthropic-ai/sdk';
import {
  db,
  venues,
  events,
  crawlRuns,
  priceSubmissions,
  userEvents,
  auditLog,
  notifications,
  venueFaultAcknowledgements,
} from '@concert-crawl/db';
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  ne,
  not,
  or,
  sql,
} from 'drizzle-orm';
import {
  dispatch,
  AegSchemaError,
  PlatformFetchDeadlineError,
  type PlatformSource,
} from '@concert-crawl/crawler-core/fetchers';
import {
  checkRobots,
  getCrawlDelayMs,
  resolveCrawlDelayMs,
} from '@concert-crawl/crawler-core/robots';
import {
  CRAWLER_USER_AGENT,
  MIN_CRAWL_DELAY_MS,
  VENUE_PLATFORMS,
  platformRequiresVenueId,
} from '@concert-crawl/types';
import type {
  CrawlRunReason,
  CrawlStatus,
  PlatformProbeResult,
  VenueLatestRun,
  VenueRobotsStatus,
} from '@concert-crawl/types';
import { adminNamesOf, nameOf } from './lib/admin-names.js';
import { getAuthUser } from '../../middleware/auth.js';
import { apiLogger } from '../../lib/logger.js';
import { detectTicketVendor } from '../../lib/detect-ticket-vendor.js';
import { runBackgroundTask } from '../../lib/background-tasks.js';
import type { AdminVariables } from './index.js';
import { venueGuideAdminRouter } from './venue-guide.js';
import { TRIAGE_CONDITIONS } from './lib/triage.js';
import { idSchema } from '../../lib/id-schema.js';
import {
  pauseBodySchema,
  pauseVenueCrawl,
  resolvePauseDetails,
} from './lib/venue-crawl-pause.js';
import { todayInDenver } from '../../lib/time.js';
import {
  HIDE_REASONS,
  deleteBlockers,
  upcomingShowCount,
  pastShowsAndWatchers,
  upcomingShowSplit,
  venueRemovedBody,
} from './lib/venue-hide.js';

const createVenueSchema = z.object({
  name: z.string().min(1).max(200),
  slug: venueSlug(),
  websiteUrl: httpUrl(),
  city: z.string().default('Denver'),
  active: z.boolean().default(true),
  // The crawl rules' 3 s floor, which the crawler enforces on every wait too.
  crawlDelayMs: z
    .number()
    .int()
    .min(MIN_CRAWL_DELAY_MS)
    .max(30000)
    .default(MIN_CRAWL_DELAY_MS),
  crawlWaitUntil: z
    .enum(['networkidle', 'load', 'domcontentloaded'])
    .default('networkidle'),
  crawlWaitForSelector: z
    .string()
    .max(200)
    .transform((val) => val.trim() || null)
    .nullable()
    .optional(),
  ticketVendor: z
    .enum([
      'axs',
      'ticketmaster',
      'seatgeek',
      'dice',
      'eventbrite',
      'venue_box_office',
      'unknown',
    ])
    .nullable()
    .optional(),
  address: z
    .string()
    .max(500)
    .nullable()
    .optional()
    .transform((val) => {
      if (val == null) return val;
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    }),
  capacity: z.number().int().positive().nullable().optional(),
  venueType: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .transform((val) => {
      if (val == null) return val;
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    }),
  about: z
    .string()
    .max(280)
    .nullable()
    .optional()
    .transform((val) => {
      if (val == null) return val;
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    }),
  neighborhood: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .transform((val) => {
      if (val == null) return val;
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    }),
});

// Zod 4 applies a default inside .partial(), so every field that carries a
// create-time default is redeclared here from its unwrapped (default-free)
// create schema. Otherwise a PATCH that only toggles `verified` would reset
// the venue's city, crawl delay and wait strategy to the create defaults.
export const updateVenueSchema = createVenueSchema
  .partial()
  .extend({
    city: createVenueSchema.shape.city.unwrap().optional(),
    crawlDelayMs: createVenueSchema.shape.crawlDelayMs.unwrap().optional(),
    crawlWaitUntil: createVenueSchema.shape.crawlWaitUntil.unwrap().optional(),
    active: z.boolean().optional(),
    // Why a venue is hidden (`active: false`), kept on the venue and in the
    // audit log. Optional so a caller that predates the reason still works; the
    // Hide dialog always sends one. Other needs a note.
    hideReason: z.enum(HIDE_REASONS).optional(),
    hideNote: z.string().trim().max(500).optional(),
    verified: z.boolean().optional(),
    verifiedBy: z.string().max(200).nullable().optional(),
    crawlMode: z.enum(['http', 'browser']).nullable().optional(),
    featured: z.boolean().optional(),
    priceUrl: httpUrl().nullable().optional(),
    extractionStrategy: z
      .enum(['structured_data', 'llm', 'manual'])
      .nullable()
      .optional(),
    debugCaptureHtml: z.boolean().optional(),
    // Per-platform fetcher dispatch (#623 / #721 / #665). platform values
    // are validated here (not a Postgres enum) so new adapters only touch
    // application code.
    platform: z.enum(VENUE_PLATFORMS).nullable().optional(),
    // Empty/whitespace strings normalize to null (clear intent), matching
    // the other nullable string fields in this schema.
    platformVenueId: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform((val) => (val === '' ? null : val)),
    // The Details Map pin (3b), entered by hand: there is no geocoder. Null
    // clears it.
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    // The address Ask the venue writes to. Trimmed; empty clears it to null.
    contactEmail: z
      .string()
      .trim()
      .max(254)
      .transform((val) => (val === '' ? null : val))
      .pipe(z.email().nullable())
      .nullable()
      .optional(),
    // API-backed venue crawling (#506). When apiProvider is set, the crawler
    // (per #505) bypasses the HTML → JSON-LD → LLM cascade. null = None.
    apiProvider: z.enum(['venuepilot']).nullable().optional(),
    // Trim + null-if-empty, matching the address / crawlWaitForSelector shape
    // (returns the trimmed value, unlike priceUrl which returns the original).
    apiAccountId: z
      .string()
      .max(200)
      .nullable()
      .optional()
      .transform((val) => {
        if (val == null) return val;
        const trimmed = val.trim();
        return trimmed === '' ? null : trimmed;
      }),
  })
  .refine(
    // When the payload sets an id-bearing platform, platformVenueId must ride
    // along in the SAME payload as a non-empty string. Requiring it in the
    // payload (rather than accepting a previously-saved value) keeps the
    // rule simple and the admin UI always sends both together.
    //
    // `detail-page` (#1295) is exempt: its fetcher keys off websiteUrl and
    // has no platform-side id, so demanding one would make it unselectable.
    (body) =>
      !platformRequiresVenueId(body.platform) ||
      (typeof body.platformVenueId === 'string' &&
        body.platformVenueId.length > 0),
    {
      message: 'platformVenueId is required when platform is set',
      path: ['platformVenueId'],
    },
  )
  .refine(
    // When apiProvider is set, apiAccountId must ride along in the SAME
    // payload as a non-empty value. The transform above has already collapsed
    // empty/whitespace strings to null, so a null here means "missing."
    (body) => body.apiProvider == null || body.apiAccountId != null,
    {
      message: 'API account ID is required when an API provider is selected',
      path: ['apiAccountId'],
    },
  );

// The PATCH fields that point or arm a venue's crawl. Changing any of them on a
// removed venue is refused (409 venue_removed); sending one unchanged is not.
const CRAWL_CONFIG_FIELDS = [
  'verified',
  'websiteUrl',
  'platform',
  'platformVenueId',
  'apiProvider',
  'apiAccountId',
  'crawlMode',
] as const;

/** The latest crawl run of a venue, as the list and the detail show it. */
const latestRunOf = (
  run:
    | {
        id: string;
        status: CrawlStatus;
        reason: CrawlRunReason | null;
        at: Date;
        eventsFound: number;
        eventsInserted: number;
        errorMessage: string | null;
      }
    | undefined,
): VenueLatestRun | null =>
  run === undefined
    ? null
    : {
        id: run.id,
        status: run.status,
        reason: run.reason,
        at: run.at.toISOString(),
        eventsFound: run.eventsFound,
        eventsInserted: run.eventsInserted,
        errorMessage: run.errorMessage,
      };

/**
 * The columns `latestRunOf` reads, shared by the list and the detail. A
 * function, not a constant, so importing this module never reads `crawlRuns`:
 * unit tests that mock `@concert-crawl/db` without it import the route tree.
 */
const latestRunColumns = () => ({
  id: crawlRuns.id,
  venueId: crawlRuns.venueId,
  status: crawlRuns.status,
  reason: crawlRuns.reason,
  at: crawlRuns.createdAt,
  eventsFound: crawlRuns.eventsFound,
  eventsInserted: crawlRuns.eventsInserted,
  errorMessage: sql<string | null>`left(${crawlRuns.errorMessage}, 300)`,
});

export const venuesAdminRouter = new Hono<AdminVariables>();

// #764 first-timer guide authoring — a distinct resource with its own publish
// gate, so it lives in its own file rather than growing this one further.
venuesAdminRouter.route('/:id/guide', venueGuideAdminRouter);

// GET /v1/admin/venues — list all venues with upcoming event counts
venuesAdminRouter.get('/', async (ctx) => {
  // A taken-down venue (removedAt) is gone from the list; showing it again is
  // not offered, so there is nothing for an admin to do with the row.
  const allVenues = await db
    .select()
    .from(venues)
    .where(isNull(venues.removedAt))
    .orderBy(venues.name);

  const today = todayInDenver();
  const eventCounts = await db
    .select({ venueId: events.venueId, total: count(events.id) })
    .from(events)
    .where(
      and(
        eq(events.status, 'upcoming'),
        gte(events.date, today),
        isNotNull(events.venueId),
      ),
    )
    .groupBy(events.venueId);

  const countByVenueId = new Map(
    eventCounts.map((row) => [row.venueId, row.total]),
  );

  // The venue's own columns say whether it is enabled, not whether crawling it
  // is actually producing anything. A venue that has been skipping for weeks
  // reads as Active with full health everywhere else, so the list carries the
  // real outcome of its most recent run.
  const latestRuns = await db
    .selectDistinctOn([crawlRuns.venueId], latestRunColumns())
    .from(crawlRuns)
    .orderBy(crawlRuns.venueId, desc(crawlRuns.createdAt));

  const latestByVenueId = new Map(latestRuns.map((run) => [run.venueId, run]));

  // "Paused by Hugh", "Hidden by a former admin": the handle of whoever paused
  // or hid it, one lookup for the whole list.
  const adminNames = await adminNamesOf(
    allVenues.flatMap((venue) => [venue.crawlPausedBy, venue.hiddenBy]),
  );

  const venuesWithCounts = allVenues.map((venue) => ({
    ...venue,
    eventCount: countByVenueId.get(venue.id) ?? 0,
    lastRunStatus: latestByVenueId.get(venue.id)?.status ?? null,
    // The latest run in full, for the list's one-line "Failed: calendar block
    // not found" / "OK · 3:04 AM · 2 new" column.
    latestRun: latestRunOf(latestByVenueId.get(venue.id)),
    crawlPausedByName: nameOf(adminNames, venue.crawlPausedBy),
    hiddenByName: nameOf(adminNames, venue.hiddenBy),
  }));

  return ctx.json({ success: true, data: venuesWithCounts });
});

// GET /v1/admin/venues/robots-check?url=<encoded> — advisory robots.txt check
venuesAdminRouter.get('/robots-check', async (ctx) => {
  const rawUrl = ctx.req.query('url');
  if (!rawUrl) {
    return ctx.json(
      { success: false, error: 'Missing required query param: url' },
      400,
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return ctx.json({ success: false, error: 'Invalid URL format' }, 400);
  }

  // The same evaluation the crawler runs, so the admin chip can never disagree
  // with what the nightly pass will actually do.
  const verdict = await checkRobots(parsedUrl.href, CRAWLER_USER_AGENT);
  if (verdict.status === 'unreachable') {
    return ctx.json({
      allowed: null,
      error: 'Could not fetch robots.txt',
    });
  }
  return ctx.json({
    allowed: verdict.status === 'allowed',
    checkedAt: new Date().toISOString(),
  });
});

// GET /v1/admin/venues/robots-audit — stored robots.txt status per active venue
venuesAdminRouter.get('/robots-audit', async (ctx) => {
  const rows = await db
    .select({
      id: venues.id,
      name: venues.name,
      slug: venues.slug,
      websiteUrl: venues.websiteUrl,
      robotsTxtAllowed: venues.robotsTxtAllowed,
      robotsTxtCheckedAt: venues.robotsTxtCheckedAt,
    })
    .from(venues)
    .where(eq(venues.active, true))
    .orderBy(venues.name);

  const data: VenueRobotsStatus[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    websiteUrl: row.websiteUrl,
    robotsTxtAllowed: row.robotsTxtAllowed,
    robotsTxtCheckedAt: row.robotsTxtCheckedAt?.toISOString() ?? null,
  }));

  return ctx.json({ success: true, data });
});

// GET /v1/admin/venues/:id — get single venue with crawl health stats
venuesAdminRouter.get('/:id', async (ctx) => {
  const { id } = ctx.req.param();
  const [venue] = await db.select().from(venues).where(eq(venues.id, id));

  if (!venue) {
    return ctx.json({ success: false, error: 'Venue not found' }, 404);
  }

  // Last 7 days sparkline
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // The independent reads run together. The 7-day runs also serve the average
  // duration and, when they hold them, Latest run and the last full run.
  const [recentRuns, [eventsCountResult], shows, pastAndWatchers, adminNames] =
    await Promise.all([
      db
        .select({ ...latestRunColumns(), durationMs: crawlRuns.durationMs })
        .from(crawlRuns)
        .where(
          and(
            eq(crawlRuns.venueId, id),
            gte(crawlRuns.createdAt, sevenDaysAgo),
          ),
        )
        .orderBy(desc(crawlRuns.createdAt)),
      db
        .select({ total: count(events.id) })
        .from(events)
        .where(eq(events.venueId, id)),
      // The Overview's Shows card (3b). `eventsTracked` counts past shows too.
      upcomingShowSplit(id),
      pastShowsAndWatchers(id),
      adminNamesOf([venue.crawlPausedBy, venue.hiddenBy]),
    ]);

  // Build sparkline: one entry per calendar day over the past 7 days.
  // 'skipped' is healthy alongside 'success' (page-hash dedup), so days
  // ending in either status render green.
  const dayMap = new Map<string, boolean>();
  for (const run of recentRuns) {
    const dayKey = run.at.toISOString().slice(0, 10);
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, run.status === 'success' || run.status === 'skipped');
    }
  }

  const sparkline: { date: string; success: boolean; hasRun: boolean }[] = [];
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const day = new Date();
    day.setDate(day.getDate() - dayOffset);
    const dayKey = day.toISOString().slice(0, 10);
    if (dayMap.has(dayKey)) {
      sparkline.push({
        date: dayKey,
        success: dayMap.get(dayKey)!,
        hasRun: true,
      });
    } else {
      sparkline.push({ date: dayKey, success: false, hasRun: false });
    }
  }

  const runDays = sparkline.filter((entry) => entry.hasRun).length;
  const successDays = sparkline.filter((entry) => entry.success).length;
  const sevenDayPercent =
    runDays > 0 ? Math.round((successDays / runDays) * 100) : 0;

  // AVG over the same rows: nulls skipped, and no runs (or no durations)
  // reads as null, as the SQL average did.
  const durations = recentRuns.flatMap((run) =>
    run.durationMs === null ? [] : [run.durationMs],
  );
  const avgDurationMs =
    durations.length > 0
      ? Math.round(
          durations.reduce((sum, ms) => sum + ms, 0) / durations.length,
        )
      : null;

  const eventsTracked = eventsCountResult?.total ?? 0;

  const lastCrawledAt = venue.lastCrawledAt?.toISOString() ?? null;

  const crawlHealth = {
    sevenDayPercent,
    sparkline,
    lastCrawledAt,
    avgDurationMs,
    eventsTracked,
    consecutiveFails: venue.consecutiveFailures,
  };

  // What a delete would destroy, for the ⋯ menu to say so before it is tried.
  // Its upcoming count is the Shows split's total, so the two always agree.
  const blockers = {
    ...pastAndWatchers,
    upcomingShows: shows.shown + shows.hidden,
  };

  // Latest run and the last full run (3b) come from the 7-day runs when they
  // hold them. Otherwise one query returns the latest success and the latest
  // other run (DISTINCT ON whether it succeeded), which serves both.
  let latestRun: Parameters<typeof latestRunOf>[0] = recentRuns[0];
  let lastFull: { at: Date; eventsFound: number } | undefined = recentRuns.find(
    (run) => run.status === 'success',
  );
  if (latestRun === undefined || lastFull === undefined) {
    const succeeded = sql`(${crawlRuns.status} = 'success')`;
    const older = await db
      .selectDistinctOn([succeeded], latestRunColumns())
      .from(crawlRuns)
      .where(eq(crawlRuns.venueId, id))
      .orderBy(succeeded, desc(crawlRuns.createdAt));
    lastFull ??= older.find((run) => run.status === 'success');
    latestRun ??= older.reduce<Parameters<typeof latestRunOf>[0]>(
      (latest, run) =>
        latest === undefined || run.at > latest.at ? run : latest,
      undefined,
    );
  }

  return ctx.json({
    success: true,
    data: {
      ...venue,
      crawlHealth,
      deleteBlockers: blockers,
      upcomingShows: shows.shown,
      hiddenUpcomingShows: shows.hidden,
      lastFullRun:
        lastFull === undefined
          ? null
          : {
              at: lastFull.at.toISOString(),
              eventsFound: lastFull.eventsFound,
            },
      latestRun: latestRunOf(latestRun),
      crawlPausedByName: nameOf(adminNames, venue.crawlPausedBy),
      hiddenByName: nameOf(adminNames, venue.hiddenBy),
    },
  });
});

// POST /v1/admin/venues — create venue with slug uniqueness check
venuesAdminRouter.post(
  '/',
  zValidator('json', createVenueSchema, validationHook),
  async (ctx) => {
    const body = ctx.req.valid('json');

    const [slugConflict] = await db
      .select({ id: venues.id })
      .from(venues)
      .where(eq(venues.slug, body.slug));

    if (slugConflict) {
      return ctx.json(
        { success: false, error: 'Slug already in use', field: 'slug' },
        409,
      );
    }

    const [venue] = await db
      .insert(venues)
      .values({
        ...body,
        ticketVendor: body.ticketVendor ?? null,
        verified: true,
      })
      .returning();

    if (!venue) {
      return ctx.json(
        { success: false, error: 'Venue created but no row was returned' },
        500,
      );
    }

    // Detect vendor in the background — does not block the response
    if (!body.ticketVendor) {
      runBackgroundTask(async () => {
        try {
          const detectedVendor = await detectTicketVendor(body.websiteUrl);
          await db
            .update(venues)
            .set({ ticketVendor: detectedVendor })
            .where(eq(venues.id, venue.id));
        } catch (err) {
          apiLogger.warn(
            { err },
            'detectTicketVendor background update failed',
          );
        }
      });
    }

    ctx.set('auditAction', 'venue.create');
    ctx.set('auditTargetId', venue.id);
    ctx.set('auditActorId', getAuthUser(ctx).userId);

    return ctx.json({ success: true, data: venue }, 201);
  },
);

// PATCH /v1/admin/venues/:id — update venue with slug uniqueness check
venuesAdminRouter.patch(
  '/:id',
  zValidator('json', updateVenueSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.param();
    const { hideReason, hideNote, ...body } = ctx.req.valid('json');

    const [existing] = await db.select().from(venues).where(eq(venues.id, id));
    if (!existing) {
      return ctx.json({ success: false, error: 'Venue not found' }, 404);
    }

    // A removed venue asked us to remove its data: Show never brings it back,
    // and nothing here re-points or re-arms its crawl. Its display fields
    // (name, address, about...) can still be edited, and a full-form save that
    // sends its crawl fields unchanged still goes through. Restoring a removed
    // venue needs a deliberate, separately approved path, not this one.
    const reconfiguresCrawl = CRAWL_CONFIG_FIELDS.some(
      (key) => body[key] !== undefined && body[key] !== existing[key],
    );
    const refusedIfRemoved = body.active === true || reconfiguresCrawl;
    if (refusedIfRemoved && existing.removedAt !== null) {
      return ctx.json(venueRemovedBody, 409);
    }

    if (
      body.active === false &&
      hideReason === 'other' &&
      (hideNote ?? '') === ''
    ) {
      return ctx.json(
        { success: false, error: 'Other needs a note', field: 'hideNote' },
        422,
      );
    }
    // Hiding an already-hidden venue keeps who hid it and why; showing it again
    // clears the explanation.
    const hidingNow = body.active === false && existing.active;
    // A venue hidden before reasons were stored can be given one by hiding it
    // again; one that already has a reason keeps its first hider and reason.
    const recordingReason =
      body.active === false &&
      !existing.active &&
      existing.hiddenReason === null &&
      hideReason !== undefined;
    const hiddenFields =
      hidingNow || recordingReason
        ? {
            hiddenAt: existing.hiddenAt ?? new Date(),
            hiddenBy: existing.hiddenBy ?? getAuthUser(ctx).userId,
            hiddenReason: hideReason ?? null,
            hiddenNote:
              hideNote === undefined || hideNote === '' ? null : hideNote,
          }
        : body.active === true
          ? {
              hiddenAt: null,
              hiddenBy: null,
              hiddenReason: null,
              hiddenNote: null,
            }
          : {};

    if (body.slug && body.slug !== existing.slug) {
      const [slugConflict] = await db
        .select({ id: venues.id })
        .from(venues)
        .where(and(eq(venues.slug, body.slug), ne(venues.id, id)));

      if (slugConflict) {
        return ctx.json(
          { success: false, error: 'Slug already in use', field: 'slug' },
          409,
        );
      }
    }

    const verificationFields =
      body.verified === true
        ? { verifiedAt: new Date() }
        : body.verified === false
          ? { verifiedBy: null, verifiedAt: null }
          : {};

    // Clear-on-id-less-platform (#721 wins over #665 here — the two issues
    // diverged on whether clearing platform should orphan platformVenueId):
    // when the payload sets platform to null OR to a platform that takes no
    // id (detail-page), force platformVenueId to null in the same update even
    // if the payload didn't mention it. A stale shard id would otherwise
    // silently re-activate if an id-taking platform is re-set later.
    const platformClearFields =
      body.platform !== undefined && !platformRequiresVenueId(body.platform)
        ? { platformVenueId: null }
        : {};

    // Same orphan-prevention as platform (#506): clearing apiProvider forces
    // apiAccountId to null in the same update, so a stale account id can't
    // silently re-activate if the provider is re-set later.
    const apiProviderClearFields =
      body.apiProvider === null ? { apiAccountId: null } : {};

    const nextPlatform =
      body.platform !== undefined ? body.platform : existing.platform;
    // An id-less platform is treated like a cleared one for this field: a
    // venue switched from AEG to `detail-page` must not keep its old AEG
    // shard id, which would silently re-activate if AEG were re-selected.
    const nextPlatformVenueId = !platformRequiresVenueId(nextPlatform)
      ? null
      : body.platformVenueId !== undefined
        ? body.platformVenueId
        : existing.platformVenueId;

    // The schema refine only sees the payload; this guards the merged
    // result against orphaned state (id without platform, or platform
    // losing its id via a partial PATCH). Only enforced when the payload
    // touches platform fields — unrelated PATCHes (verify, pause, rename)
    // must not start failing on venues with pre-existing orphaned state.
    const touchesPlatformFields =
      body.platform !== undefined || body.platformVenueId !== undefined;
    if (touchesPlatformFields) {
      // Sending an id alongside a platform that has none is a mistake worth
      // reporting rather than silently dropping — the admin believes they
      // configured something that would never be read.
      if (
        !platformRequiresVenueId(nextPlatform) &&
        body.platformVenueId != null
      ) {
        return ctx.json(
          {
            success: false,
            error:
              nextPlatform === null
                ? 'platformVenueId requires platform to be set'
                : `platformVenueId is not used by the ${nextPlatform} platform`,
            field: 'platformVenueId',
          },
          400,
        );
      }
      if (
        platformRequiresVenueId(nextPlatform) &&
        nextPlatformVenueId === null
      ) {
        return ctx.json(
          {
            success: false,
            error: 'platformVenueId is required when platform is set',
            field: 'platformVenueId',
          },
          400,
        );
      }
    }

    const nextApiProvider =
      body.apiProvider !== undefined ? body.apiProvider : existing.apiProvider;
    const nextApiAccountId =
      body.apiProvider === null
        ? null
        : body.apiAccountId !== undefined
          ? body.apiAccountId
          : existing.apiAccountId;

    // Same merged-state guard as platform (#506): the schema refine only sees
    // the payload, so a partial PATCH — e.g. { apiAccountId: '1105' } against a
    // venue with apiProvider = null, or { apiProvider: 'venuepilot' } against
    // one with no saved account id — could orphan the invariant. Only enforced
    // when the payload touches an API field so unrelated PATCHes never fail on
    // pre-existing orphaned rows.
    const touchesApiFields =
      body.apiProvider !== undefined || body.apiAccountId !== undefined;
    if (touchesApiFields) {
      if (nextApiProvider === null && nextApiAccountId !== null) {
        return ctx.json(
          {
            success: false,
            error: 'API account ID requires an API provider to be set',
            field: 'apiAccountId',
          },
          400,
        );
      }
      if (nextApiProvider !== null && nextApiAccountId === null) {
        return ctx.json(
          {
            success: false,
            error:
              'API account ID is required when an API provider is selected',
            field: 'apiAccountId',
          },
          400,
        );
      }
    }

    // Browser-mode timing-race guard (#1072). A venue that falls through to
    // the HTML → JSON-LD → LLM cascade in 'browser' mode extracts from
    // page.content(); without a crawlWaitForSelector there is nothing to gate
    // on before capture, so a slow client-side render is captured as an empty
    // DOM → 0 events (how Hi-Dive and Red Rocks went dark on unlucky runs).
    // A venue is exempt only when a platform / API fetcher can FULLY handle
    // it. We ask dispatch() directly on the merged venue state rather than
    // re-deriving the match: canHandle() requires more than a non-null id
    // (AEG needs platformVenueId.length > 0, VenuePilot apiAccountId.trim()
    // .length > 0), so an empty-string id falls through to the HTML cascade
    // and needs the selector — as does a whitespace-only VenuePilot
    // apiAccountId, which VenuePilot trims (AEG does not trim, so a
    // whitespace platformVenueId is still treated as configured). A venue
    // with the platform/provider set but no usable id is NOT handled. Only
    // checked when the payload touches the merged browser-gate state — the
    // crawl mode, the selector, OR a platform/API field. Clearing platform or
    // apiProvider on a fetcher-exempt browser venue removes the exemption and
    // drops it back into the HTML cascade, so those fields gate the guard too;
    // otherwise a PATCH { platform: null } would silently reintroduce the
    // timing race. Unrelated PATCHes (verify, pause, rename) leave every gate
    // field untouched, so the guard never fails on a pre-existing venue.
    const nextCrawlMode =
      body.crawlMode !== undefined ? body.crawlMode : existing.crawlMode;
    const nextWaitForSelector =
      body.crawlWaitForSelector !== undefined
        ? body.crawlWaitForSelector
        : existing.crawlWaitForSelector;
    const touchesBrowserGate =
      body.crawlMode !== undefined ||
      body.crawlWaitForSelector !== undefined ||
      body.platform !== undefined ||
      body.platformVenueId !== undefined ||
      body.apiProvider !== undefined ||
      body.apiAccountId !== undefined;
    const fetcherHandles =
      dispatch({
        ...existing,
        platform: nextPlatform,
        platformVenueId: nextPlatformVenueId,
        apiProvider: nextApiProvider,
        apiAccountId: nextApiAccountId,
      }) !== null;
    if (
      touchesBrowserGate &&
      nextCrawlMode === 'browser' &&
      !fetcherHandles &&
      nextWaitForSelector == null
    ) {
      return ctx.json(
        {
          success: false,
          error:
            'crawlWaitForSelector is required for browser-mode venues — without it a slow client-side render is captured as an empty page and returns 0 events',
          field: 'crawlWaitForSelector',
        },
        400,
      );
    }

    // The Map pin is a pair (3b): half a pin is no pin, and the map would read
    // it as a real place. Checked on the merged row, only when the payload
    // touches either half, so unrelated PATCHes never fail on an old row.
    const nextLat = body.lat !== undefined ? body.lat : existing.lat;
    const nextLng = body.lng !== undefined ? body.lng : existing.lng;
    if (
      (body.lat !== undefined || body.lng !== undefined) &&
      (nextLat === null) !== (nextLng === null)
    ) {
      return ctx.json(
        {
          success: false,
          error: 'lat and lng are set together, or cleared together',
          field: body.lat === undefined ? 'lat' : 'lng',
        },
        400,
      );
    }

    // Contact email is where Ask the venue writes, and the pin is what fans
    // are shown, so a change to either keeps its before and after in the audit.
    const contactBefore: Record<string, string | number | null> = {};
    const contactAfter: Record<string, string | number | null> = {};
    for (const field of ['lat', 'lng', 'contactEmail'] as const) {
      const next = body[field];
      if (next !== undefined && next !== existing[field]) {
        contactBefore[field] = existing[field];
        contactAfter[field] = next;
      }
    }
    const contactMeta =
      Object.keys(contactAfter).length > 0
        ? { contact: { before: contactBefore, after: contactAfter } }
        : {};

    // One transaction, the guarded venue write first: nothing else is written
    // unless it lands, so a refusal never leaves the flagship cleared.
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(venues)
        .set({
          ...body,
          ...platformClearFields,
          ...apiProviderClearFields,
          ...verificationFields,
          // removed_at is never cleared here: a removed venue is refused above,
          // and nothing in an ordinary edit undoes a removal.
          ...hiddenFields,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(venues.id, id),
            // A removal committed after the read above still wins.
            refusedIfRemoved ? isNull(venues.removedAt) : undefined,
          ),
        )
        .returning();
      if (!row) return undefined;
      // Only one flagship at a time.
      if (body.featured === true) {
        await tx
          .update(venues)
          .set({ featured: false })
          .where(and(eq(venues.featured, true), not(eq(venues.id, id))));
      }
      return row;
    });
    if (!updated) {
      // The venue changed under the read above: removed, or deleted.
      const [current] = await db
        .select({ removedAt: venues.removedAt })
        .from(venues)
        .where(eq(venues.id, id));
      return current !== undefined && current.removedAt !== null
        ? ctx.json(venueRemovedBody, 409)
        : ctx.json({ success: false, error: 'Venue not found' }, 404);
    }

    // Distinct audit action when platform routing changed, with a
    // before/after snapshot — this config redirects the crawler entirely,
    // so we want the change trail to be greppable.
    const platformChanged =
      nextPlatform !== existing.platform ||
      nextPlatformVenueId !== existing.platformVenueId;

    if (platformChanged) {
      ctx.set('auditAction', 'venue.platform_changed');
      ctx.set('auditMeta', {
        before: {
          platform: existing.platform,
          platformVenueId: existing.platformVenueId,
        },
        after: {
          platform: nextPlatform,
          platformVenueId: nextPlatformVenueId,
        },
        // The same request may hide or show the venue; the trail keeps both.
        ...(hidingNow
          ? { hide: { reason: hideReason ?? null, note: hideNote ?? null } }
          : {}),
        ...(body.active === true && !existing.active ? { show: true } : {}),
        ...contactMeta,
      });
    } else if (hidingNow) {
      ctx.set('auditAction', 'venue.hide');
      ctx.set('auditMeta', {
        reason: hideReason ?? null,
        note: hideNote ?? null,
        upcomingShows: await upcomingShowCount(id),
        ...contactMeta,
      });
    } else if (body.active === true && !existing.active) {
      ctx.set('auditAction', 'venue.show');
      if ('contact' in contactMeta) ctx.set('auditMeta', contactMeta);
    } else {
      ctx.set('auditAction', 'venue.update');
      if ('contact' in contactMeta) ctx.set('auditMeta', contactMeta);
    }
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', getAuthUser(ctx).userId);

    return ctx.json({ success: true, data: updated });
  },
);

// A hung platform CDN connection must not pin an API worker slot — the
// probe aborts and reports fetch_error after this window. It caps each
// request, and is the requests' share of the whole-probe budget below: even
// with `firstPageOnly` an adapter makes more than one request (Live Nation's
// sitemap and calendar page), so a per-request value alone would not bound
// the probe (#1184).
const PROBE_TIMEOUT_MS = 15_000;

// The most redirect hops one probe request may follow. It must equal
// crawler-core's MAX_REDIRECTS, the cap `fetchFollowingRobots` enforces; it
// is restated here because the API reads crawler-core's built output, and
// venues-platform.integration.test.ts pins the two together.
const MAX_PROBE_REDIRECT_HOPS = 20;

// Paced requests each adapter makes with `firstPageOnly`. Live Nation reads
// the sitemap and one month; detail-page reads the sitemap, the listing and
// one detail page; AEG and VenuePilot read one listing each.
const PROBE_PACED_REQUESTS: Record<PlatformSource, number> = {
  aeg: 1,
  venuepilot: 1,
  livenation: 2,
  'detail-page': 3,
};

// The adapters that follow redirects hop by hop, each hop after a pacing
// wait of its own. AEG and VenuePilot never follow one.
const PROBE_FOLLOWS_REDIRECTS: ReadonlySet<PlatformSource> = new Set([
  'livenation',
  'detail-page',
]);

/**
 * The probe's whole budget, sized from the delay because a pacing wait is
 * never cut short (it breaches instead), so a fixed 15 s would fail any venue
 * whose site asks for a long Crawl-delay:
 *
 *   wait      = max(delay, MIN_CRAWL_DELAY_MS) + 1000   (a full second of jitter)
 *   perPaced  = wait + (follows redirects ? wait × MAX_PROBE_REDIRECT_HOPS : 0)
 *   budget    = pacedRequests × perPaced + PROBE_TIMEOUT_MS
 *
 * Each paced request waits once before it goes out, and each redirect hop it
 * follows waits again before the hop is requested; those hop waits run inside
 * the request's budget too, so every hop the cap allows is paid for.
 * PROBE_TIMEOUT_MS on top is the requests' own network time.
 */
function probeBudgetMs(source: PlatformSource, crawlDelayMs: number): number {
  const waitMs = Math.max(crawlDelayMs, MIN_CRAWL_DELAY_MS) + 1_000;
  const pacedRequests = PROBE_PACED_REQUESTS[source];
  const hopWaitsMs = PROBE_FOLLOWS_REDIRECTS.has(source)
    ? waitMs * MAX_PROBE_REDIRECT_HOPS
    : 0;
  return pacedRequests * (waitMs + hopWaitsMs) + PROBE_TIMEOUT_MS;
}

const probePlatformSchema = z.object({
  platform: z.enum(VENUE_PLATFORMS).nullable().optional(),
  // Whitespace-only would pass the fetcher's truthy canHandle() check and
  // turn a missing_config diagnosis into a doomed fetch — normalize to null.
  platformVenueId: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((val) => (val === '' ? null : val)),
});

// POST /v1/admin/venues/:id/probe-platform — dry-run a platform fetch (#665)
// Probes the proposed platform config from the body when provided, else the
// venue's saved config. Nothing is written: no crawl_runs row, no events —
// the admin gets a { ok, ... } diagnosis envelope with HTTP 200 either way.
venuesAdminRouter.post(
  '/:id/probe-platform',
  zValidator('json', probePlatformSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.param();
    const body = ctx.req.valid('json');

    const [venue] = await db.select().from(venues).where(eq(venues.id, id));
    if (!venue) {
      return ctx.json({ success: false, error: 'Venue not found' }, 404);
    }
    // A probe fetches the venue's source like a crawl does, so a removed
    // venue's source is never fetched, paused or not.
    if (venue.removedAt !== null) {
      return ctx.json(venueRemovedBody, 409);
    }
    if (venue.crawlPausedAt !== null) {
      return ctx.json(
        { success: false, error: 'Crawling is paused for this venue' },
        409,
      );
    }

    // Overlay proposed config (when present in the payload) on the saved
    // venue row. `undefined` means "not proposed — use saved"; `null` means
    // "proposed as cleared".
    const probedPlatform =
      body.platform !== undefined ? body.platform : venue.platform;
    // Mirror the PATCH route's clear semantics: a platform that takes no
    // venue ID clears it too, so the probe (and its audit metadata) never
    // describes an orphaned { platform, platformVenueId } state.
    const probedPlatformVenueId = !platformRequiresVenueId(probedPlatform)
      ? null
      : body.platformVenueId !== undefined
        ? body.platformVenueId
        : venue.platformVenueId;
    const candidate = {
      ...venue,
      platform: probedPlatform,
      platformVenueId: probedPlatformVenueId,
    };

    const probeResult = await (async (): Promise<PlatformProbeResult> => {
      const fetcher = dispatch(candidate);
      if (!fetcher) {
        return {
          ok: false,
          reason: 'missing_config',
          error:
            'No platform fetcher matches this config — platform is unset or unregistered, or platformVenueId is missing',
        };
      }
      const startedAt = Date.now();
      try {
        // Paced exactly as the crawl paces this venue: its stored delay, or
        // the site's robots.txt Crawl-delay when that is longer, never under
        // the 3 s floor. AEG and VenuePilot then apply their own hosts'
        // Crawl-delay on top, as they do in a crawl.
        const crawlDelayMs = resolveCrawlDelayMs(
          candidate.crawlDelayMs,
          await getCrawlDelayMs(candidate.websiteUrl, CRAWLER_USER_AGENT),
          { venueId: id, url: candidate.websiteUrl },
        );
        if (crawlDelayMs === null) {
          return {
            ok: false,
            reason: 'fetch_error',
            error: `Not probed: ${candidate.websiteUrl} asks in robots.txt for a Crawl-delay above the crawler's cap, so the crawl skips this venue too`,
          };
        }
        // Stopped after the first listing response (see `firstPageOnly`):
        // the probe proves the platform answers, never walks the calendar.
        const result = await fetcher.fetch(candidate, {
          crawlDelayMs,
          perRequestTimeoutMs: PROBE_TIMEOUT_MS,
          overallTimeoutMs: probeBudgetMs(fetcher.source, crawlDelayMs),
          // The budget is sized from crawlDelayMs, so an adapter whose host
          // asks for a longer Crawl-delay widens it rather than breaching.
          budgetFollowsCrawlDelay: true,
          firstPageOnly: true,
        });
        return {
          ok: true,
          eventsFound: result.events.length,
          fetchLatencyMs: Date.now() - startedAt,
          sourceUrl: result.sourceUrl,
        };
      } catch (err) {
        apiLogger.warn(
          { err, venueId: id, platform: probedPlatform },
          'probe-platform: platform fetch failed',
        );
        const message = err instanceof Error ? err.message : String(err);
        if (err instanceof AegSchemaError) {
          return { ok: false, reason: 'schema_error', error: message };
        }
        // Stays fetch_error rather than earning its own reason: the admin's
        // next step is the same either way, and the message already names
        // the budget and the request that overran it.
        if (err instanceof PlatformFetchDeadlineError) {
          return {
            ok: false,
            reason: 'fetch_error',
            error: `${message} — the platform responded too slowly to finish a probe`,
          };
        }
        return { ok: false, reason: 'fetch_error', error: message };
      }
    })();

    ctx.set('auditAction', 'venue.platform_probe');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', getAuthUser(ctx).userId);
    ctx.set('auditMeta', {
      platform: probedPlatform,
      platformVenueId: probedPlatformVenueId,
      outcome: probeResult.ok ? 'ok' : probeResult.reason,
    });

    return ctx.json({ success: true, data: probeResult });
  },
);

// POST /v1/admin/venues/:id/generate-about — LLM-generate capacity, venueType, neighborhood, and about copy
// Does NOT persist to DB; returns suggestions for admin review before saving
venuesAdminRouter.post('/:id/generate-about', async (ctx) => {
  const { id } = ctx.req.param();

  const [venue] = await db
    .select({
      name: venues.name,
      address: venues.address,
      venueType: venues.venueType,
    })
    .from(venues)
    .where(eq(venues.id, id));

  if (!venue) {
    return ctx.json({ success: false, error: 'Venue not found' }, 404);
  }

  const generateResponseSchema = z.object({
    capacity: z.number().int().positive().nullable(),
    venueType: z.string().min(1).max(100),
    neighborhood: z.string().min(1).max(100),
    about: z.string().min(10).max(280),
  });

  const prompt = `You are writing copy for Concert Crawl — a Denver live music calendar for people who actually go to shows, not tourists reading a brochure. Voice: direct, local, slightly irreverent. Short sentences. No fluff.

Venue: ${venue.name}
Address: ${venue.address ?? 'unknown'}
Current type: ${venue.venueType ?? 'unknown'}

Generate a JSON object with:
- "capacity": the venue's approximate standing/seated capacity as an integer (null if unknown)
- "venueType": a concise venue type (e.g. "Amphitheater", "Theater", "Concert Hall", "Music Hall", "Ballroom", "Bar", "Auditorium", "Outdoor Pavilion")
- "neighborhood": the Denver neighborhood or city where the venue is located (e.g. "Capitol Hill", "RiNo", "LoDo", "South Broadway", "Morrison"). Use well-known local neighborhood names, not zip codes or suburbs.
- "about": 1-2 punchy sentences — what the room is like, why it matters to Denver music fans. Be specific. No clichés. Max 280 characters.

Respond with only valid JSON, no markdown, no extra text.`;

  try {
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create(
      {
        model: 'claude-haiku-4-5',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: AbortSignal.timeout(30_000) },
    );

    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return ctx.json(
        { success: false, error: 'No text response from model' },
        503,
      );
    }

    const rawText = textBlock.text
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return ctx.json(
        { success: false, error: 'Model returned invalid JSON' },
        503,
      );
    }

    const result = generateResponseSchema.safeParse(parsed);
    if (!result.success) {
      return ctx.json(
        {
          success: false,
          error: 'Model response did not match expected shape',
        },
        503,
      );
    }

    return ctx.json({ success: true, data: result.data });
  } catch (err) {
    apiLogger.error({ err }, 'generate-about: Anthropic call failed');
    return ctx.json(
      { success: false, error: 'Failed to generate venue description' },
      503,
    );
  }
});

// DELETE /v1/admin/venues/:id — hard delete; nulls venue_id on events, cascades crawl_runs
venuesAdminRouter.delete('/:id', async (ctx) => {
  const { id } = ctx.req.param();

  const [existing] = await db.select().from(venues).where(eq(venues.id, id));
  if (!existing) {
    return ctx.json({ success: false, error: 'Venue not found' }, 404);
  }

  // A venue with shows or Watchers is hidden, never deleted: the delete would
  // detach its shows and drop its crawl history. The counts are read under the
  // venue's row lock, in the delete's own transaction.
  const outcome = await db.transaction(async (tx) => {
    await tx
      .select({ id: venues.id })
      .from(venues)
      .where(eq(venues.id, id))
      .for('update');
    const blockers = await deleteBlockers(id, tx);
    if (
      blockers.pastShows > 0 ||
      blockers.upcomingShows > 0 ||
      blockers.watchers > 0
    ) {
      return { blocked: blockers };
    }

    // Null out venue_id on any event that slipped in since the count, so it
    // stays published rather than being lost with the venue.
    const detached = await tx
      .update(events)
      .set({ venueId: null })
      .where(eq(events.venueId, id))
      .returning({ id: events.id });

    // Hard delete venue; crawl_runs cascade-delete automatically
    await tx.delete(venues).where(eq(venues.id, id));

    return { eventsDetached: detached.length };
  });
  if ('blocked' in outcome) {
    return ctx.json(
      {
        success: false,
        error: 'This venue has shows or Watchers, so it can only be hidden',
        code: 'has_history',
        ...outcome.blocked,
      },
      409,
    );
  }
  const { eventsDetached } = outcome;

  ctx.set('auditAction', 'venue.delete');
  ctx.set('auditTargetId', id);
  ctx.set('auditActorId', getAuthUser(ctx).userId);
  ctx.set('auditMeta', { snapshot: existing, eventsDetached });

  return ctx.json({ success: true, data: { eventsDetached } });
});

// ---------------------------------------------------------------------------
// Fault acknowledgements
// ---------------------------------------------------------------------------
//
// An acknowledgement records the evidence figure an operator judged expected —
// Summit's permanent Live Nation cap of 36, Red Rocks' November season end. The
// triage endpoint suppresses the fault while the current figure still matches
// and re-fires it the moment it moves. See
// docs/superpowers/specs/2026-08-14-triage-fault-acknowledgement-eng-spec.md.
//
// The param is `:id` rather than `:venueId` because Hono's RegExpRouter rejects
// two param names at the same path position, and every other route in this file
// uses `:id`.

// A shape that parses but is impossible — '2026-13-40', status 999 — stores
// just as silently as a malformed one, so the day and the range are checked
// rather than only the digit layout.
const isCalendarDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

const isHttpStatus = (value: string): boolean =>
  /^\d{3}$/.test(value) && Number(value) >= 100 && Number(value) <= 599;

// `failed` pins an error class, which is free-form, so it has no check.
const evidenceValueFormat = (
  condition: (typeof TRIAGE_CONDITIONS)[number],
  evidenceKind: 'pinned_count' | 'horizon_shrank' | null,
): { isValid: (value: string) => boolean; describe: string } | null => {
  const count = {
    isValid: (value: string) => /^\d+$/.test(value),
    describe: 'a count',
  };
  switch (condition) {
    case 'ceiling':
      return evidenceKind === 'horizon_shrank'
        ? { isValid: isCalendarDate, describe: 'a YYYY-MM-DD date' }
        : count;
    case 'wentDark':
    case 'coverage':
      return count;
    case 'blocked':
      return { isValid: isHttpStatus, describe: 'an HTTP status' };
    case 'failed':
      // Free-form, except that an account-wide class is always keyed with its
      // outage's start (faultAcknowledgementKey): a bare `llm_quota` would be
      // stored and never match anything.
      return {
        isValid: (value: string) =>
          !isAccountWideErrorClass(value) &&
          (!/^llm_/.test(value) ||
            /^llm_(quota|rate_limit)@\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(value)),
        describe:
          'an error class, or an account-wide class with its outage start',
      };
  }
};

const faultAcknowledgementSchema = z
  .object({
    condition: z.enum(TRIAGE_CONDITIONS),
    // Only `ceiling` carries a kind; every other condition has one evidence
    // shape. Nullable rather than optional so the absence is always deliberate.
    evidenceKind: z.enum(['pinned_count', 'horizon_shrank']).nullable(),
    // Nullable, NOT optional: a venue blocked without a recorded HTTP status has
    // no figure to acknowledge, but an omitted key is a client bug and a 400.
    // Trimmed like `reason` because matching is strict string equality, so a
    // stray space would store fine and then never suppress anything.
    evidenceValue: z
      .string()
      .transform((value) => value.trim())
      .pipe(z.string().min(1).max(200))
      .nullable(),
    reason: z
      .string()
      .transform((value) => value.trim())
      .pipe(z.string().min(1).max(500)),
  })
  // A shape `faultAcknowledgementKey` can never produce would store fine and
  // then suppress nothing, which reads to an operator as the acknowledgement
  // having silently failed. Reject it at the boundary instead.
  .superRefine((value, ctx) => {
    const needsKind = value.condition === 'ceiling';
    if (needsKind !== (value.evidenceKind !== null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['evidenceKind'],
        message: needsKind
          ? 'A ceiling acknowledgement must name its evidence kind'
          : `Only a ceiling acknowledgement carries an evidence kind, not ${value.condition}`,
      });
    }
    if (value.evidenceValue === null) {
      if (value.condition !== 'blocked') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['evidenceValue'],
          message: `A ${value.condition} acknowledgement always has a figure to pin`,
        });
      }
      return;
    }

    const expected = evidenceValueFormat(value.condition, value.evidenceKind);
    if (expected && !expected.isValid(value.evidenceValue)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['evidenceValue'],
        message: `A ${value.condition} acknowledgement pins ${expected.describe}`,
      });
    }
  });

const crawlPauseParamSchema = z.object({
  id: idSchema,
});

// POST /v1/admin/venues/:id/crawl-pause — stop every crawl of a venue while
// its shows stay published. Idempotent: pausing a paused venue keeps the
// original timestamp.
venuesAdminRouter.post(
  '/:id/crawl-pause',
  zValidator('param', crawlPauseParamSchema, validationHook),
  zValidator('json', pauseBodySchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const body = ctx.req.valid('json');
    const resolved = resolvePauseDetails(body, new Date());
    if (!resolved.ok) {
      return ctx.json({ success: false, error: resolved.error }, 422);
    }

    const result = await pauseVenueCrawl(
      id,
      resolved.details,
      getAuthUser(ctx).userId,
    );
    if (!result) {
      return ctx.json({ success: false, error: 'Venue not found' }, 404);
    }
    const { existing, venue } = result;

    ctx.set('auditAction', 'venue.crawl_pause');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', getAuthUser(ctx).userId);
    ctx.set('auditMeta', {
      reason: resolved.details.reason,
      note: resolved.details.note,
      resumeOn: resolved.details.resumeOn,
      alreadyPaused: existing.crawlPausedAt !== null,
    });

    return ctx.json({ success: true, data: venue });
  },
);

// DELETE /v1/admin/venues/:id/crawl-pause — resume crawling. The next daily
// run picks the venue up again.
venuesAdminRouter.delete(
  '/:id/crawl-pause',
  zValidator('param', crawlPauseParamSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');

    // Locked like the pause, so the audit names the pause this call removed
    // and not one an overlapping request has already replaced.
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          crawlPausedAt: venues.crawlPausedAt,
          removedAt: venues.removedAt,
        })
        .from(venues)
        .where(eq(venues.id, id))
        .for('update');
      if (!existing) return null;
      // A removed venue's crawl stays stopped; restoring one needs a
      // deliberate, separately approved path, not Resume.
      if (existing.removedAt !== null) return { removed: true } as const;
      const [updated] = await tx
        .update(venues)
        .set({
          crawlPausedAt: null,
          crawlPausedBy: null,
          crawlPauseReason: null,
          crawlPauseNote: null,
          crawlResumeOn: null,
        })
        .where(eq(venues.id, id))
        .returning();
      return { existing, venue: updated };
    });
    if (!result) {
      return ctx.json({ success: false, error: 'Venue not found' }, 404);
    }
    if ('removed' in result) {
      return ctx.json(venueRemovedBody, 409);
    }
    const { existing, venue } = result;

    ctx.set('auditAction', 'venue.crawl_resume');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', getAuthUser(ctx).userId);
    ctx.set('auditMeta', {
      pausedSince: existing.crawlPausedAt?.toISOString() ?? null,
    });

    return ctx.json({ success: true, data: venue });
  },
);

// Notifications that carry or concern a venue's prices, removed with them.
const PRICE_NOTIFICATION_CATEGORIES = [
  'watch.pricedrop',
  'contest.resolved',
  'contest.needs_info',
];

const removeVenueSchema = z.object({
  // Why the venue is removed, kept in the audit log: "venue asked us to stop".
  // Required so a removal is never unexplained.
  reason: z.string().trim().min(1).max(500),
});

// POST /v1/admin/venues/:id/remove — honour a venue's removal request, the
// one /bot promises within 30 days. Takes the venue's shows off the site
// (active = false, which every public query joins on), stops every crawl
// (crawl_paused_at, which also stops the price pipeline), and deletes every
// price we hold for its shows: the crawled price on each event and every
// user-submitted price. The event rows stay, so users' Watching and Concerts
// entries survive, minus the price snapshot each one captured. removed_at
// also takes the venue's past shows off artist pages and search, which
// deactivation alone keeps (#1299). There is no way back: Show, Resume and
// crawl triggers all refuse a removed venue (409 venue_removed), and restoring
// one needs a deliberate, separately approved path. The deleted prices are gone
// for good either way.
venuesAdminRouter.post(
  '/:id/remove',
  zValidator('param', crawlPauseParamSchema, validationHook),
  zValidator('json', removeVenueSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const { reason } = ctx.req.valid('json');
    const actorId = getAuthUser(ctx).userId;

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          active: venues.active,
          crawlPausedAt: venues.crawlPausedAt,
        })
        .from(venues)
        .where(eq(venues.id, id))
        .for('update');
      if (!existing) return null;

      const [venue] = await tx
        .update(venues)
        .set({
          active: false,
          crawlPausedAt: existing.crawlPausedAt ?? new Date(),
          // A removed venue never resumes by itself, whatever date an earlier
          // pause set.
          crawlResumeOn: null,
          removedAt: new Date(),
        })
        .where(eq(venues.id, id))
        .returning();

      const venueEventIds = tx
        .select({ id: events.id })
        .from(events)
        .where(eq(events.venueId, id));

      // One statement, so a price check and the submission it challenges go
      // together and the self-reference never blocks the delete.
      const deletedSubmissions = await tx
        .delete(priceSubmissions)
        .where(inArray(priceSubmissions.eventId, venueEventIds))
        .returning({ id: priceSubmissions.id });

      const clearedEvents = await tx
        .update(events)
        .set({ ticketPriceMin: null, ticketPriceMax: null, priceSource: null })
        .where(
          and(
            eq(events.venueId, id),
            or(
              isNotNull(events.ticketPriceMin),
              isNotNull(events.ticketPriceMax),
              isNotNull(events.priceSource),
            ),
          ),
        )
        .returning({ id: events.id });

      // The price a user's Watching entry captured when they saved the show
      // is a copy of the venue's price, so it goes too. The entry stays.
      const clearedSavedPrices = await tx
        .update(userEvents)
        .set({ savedPrice: null })
        .where(
          and(
            inArray(userEvents.eventId, venueEventIds),
            isNotNull(userEvents.savedPrice),
          ),
        )
        .returning({ id: userEvents.id });

      // Price-drop alerts quote the old and new price, and price-check
      // notices are about a deleted submission. Both point at the show.
      const deletedNotifications = await tx
        .delete(notifications)
        .where(
          and(
            inArray(notifications.category, PRICE_NOTIFICATION_CATEGORIES),
            inArray(
              notifications.actionUrl,
              tx
                .select({ url: sql<string>`'/events/' || ${events.id}` })
                .from(events)
                .where(eq(events.venueId, id)),
            ),
          ),
        )
        .returning({ id: notifications.id });

      const counts = {
        notificationsDeleted: deletedNotifications.length,
        submissionsDeleted: deletedSubmissions.length,
        eventPricesCleared: clearedEvents.length,
        savedPricesCleared: clearedSavedPrices.length,
      };

      // Written in the transaction, not by the audit middleware, which runs
      // after commit and swallows its own failures: a deletion this
      // irreversible must not succeed without its record.
      await tx.insert(auditLog).values({
        actorId,
        action: 'venue.remove',
        targetId: id,
        metadata: {
          reason,
          wasActive: existing.active,
          wasCrawlPaused: existing.crawlPausedAt !== null,
          ...counts,
        },
      });

      return { venue, ...counts };
    });
    if (!result) {
      return ctx.json({ success: false, error: 'Venue not found' }, 404);
    }
    return ctx.json({ success: true, data: result });
  },
);

const faultAcknowledgementParamSchema = z.object({
  id: idSchema,
});

const faultAcknowledgementDeleteParamSchema = z.object({
  id: idSchema,
  condition: z.enum(TRIAGE_CONDITIONS),
});

venuesAdminRouter.post(
  '/:id/fault-acknowledgements',
  zValidator('param', faultAcknowledgementParamSchema, validationHook),
  zValidator('json', faultAcknowledgementSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const body = ctx.req.valid('json');

    const [venue] = await db.select().from(venues).where(eq(venues.id, id));
    if (!venue) {
      return ctx.json({ success: false, error: 'Venue not found' }, 404);
    }

    const acknowledgedBy = getAuthUser(ctx).userId;

    // Upsert on the unique key: re-acknowledging at a new figure replaces the
    // old one rather than conflicting, which is what "Summit moved 36 → 41 and
    // that is still expected" has to mean.
    const [acknowledgement] = await db
      .insert(venueFaultAcknowledgements)
      .values({
        venueId: id,
        condition: body.condition,
        evidenceKind: body.evidenceKind,
        evidenceValue: body.evidenceValue,
        reason: body.reason,
        acknowledgedBy,
      })
      .onConflictDoUpdate({
        target: [
          venueFaultAcknowledgements.venueId,
          venueFaultAcknowledgements.condition,
        ],
        set: {
          evidenceKind: body.evidenceKind,
          evidenceValue: body.evidenceValue,
          reason: body.reason,
          acknowledgedBy,
          acknowledgedAt: new Date(),
        },
      })
      .returning();

    ctx.set('auditAction', 'venue.fault.acknowledge');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', acknowledgedBy);
    ctx.set('auditMeta', {
      condition: body.condition,
      evidenceKind: body.evidenceKind,
      evidenceValue: body.evidenceValue,
      reason: body.reason,
    });

    return ctx.json({ success: true, data: acknowledgement });
  },
);

venuesAdminRouter.delete(
  '/:id/fault-acknowledgements/:condition',
  zValidator('param', faultAcknowledgementDeleteParamSchema, validationHook),
  async (ctx) => {
    const { id, condition } = ctx.req.valid('param');

    const [removed] = await db
      .delete(venueFaultAcknowledgements)
      .where(
        and(
          eq(venueFaultAcknowledgements.venueId, id),
          eq(venueFaultAcknowledgements.condition, condition),
        ),
      )
      .returning();

    if (!removed) {
      return ctx.json(
        { success: false, error: 'Acknowledgement not found' },
        404,
      );
    }

    ctx.set('auditAction', 'venue.fault.unacknowledge');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', getAuthUser(ctx).userId);
    ctx.set('auditMeta', {
      condition,
      evidenceKind: removed.evidenceKind,
      evidenceValue: removed.evidenceValue,
      reason: removed.reason,
    });

    return ctx.json({ success: true, data: { condition } });
  },
);
