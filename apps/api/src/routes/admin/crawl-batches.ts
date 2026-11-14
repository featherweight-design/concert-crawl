// GET /v1/admin/crawl/batches and /batches/:key — the admin Crawl runs list
// (redesign 1d) — and /estimate, the Crawl all confirm's numbers. Batches are derived from crawl_runs and crawl_triggers by
// lib/crawl-batches.ts and never stored. Reading only: Crawl all is still
// POST /v1/admin/crawl.

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { asc, isNull } from 'drizzle-orm';
import { db, venues } from '@concert-crawl/db';
import type {
  CrawlAllEstimate,
  CrawlBatch,
  CrawlBatchDetail,
} from '@concert-crawl/types';
import { validationHook } from '../../lib/validator.js';
import { crawlerDispatchEnvironment } from '../../lib/crawler-dispatch.js';
import type { AdminVariables } from './index.js';
import {
  ESTIMATE_NIGHTS,
  groupCrawlBatches,
  parseBatchKey,
  usualNightly,
} from './lib/crawl-batches.js';
import { readWindow } from './lib/crawl-window.js';
import { crawlAllSkipReason } from './lib/crawl-all.js';
import { addDays, denverDate } from './lib/needs-you/keys.js';
import { nextCrawlAfter } from './lib/needs-you/all-clear-facts.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const listQuerySchema = z.object({
  kind: z.enum(['all', 'nightly', 'by_hand', 'not_ok']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const keyParamSchema = z.object({ key: z.string().min(1).max(300) });

const withoutRuns = (detail: CrawlBatchDetail): CrawlBatch => {
  const { runs: _runs, ...batch } = detail;
  return batch;
};

export const crawlBatchesAdminRouter = new Hono<AdminVariables>();

// The newest batches: nightly runs by Mountain Time night, by-hand bursts, and
// any night that never started. `not_ok` keeps those with a failed or skipped
// run, and the nights that did not start.
crawlBatchesAdminRouter.get(
  '/batches',
  zValidator('query', listQuerySchema, validationHook),
  async (ctx) => {
    const { kind, limit } = ctx.req.valid('query');
    const now = new Date();
    // About a night a day, plus a margin at the edges. By-hand bursts in the
    // window share the limit with the nights.
    const from = new Date(now.getTime() - (limit + 3) * DAY_MS);
    const { runs, triggers } = await readWindow(
      from,
      new Date(now.getTime() + DAY_MS),
    );

    const batches = groupCrawlBatches({ runs, triggers, now })
      .filter((batch) => {
        if (kind === 'nightly') return batch.kind === 'nightly';
        if (kind === 'by_hand') return batch.kind === 'by_hand';
        if (kind === 'not_ok')
          return batch.counts.notOk > 0 || batch.didntStart;
        return true;
      })
      .slice(0, limit)
      .map(withoutRuns);

    return ctx.json({ success: true, data: batches });
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
    nextCrawlAt:
      crawlerDispatchEnvironment() === 'production'
        ? nextCrawlAfter(now).toISOString()
        : null,
  };
  return ctx.json({ success: true, data: estimate });
});

// One batch with its runs.
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
    // by-hand burst is read around its first trigger. A night also reads back
    // 40 days, because "Didn't start" is only derived once an earlier night
    // with runs is in view.
    const center =
      parsed.kind === 'nightly'
        ? new Date(`${parsed.night}T12:00:00Z`)
        : new Date(parsed.epoch * 1000);
    const lookBackDays = parsed.kind === 'nightly' ? 40 : 2;
    const { runs, triggers } = await readWindow(
      new Date(center.getTime() - lookBackDays * DAY_MS),
      new Date(center.getTime() + 2 * DAY_MS),
    );

    const batch = groupCrawlBatches({ runs, triggers, now }).find(
      (candidate) => candidate.key === key,
    );
    if (batch === undefined) {
      return ctx.json({ success: false, error: 'Batch not found' }, 404);
    }
    return ctx.json({ success: true, data: batch });
  },
);
