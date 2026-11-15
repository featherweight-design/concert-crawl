// Where a re-crawl stands (`A3/03/re-crawl-states`): its place in the
// crawler's queue, how long the venue's crawl usually takes, and how long until
// it starts. Read by GET /v1/admin/crawl/triggers/:id, which the admin polls.
// The page progress itself (`pagesDone`, `pagesTotal`, `progressAt`,
// `startedAt`) is on the trigger row; this adds only what is derived from it.

import {
  and,
  asc,
  count,
  eq,
  gt,
  inArray,
  isNotNull,
  lt,
  lte,
  sql,
} from 'drizzle-orm';
import { crawlRuns, crawlTriggers, db } from '@concert-crawl/db';
import type { CrawlTriggerProgress } from '@concert-crawl/types';

type TriggerRow = typeof crawlTriggers.$inferSelect;

/** The runs the estimate reads: the venue's latest full crawls. */
export const ESTIMATE_RUN_SAMPLE = 10;
/** Fewer full crawls than this and the estimate is left out. */
export const ESTIMATE_MIN_RUNS = 3;
/** More pending triggers ahead than this and the wait is too far to estimate. */
export const WAIT_MAX_AHEAD = 20;

/**
 * A 'processing' trigger not touched for this long is dead, not running: the
 * crawler reaps it as stranded at the start of its next run. Keep in step with
 * STALE_PROCESSING_MS in apps/crawler/src/run.ts.
 */
export const STALE_PROCESSING_MS = 30 * 60 * 1000;

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
const pendingAhead = (trigger: TriggerRow) =>
  and(
    eq(crawlTriggers.status, 'pending'),
    lt(crawlTriggers.createdAt, trigger.createdAt),
  );

const readQueuePosition = async (trigger: TriggerRow): Promise<number> => {
  const [row] = await db
    .select({ ahead: count() })
    .from(crawlTriggers)
    .where(pendingAhead(trigger));
  return row?.ahead ?? 0;
};

interface AheadRow {
  venueId: string;
  force: boolean;
}

/** The pending triggers ahead, up to one past the wait's limit. */
const readPendingAhead = async (trigger: TriggerRow): Promise<AheadRow[]> =>
  db
    .select({ venueId: crawlTriggers.venueId, force: crawlTriggers.force })
    .from(crawlTriggers)
    .where(pendingAhead(trigger))
    .orderBy(asc(crawlTriggers.createdAt))
    .limit(WAIT_MAX_AHEAD + 1);

interface RunningRow extends AheadRow {
  startedAt: Date | null;
}

/** Triggers being crawled right now: processing, and not gone stale. */
const readRunning = async (): Promise<RunningRow[]> =>
  db
    .select({
      venueId: crawlTriggers.venueId,
      force: crawlTriggers.force,
      startedAt: crawlTriggers.startedAt,
    })
    .from(crawlTriggers)
    .where(
      and(
        eq(crawlTriggers.status, 'processing'),
        gt(crawlTriggers.updatedAt, new Date(Date.now() - STALE_PROCESSING_MS)),
      ),
    );

/**
 * Each venue's typical crawl time, in one query: the median duration of its
 * last 10 successful runs, leaving out test re-crawls (`trial`) and anything
 * that did not finish a full crawl (failed, partial, skipped as unchanged).
 * A venue with fewer than 3 such runs is absent from the map.
 */
const readVenueMedians = async (
  venueIds: string[],
): Promise<Map<string, number>> => {
  const result = new Map<string, number>();
  if (venueIds.length === 0) return result;
  const ranked = db
    .select({
      venueId: crawlRuns.venueId,
      durationMs: crawlRuns.durationMs,
      rn: sql<number>`row_number() over (partition by ${crawlRuns.venueId} order by ${crawlRuns.createdAt} desc, ${crawlRuns.id} desc)`.as(
        'rn',
      ),
    })
    .from(crawlRuns)
    .where(
      and(
        inArray(crawlRuns.venueId, venueIds),
        eq(crawlRuns.status, 'success'),
        eq(crawlRuns.trial, false),
        isNotNull(crawlRuns.durationMs),
      ),
    )
    .as('ranked');
  const rows = await db
    .select({ venueId: ranked.venueId, durationMs: ranked.durationMs })
    .from(ranked)
    .where(lte(ranked.rn, ESTIMATE_RUN_SAMPLE));

  const durations = new Map<string, number[]>();
  for (const row of rows) {
    if (row.durationMs === null) continue;
    const list = durations.get(row.venueId) ?? [];
    list.push(row.durationMs);
    durations.set(row.venueId, list);
  }
  for (const [venueId, list] of durations) {
    if (list.length < ESTIMATE_MIN_RUNS) continue;
    const middle = median(list);
    if (middle !== null) result.set(venueId, middle);
  }
  return result;
};

/**
 * How long until a pending trigger starts: what is left of each run in
 * progress (its venue's typical time less how long it has been going, floored
 * at 0) plus the typical time of each pending trigger ahead. Null when any
 * part is unknown: a run with no start time, a venue without enough history,
 * a forced re-extraction, or too many ahead to estimate.
 */
const computeWaitMs = (
  running: RunningRow[],
  ahead: AheadRow[],
  medians: Map<string, number>,
  now: number,
): number | null => {
  if (ahead.length > WAIT_MAX_AHEAD) return null;
  let wait = 0;
  for (const run of running) {
    const typical = medians.get(run.venueId);
    if (run.force || run.startedAt === null || typical === undefined) {
      return null;
    }
    wait += Math.max(0, typical - (now - run.startedAt.getTime()));
  }
  for (const next of ahead) {
    const typical = medians.get(next.venueId);
    if (next.force || typical === undefined) return null;
    wait += typical;
  }
  return wait;
};

export const readTriggerProgress = async (
  trigger: TriggerRow,
): Promise<CrawlTriggerProgress> => {
  const pending = trigger.status === 'pending';
  const live = pending || trigger.status === 'processing';
  const [queuePosition, running, ahead] = await Promise.all([
    pending ? readQueuePosition(trigger) : 0,
    pending ? readRunning() : [],
    pending ? readPendingAhead(trigger) : [],
  ]);

  // A forced re-extraction skips the hash short-circuits and re-extracts every
  // event, so the venue's normal runs say nothing about how long it takes.
  const wantEstimate = live && !trigger.force;
  const wantWait = pending && ahead.length <= WAIT_MAX_AHEAD;
  const venueIds = new Set<string>();
  if (wantEstimate) venueIds.add(trigger.venueId);
  if (wantWait) {
    for (const row of [...running, ...ahead]) venueIds.add(row.venueId);
  }
  const medians = await readVenueMedians([...venueIds]);

  return {
    queuePosition,
    runningAhead: running.length > 0,
    estimateMs: wantEstimate ? (medians.get(trigger.venueId) ?? null) : null,
    waitMs: pending ? computeWaitMs(running, ahead, medians, Date.now()) : null,
  };
};
