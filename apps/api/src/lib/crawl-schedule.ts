// When the daily crawl runs. One place for the cron time, the next run after
// a moment, and the production gate, so the Source tab, Crawl all's estimate
// and the Needs you All clear card always name the same night.

import { crawlerDispatchEnvironment } from './crawler-dispatch.js';

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

/**
 * The next daily crawl after `now`, ISO UTC, or null where none runs: only
 * production starts the daily crawl (startDailyCrawl's gate), so anywhere
 * else there is no nightly to name.
 */
export const nextDailyCrawlAt = (now: Date): string | null =>
  crawlerDispatchEnvironment() === 'production'
    ? nextCrawlAfter(now).toISOString()
    : null;
