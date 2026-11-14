// What the Needs you All clear card says (`02-needs-you/all-clear`): last
// night's crawl, the next one, and how many venues are snoozed off-season. Read
// only when the queue is empty, from GET /v1/admin/needs-you/facts.

import { and, gt, inArray, isNotNull } from 'drizzle-orm';
import { adminQueueSnoozes, db } from '@concert-crawl/db';
import type { AllClearFacts } from '@concert-crawl/types';
import { BURST_GAP_MS, groupCrawlBatches } from '../crawl-batches.js';
import { readWindow } from '../crawl-window.js';
import { parseItemKey } from './keys.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When the daily crawl runs, in UTC. `apps/api/vercel.json` holds the cron
 * entry (`7 9 * * *` on `/v1/internal/cron/crawler-daily`) and a test keeps the
 * two equal. 09:07 UTC is 3:07 AM Mountain in summer, 2:07 AM in winter.
 */
export const CRAWLER_DAILY_CRON_UTC = { hour: 9, minute: 7 } as const;

/** The next daily crawl strictly after `now`. */
export const nextCrawlAfter = (now: Date): Date => {
  const { hour, minute } = CRAWLER_DAILY_CRON_UTC;
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hour,
      minute,
    ),
  );
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
};

const VENUE_KINDS = ['venue-failing', 'venue-blocked'] as const;

/**
 * A venue snoozed longer than this is off for the season, not for a day or a
 * week: "Snooze a week" ends 7 days out at most, "Until a date…" can run past it.
 */
export const OFF_SEASON_AFTER_DAYS = 7;

/** The distinct venues named by `<kind>:<venueId>[:<evidenceKey>]` item keys. */
export const venuesOfKeys = (keys: readonly string[]): number => {
  const venues = new Set<string>();
  for (const key of keys) {
    const parsed = parseItemKey(key);
    if (parsed) venues.add(parsed.rest.split(':')[0] ?? parsed.rest);
  }
  return venues.size;
};

const snoozedOffSeason = async (now: Date): Promise<number> => {
  const rows = await db
    .select({ itemKey: adminQueueSnoozes.itemKey })
    .from(adminQueueSnoozes)
    .where(
      and(
        isNotNull(adminQueueSnoozes.itemKey),
        inArray(adminQueueSnoozes.kind, [...VENUE_KINDS]),
        gt(
          adminQueueSnoozes.until,
          new Date(now.getTime() + OFF_SEASON_AFTER_DAYS * DAY_MS),
        ),
      ),
    );
  return venuesOfKeys(
    rows.flatMap((row) => (row.itemKey === null ? [] : [row.itemKey])),
  );
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
  const [window, snoozedVenues] = await Promise.all([
    readWindow(
      new Date(now.getTime() - 3 * DAY_MS),
      new Date(now.getTime() + DAY_MS),
    ),
    snoozedOffSeason(now),
  ]);
  return {
    lastCrawl: lastNightlyFact({ ...window, now }),
    nextCrawlAt: nextCrawlAfter(now).toISOString(),
    snoozedVenues,
  };
};
