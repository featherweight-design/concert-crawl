// GET /v1/admin/crawl/batches and /batches/:key — the admin Crawl runs list
// (redesign 1d). Batches are derived from crawl_runs and crawl_triggers by
// lib/crawl-batches.ts and never stored. Reading only: Crawl all is still
// POST /v1/admin/crawl.

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, desc, gte, lt } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { crawlRuns, crawlTriggers, db, venues } from '@concert-crawl/db';
import type { CrawlBatch, CrawlBatchDetail } from '@concert-crawl/types';
import { validationHook } from '../../lib/validator.js';
import type { AdminVariables } from './index.js';
import {
  groupCrawlBatches,
  parseBatchKey,
  type BatchRunInput,
  type BatchTriggerInput,
} from './lib/crawl-batches.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// A run row's error text is the whole message the crawl threw; the list only
// needs the start of it.
const MAX_ERROR_CHARS = 500;

const listQuerySchema = z.object({
  kind: z.enum(['all', 'nightly', 'by_hand', 'not_ok']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const keyParamSchema = z.object({ key: z.string().min(1).max(300) });

const readWindow = async (
  from: Date,
  to: Date,
): Promise<{ runs: BatchRunInput[]; triggers: BatchTriggerInput[] }> => {
  const [runRows, triggerRows] = await Promise.all([
    db
      .select({
        id: crawlRuns.id,
        venueId: crawlRuns.venueId,
        venueName: venues.name,
        status: crawlRuns.status,
        reason: crawlRuns.reason,
        eventsFound: crawlRuns.eventsFound,
        eventsInserted: crawlRuns.eventsInserted,
        durationMs: crawlRuns.durationMs,
        errorMessage: crawlRuns.errorMessage,
        createdAt: crawlRuns.createdAt,
      })
      .from(crawlRuns)
      .leftJoin(venues, eq(venues.id, crawlRuns.venueId))
      .where(and(gte(crawlRuns.createdAt, from), lt(crawlRuns.createdAt, to)))
      .orderBy(desc(crawlRuns.createdAt)),
    db
      .select({
        id: crawlTriggers.id,
        venueId: crawlTriggers.venueId,
        triggeredBy: crawlTriggers.triggeredBy,
        status: crawlTriggers.status,
        crawlRunId: crawlTriggers.crawlRunId,
        createdAt: crawlTriggers.createdAt,
      })
      .from(crawlTriggers)
      .where(
        and(
          gte(crawlTriggers.createdAt, from),
          lt(crawlTriggers.createdAt, to),
        ),
      ),
  ]);
  return {
    runs: runRows.map((row) => ({
      ...row,
      errorMessage: row.errorMessage?.slice(0, MAX_ERROR_CHARS) ?? null,
    })),
    triggers: triggerRows,
  };
};

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
    // A night a day, plus a margin for by-hand bursts and the edges.
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
    // by-hand burst is read around its first trigger.
    const center =
      parsed.kind === 'nightly'
        ? new Date(`${parsed.night}T12:00:00Z`)
        : new Date(parsed.epoch * 1000);
    const { runs, triggers } = await readWindow(
      new Date(center.getTime() - 2 * DAY_MS),
      new Date(center.getTime() + 2 * DAY_MS),
    );

    const batch = groupCrawlBatches({ runs, triggers, now }).find(
      (candidate) => candidate.key === key,
    );
    if (batch === undefined) {
      return ctx.json({ success: false, error: 'Batch not found' }, 404);
    }
    // A nightly read from a narrow window cannot say whether the night before
    // it ran, so a "Didn't start" claim needs the list's wider view.
    if (batch.didntStart && parsed.kind === 'nightly') {
      const { runs: wide, triggers: wideTriggers } = await readWindow(
        new Date(center.getTime() - 40 * DAY_MS),
        new Date(center.getTime() + 2 * DAY_MS),
      );
      const confirmed = groupCrawlBatches({
        runs: wide,
        triggers: wideTriggers,
        now,
      }).find((candidate) => candidate.key === key);
      if (confirmed === undefined) {
        return ctx.json({ success: false, error: 'Batch not found' }, 404);
      }
      return ctx.json({ success: true, data: confirmed });
    }
    return ctx.json({ success: true, data: batch });
  },
);
