// GET /v1/admin/crawl/batches and /batches/:key — the admin Crawl runs list
// (redesign 1d) — and /estimate, the Crawl all confirm's numbers. Batches are derived from crawl_runs and crawl_triggers by
// lib/crawl-batches.ts and never stored. Reading only: Crawl all is still
// POST /v1/admin/crawl.

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { asc, inArray, isNull } from 'drizzle-orm';
import { db, userProfiles, venues } from '@concert-crawl/db';
import {
  isNotOkBatch,
  type CrawlAllEstimate,
  type CrawlBatch,
  type CrawlBatchDetail,
  type CrawlBatchPage,
} from '@concert-crawl/types';
import { validationHook } from '../../lib/validator.js';
import { nextDailyCrawlAt } from '../../lib/crawl-schedule.js';
import type { AdminVariables } from './index.js';
import {
  ESTIMATE_NIGHTS,
  batchMatchesKey,
  batchSortAt,
  groupCrawlBatches,
  parseBatchKey,
  usualNightly,
} from './lib/crawl-batches.js';
import { hasRowsBefore, readWindow } from './lib/crawl-window.js';
import { crawlAllSkipReason } from './lib/crawl-all.js';
import { addDays, denverDate } from './lib/needs-you/keys.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const listQuerySchema = z.object({
  kind: z.enum(['all', 'nightly', 'by_hand', 'not_ok']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  // The previous page's nextBefore: only batches that sort strictly earlier.
  before: z.iso.datetime().optional(),
});

const keyParamSchema = z.object({ key: z.string().min(1).max(300) });

/** How many times a page widens its read window looking for enough batches. */
const MAX_WIDENINGS = 3;

const withoutRuns = (detail: CrawlBatchDetail): CrawlBatch => {
  const { runs: _runs, ...batch } = detail;
  return batch;
};

const matchesKind = (
  kind: z.infer<typeof listQuerySchema>['kind'],
  batch: CrawlBatch,
): boolean => {
  if (kind === 'nightly') return batch.kind === 'nightly';
  if (kind === 'by_hand') return batch.kind === 'by_hand';
  // The RESULT chip's rule, shared with the web: amber Done, Failed and
  // Didn't start, read by a retried night's final counts. A green Done with
  // a failed run is not Not OK.
  if (kind === 'not_ok') return isNotOkBatch(batch);
  return true;
};

/**
 * Fills each batch's actorHandle in one read for the whole page. Only the
 * handle is selected: user_profiles holds no email, and nothing here asks
 * Clerk for one.
 */
const withHandles = async <Batch extends CrawlBatch>(
  batches: Batch[],
): Promise<Batch[]> => {
  const actors = [...new Set(batches.flatMap((batch) => batch.actor ?? []))];
  if (actors.length === 0) return batches;
  const rows = await db
    .select({ userId: userProfiles.userId, handle: userProfiles.handle })
    .from(userProfiles)
    .where(inArray(userProfiles.userId, actors));
  const handles = new Map(rows.map((row) => [row.userId, row.handle]));
  return batches.map((batch) => ({
    ...batch,
    actorHandle:
      batch.actor === null ? null : (handles.get(batch.actor) ?? null),
  }));
};

export const crawlBatchesAdminRouter = new Hono<AdminVariables>();

// The newest batches: nightly runs by Mountain Time night, by-hand bursts, and
// any night that never started. `not_ok` keeps those the RESULT chip calls
// Not OK (isNotOkBatch): an amber Done, Failed, and the nights that did not
// start. Only matching batches fill a page or stop the widening. Paged by
// `before`; there is no
// total, since counting derived batches means grouping all of history.
crawlBatchesAdminRouter.get(
  '/batches',
  zValidator('query', listQuerySchema, validationHook),
  async (ctx) => {
    const { kind, limit, before } = ctx.req.valid('query');
    const now = new Date();
    const end =
      before === undefined ? now.getTime() + DAY_MS : Date.parse(before);
    // About a night a day, plus a margin at the edges. By-hand bursts in the
    // window share the limit with the nights; a filter that finds too few
    // widens the window (doubling) a few times before settling.
    let from = new Date(end - (limit + 3) * DAY_MS);
    const [first, firstOlder] = await Promise.all([
      readWindow(from, new Date(end + DAY_MS), { withErrors: false }),
      hasRowsBefore(from),
    ]);
    const { runs, triggers } = first;
    let older = firstOlder;
    for (let widening = 0; ; widening += 1) {
      // A batch in the window's oldest day may have begun before it and be
      // cut short, so it waits for the next page, which reads it whole.
      const floor = older ? from.getTime() + DAY_MS : Number.NEGATIVE_INFINITY;
      const matched = groupCrawlBatches({
        runs,
        triggers,
        now,
        // With history behind the window, its oldest nights can have had no
        // runs at all: derive Didn't start from the first whole night, which
        // covers every night sorting at or after the floor.
        didntStartFrom: older ? addDays(denverDate(from), 1) : undefined,
      }).filter((batch) => {
        const at = batchSortAt(batch);
        return at < end && at >= floor && matchesKind(kind, batch);
      });
      if (matched.length <= limit && older && widening < MAX_WIDENINGS) {
        // Twice as far back, reading only the slice not read yet.
        const wider = new Date(end - 2 * (end - from.getTime()));
        const [slice, sliceOlder] = await Promise.all([
          readWindow(wider, from, { withErrors: false }),
          hasRowsBefore(wider),
        ]);
        runs.push(...slice.runs);
        triggers.push(...slice.triggers);
        from = wider;
        older = sliceOlder;
        continue;
      }

      const page = matched.slice(0, limit);
      const last = page.at(-1);
      const full = matched.length > limit;
      // A full page continues after its last batch; a short one has every
      // batch above the floor, so the next page starts there.
      const nextAt = full && last !== undefined ? batchSortAt(last) : floor;
      const body: CrawlBatchPage = {
        data: await withHandles(page.map(withoutRuns)),
        hasMore: full || older,
        nextBefore:
          (full || older) && Number.isFinite(nextAt)
            ? new Date(nextAt).toISOString()
            : null,
      };
      return ctx.json({ success: true, ...body });
    }
  },
);

// What the Crawl all confirm says first (addendum-3 09/crawl-all-m): how many
// venues it takes, which it skips and why, and what recent nights took and
// cost. Counted by lib/crawl-all.ts, the rule POST /v1/admin/crawl queues by.
crawlBatchesAdminRouter.get('/estimate', async (ctx) => {
  const now = new Date();
  // Room for ESTIMATE_NIGHTS nights past a few retried or missed ones.
  const from = new Date(now.getTime() - 2 * ESTIMATE_NIGHTS * DAY_MS);
  const [venueRows, window] = await Promise.all([
    db
      .select({
        id: venues.id,
        name: venues.name,
        active: venues.active,
        verified: venues.verified,
        blockedAt: venues.blockedAt,
        crawlPausedAt: venues.crawlPausedAt,
      })
      .from(venues)
      .where(isNull(venues.removedAt))
      .orderBy(asc(venues.name)),
    readWindow(from, new Date(now.getTime() + DAY_MS)),
  ]);

  const skipped = venueRows.flatMap((venue) => {
    const reason = crawlAllSkipReason(venue);
    return reason === null
      ? []
      : [{ venueId: venue.id, name: venue.name, reason }];
  });
  const estimate: CrawlAllEstimate = {
    total: venueRows.length,
    eligible: venueRows.length - skipped.length,
    skipped,
    // The window starts mid-night, so its first date is partial.
    usual: usualNightly({
      ...window,
      now,
      firstNight: addDays(denverDate(from), 1),
    }),
    // The confirm's "Tonight's {time} crawl still runs." Only production
    // starts the daily crawl (startDailyCrawl's gate), so anywhere else there
    // is no nightly to name.
    nextCrawlAt: nextDailyCrawlAt(now),
  };
  return ctx.json({ success: true, data: estimate });
});

// One batch with its runs, by its key or its linkKey (`run:<epoch>:<tag>`
// names a by-hand batch without the Clerk id; a bare `run:<epoch>` still
// works and takes the first batch of that second).
crawlBatchesAdminRouter.get(
  '/batches/:key',
  zValidator('param', keyParamSchema, validationHook),
  async (ctx) => {
    const { key } = ctx.req.valid('param');
    const parsed = parseBatchKey(key);
    if (parsed === null) {
      return ctx.json({ success: false, error: 'Not a batch key' }, 400);
    }

    const now = new Date();
    // A night is a Mountain Time date, so read a margin either side of it; a
    // by-hand burst is read around its first trigger. A night with no runs
    // did not start when there is history before it, as the list derives it.
    const center =
      parsed.kind === 'nightly'
        ? new Date(`${parsed.night}T12:00:00Z`)
        : new Date(parsed.epoch * 1000);
    const from = new Date(center.getTime() - 2 * DAY_MS);
    const [{ runs, triggers }, older] = await Promise.all([
      readWindow(from, new Date(center.getTime() + 2 * DAY_MS)),
      parsed.kind === 'nightly' ? hasRowsBefore(from) : false,
    ]);

    const batch = groupCrawlBatches({
      runs,
      triggers,
      now,
      didntStartFrom:
        parsed.kind === 'nightly' && older ? parsed.night : undefined,
    }).find((candidate) => batchMatchesKey(candidate, key, parsed));
    if (batch === undefined) {
      return ctx.json({ success: false, error: 'Batch not found' }, 404);
    }
    const [withHandle] = await withHandles([batch]);
    return ctx.json({ success: true, data: withHandle ?? batch });
  },
);
