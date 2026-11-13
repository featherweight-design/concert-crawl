// Shared crawl-delay jitter (#985).
//
// Every fetcher that paces its own requests adds up to 1000ms of random jitter
// to the configured crawl delay so a run doesn't hit a host on a bot-like fixed
// interval. It was duplicated across the HTML cascade (lib/fetcher.ts),
// VenuePilot, detail-page and Live Nation before being centralized here.
//
// It is also where the 3 second floor is enforced for every wait: each pacing
// wait in the crawler, the admin probe's included, goes through this function,
// so no caller can pass a short or zero delay and pace faster than the rule.

import { MIN_CRAWL_DELAY_MS } from '@concert-crawl/types';

/**
 * Turn a crawl delay into the wait to actually take: the delay, floored at
 * MIN_CRAWL_DELAY_MS, plus 0–999ms.
 *
 * Additive only: the floored delay is a minimum, and /bot publishes it as
 * "at least 3 seconds". Jitter that could subtract would break that promise.
 * A delay of 0 is floored too, so the result is never below 3000ms.
 */
export function jitter(ms: number): number {
  return Math.max(ms, MIN_CRAWL_DELAY_MS) + Math.floor(Math.random() * 1000);
}
