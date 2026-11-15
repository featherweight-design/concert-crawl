// Where a re-crawl stands (`A3/03/re-crawl-states`): its place in the
// crawler's queue, its page progress, and how long the venue's crawl usually
// takes. Read by GET /v1/admin/crawl/triggers/:id, which the admin polls.

import { and, count, desc, eq, isNotNull, lt, ne } from 'drizzle-orm';
import { crawlRuns, crawlTriggers, db } from '@concert-crawl/db';
import type { CrawlTriggerProgress } from '@concert-crawl/types';

type TriggerRow = typeof crawlTriggers.$inferSelect;

/** The runs the estimate reads: the venue's latest full crawls. */
export const ESTIMATE_RUN_SAMPLE = 10;
/** Fewer full crawls than this and the estimate is left out. */
export const ESTIMATE_MIN_RUNS = 3;

/** The middle value, or the mean of the middle two, rounded to the ms. */
export const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid];
  if (upper === undefined) return null;
  if (sorted.length % 2 === 1) return upper;
  const lower = sorted[mid - 1];
  return lower === undefined ? upper : Math.round((lower + upper) / 2);
};

/**
 * Pending triggers the crawler claims before this one. It drains every
 * pending trigger, any venue or mode, oldest `createdAt` first, one at a
 * time (apps/crawler/src/run.ts claimPendingTriggers), so those are the ones
 * created earlier.
 */
const readQueuePosition = async (trigger: TriggerRow): Promise<number> => {
  const [row] = await db
    .select({ ahead: count() })
    .from(crawlTriggers)
    .where(
      and(
        eq(crawlTriggers.status, 'pending'),
        lt(crawlTriggers.createdAt, trigger.createdAt),
      ),
    );
  return row?.ahead ?? 0;
};

const readRunningAhead = async (trigger: TriggerRow): Promise<boolean> => {
  const rows = await db
    .select({ id: crawlTriggers.id })
    .from(crawlTriggers)
    .where(
      and(
        eq(crawlTriggers.status, 'processing'),
        ne(crawlTriggers.id, trigger.id),
      ),
    )
    .limit(1);
  return rows.length > 0;
};

/**
 * The median duration of the venue's last 10 successful runs, leaving out
 * test re-crawls (`trial`) and anything that did not finish a full crawl
 * (failed, partial, skipped as unchanged). Null below 3 such runs.
 */
const readEstimateMs = async (venueId: string): Promise<number | null> => {
  const rows = await db
    .select({ durationMs: crawlRuns.durationMs })
    .from(crawlRuns)
    .where(
      and(
        eq(crawlRuns.venueId, venueId),
        eq(crawlRuns.status, 'success'),
        eq(crawlRuns.trial, false),
        isNotNull(crawlRuns.durationMs),
      ),
    )
    .orderBy(desc(crawlRuns.createdAt))
    .limit(ESTIMATE_RUN_SAMPLE);
  const durations = rows.flatMap((row) =>
    row.durationMs === null ? [] : [row.durationMs],
  );
  if (durations.length < ESTIMATE_MIN_RUNS) return null;
  return median(durations);
};

export const readTriggerProgress = async (
  trigger: TriggerRow,
): Promise<CrawlTriggerProgress> => {
  const pending = trigger.status === 'pending';
  const live = pending || trigger.status === 'processing';
  const [queuePosition, runningAhead, estimateMs] = await Promise.all([
    pending ? readQueuePosition(trigger) : 0,
    pending ? readRunningAhead(trigger) : false,
    live ? readEstimateMs(trigger.venueId) : null,
  ]);
  return {
    status: trigger.status,
    pagesDone: trigger.pagesDone,
    pagesTotal: trigger.pagesTotal,
    progressAt: trigger.progressAt?.toISOString() ?? null,
    queuePosition,
    runningAhead,
    estimateMs,
  };
};
