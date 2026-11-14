// What the Needs you All clear card says (`02-needs-you/all-clear`): last
// night's crawl, the next one, and how many items are snoozed and when the
// next comes back (`01-snooze/all-clear-d`). Read
// only when the queue is empty, from GET /v1/admin/needs-you/facts.

import { and, count, gt, isNotNull, min } from 'drizzle-orm';
import { adminQueueSnoozes, db } from '@concert-crawl/db';
import type { AllClearFacts } from '@concert-crawl/types';
import { BURST_GAP_MS, groupCrawlBatches } from '../crawl-batches.js';
import { readWindow } from '../crawl-window.js';
import { nextDailyCrawlAt } from '../../../../lib/crawl-schedule.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Every item snoozed right now, of any kind, and the soonest one back. A
 * "Not useful" switch has no return time and is not a snooze, so it is left out.
 */
const snoozedNow = async (
  now: Date,
): Promise<{ count: number; nextBackAt: string | null }> => {
  const [row] = await db
    .select({ count: count(), next: min(adminQueueSnoozes.until) })
    .from(adminQueueSnoozes)
    .where(
      and(
        isNotNull(adminQueueSnoozes.itemKey),
        gt(adminQueueSnoozes.until, now),
      ),
    );
  return {
    count: row?.count ?? 0,
    nextBackAt: row?.next ? new Date(row.next).toISOString() : null,
  };
};

type BatchInputs = Parameters<typeof groupCrawlBatches>[0];

/**
 * The latest nightly that has finished: one whose last run is at least a burst
 * gap old, so a night still running (its OK count and total both partial) is
 * not read as a clean sweep. A venue read OK when its page was fetched or found
 * unchanged; paused venues are in the total, not the OK count.
 */
export const lastNightlyFact = (
  inputs: BatchInputs,
): AllClearFacts['lastCrawl'] => {
  const night = groupCrawlBatches(inputs).find(
    (batch) =>
      batch.kind === 'nightly' &&
      !batch.didntStart &&
      batch.startedAt !== null &&
      batch.endedAt !== null &&
      inputs.now.getTime() - new Date(batch.endedAt).getTime() >= BURST_GAP_MS,
  );
  if (!night?.startedAt) return null;
  return {
    ok: night.counts.ok + night.counts.unchanged,
    total: night.counts.total,
    at: night.startedAt,
  };
};

export const readAllClearFacts = async (now: Date): Promise<AllClearFacts> => {
  const [window, snoozed] = await Promise.all([
    readWindow(
      new Date(now.getTime() - 3 * DAY_MS),
      new Date(now.getTime() + DAY_MS),
    ),
    snoozedNow(now),
  ]);
  return {
    lastCrawl: lastNightlyFact({ ...window, now }),
    // Null outside production, where no daily crawl runs.
    nextCrawlAt: nextDailyCrawlAt(now),
    snoozed: snoozed.count,
    nextBackAt: snoozed.nextBackAt,
  };
};
