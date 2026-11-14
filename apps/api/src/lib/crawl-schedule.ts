// When the daily crawl runs. The cron time and the next run after a moment
// live in @concert-crawl/types, shared with the web; the production gate is
// here, so the Source tab, Crawl all's estimate and the Needs you All clear
// card always name the same night.

import { nextCrawlAfter } from '@concert-crawl/types';
import { crawlerDispatchEnvironment } from './crawler-dispatch.js';

export { CRAWLER_DAILY_CRON_UTC, nextCrawlAfter } from '@concert-crawl/types';

/**
 * The next daily crawl after `now`, ISO UTC, or null where none runs: only
 * production starts the daily crawl (startDailyCrawl's gate), so anywhere
 * else there is no nightly to name.
 */
export const nextDailyCrawlAt = (now: Date): string | null =>
  crawlerDispatchEnvironment() === 'production'
    ? nextCrawlAfter(now).toISOString()
    : null;
