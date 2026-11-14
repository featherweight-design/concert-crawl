// What the Needs you All clear card says (`02-needs-you/all-clear`): last
// night's crawl, the next one, and how many venues are snoozed. Read only when
// the queue is empty, from GET /v1/admin/needs-you/facts.

import type { AllClearFacts } from '@concert-crawl/types';
import { groupCrawlBatches } from '../crawl-batches.js';
import { parseItemKey } from './keys.js';
import { loadActiveSnoozes } from './snoozes.js';

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

const VENUE_KINDS: ReadonlySet<string> = new Set([
  'venue-failing',
  'venue-blocked',
]);

/**
 * Venues with a venue item snoozed right now, plus venues an admin turned a
 * warning off for ("Not useful"). A venue counts once however it is held.
 */
export const snoozedVenueCount = (snoozes: {
  keys: ReadonlySet<string>;
  notUseful: ReadonlySet<string>;
}): number => {
  const venues = new Set<string>();
  for (const key of snoozes.keys) {
    const parsed = parseItemKey(key);
    // `<kind>:<venueId>[:<evidenceKey>]`
    if (parsed && VENUE_KINDS.has(parsed.kind))
      venues.add(parsed.rest.split(':')[0] ?? parsed.rest);
  }
  for (const pair of snoozes.notUseful) {
    const [kind, venueId] = pair.split(':');
    if (kind && venueId && VENUE_KINDS.has(kind)) venues.add(venueId);
  }
  return venues.size;
};

type BatchInputs = Parameters<typeof groupCrawlBatches>[0];

/**
 * The latest nightly that started. A venue read OK when its page was fetched
 * or found unchanged; paused venues are in the total, not the OK count.
 */
export const lastNightlyFact = (
  inputs: BatchInputs,
): AllClearFacts['lastCrawl'] => {
  const night = groupCrawlBatches(inputs).find(
    (batch) =>
      batch.kind === 'nightly' && !batch.didntStart && batch.startedAt !== null,
  );
  if (!night?.startedAt) return null;
  return {
    ok: night.counts.ok + night.counts.unchanged,
    total: night.counts.total,
    at: night.startedAt,
  };
};

export const readAllClearFacts = async (
  now: Date,
  readRuns: (from: Date, to: Date) => Promise<Omit<BatchInputs, 'now'>>,
): Promise<AllClearFacts> => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const [window, snoozes] = await Promise.all([
    readRuns(
      new Date(now.getTime() - 3 * DAY_MS),
      new Date(now.getTime() + DAY_MS),
    ),
    loadActiveSnoozes(now),
  ]);
  return {
    lastCrawl: lastNightlyFact({ ...window, now }),
    nextCrawlAt: nextCrawlAfter(now).toISOString(),
    snoozedVenues: snoozedVenueCount(snoozes),
  };
};
