import { createDeadline } from '@concert-crawl/crawler-core/deadline';
import { jitter } from '@concert-crawl/crawler-core/jitter';
import {
  checkRobots,
  getCrawlDelayMs,
  resolveCrawlDelayMs,
} from '@concert-crawl/crawler-core/robots';
import {
  fetchFollowingRobots,
  raceSignal,
} from '@concert-crawl/crawler-core/robots-fetch';
import { CRAWLER_USER_AGENT, MIN_CRAWL_DELAY_MS } from '@concert-crawl/types';
import type { TicketVendor } from '@concert-crawl/types';
import { apiLogger } from './logger.js';

const VENDOR_SIGNALS: Array<{ pattern: RegExp; vendor: TicketVendor }> = [
  { pattern: /axs\.com/i, vendor: 'axs' },
  { pattern: /class="axs-/i, vendor: 'axs' },
  { pattern: /ticketmaster\.com/i, vendor: 'ticketmaster' },
  { pattern: /seatgeek\.com/i, vendor: 'seatgeek' },
  { pattern: /dice\.fm/i, vendor: 'dice' },
  { pattern: /eventbrite\.com/i, vendor: 'eventbrite' },
];

// Each request's network allowance: a robots.txt read, the page, or a hop.
const DETECT_TIMEOUT_MS = 8_000;

// The most redirect hops detection follows, the same cap as the admin probe.
// Every hop costs a full pacing wait, so this is what bounds the budget.
export const DETECT_MAX_REDIRECTS = 3;

/**
 * The whole detection's budget at a resolved delay: the robots.txt reads,
 * then the page and each hop it may follow, every one of those a paced wait
 * at its longest (the delay plus a full second of jitter) and its own
 * network allowance.
 */
export const detectBudgetMs = (delayMs: number): number =>
  DETECT_TIMEOUT_MS +
  (1 + DETECT_MAX_REDIRECTS) *
    (Math.max(delayMs, MIN_CRAWL_DELAY_MS) + 1_000 + DETECT_TIMEOUT_MS);

const MAX_BYTES = 256 * 1024; // 256 KB

/**
 * `venueCrawlDelayMs` is the venue's stored delay. The crawl paces this site
 * at the longer of it and robots.txt's Crawl-delay, never under 3 s, so
 * detection does the same: robots.txt, then the page, then each redirect hop,
 * every request at least that far apart.
 *
 * The whole detection runs under one deadline (`detectBudgetMs`), so a slow
 * site or a long redirect chain can't hold the background task open. A
 * breach, like any other failure, is logged and reads as 'unknown'.
 */
export async function detectTicketVendor(
  websiteUrl: string,
  venueCrawlDelayMs: number = MIN_CRAWL_DELAY_MS,
): Promise<TicketVendor> {
  try {
    const deadline = createDeadline({
      perRequestTimeoutMs: DETECT_TIMEOUT_MS,
      overallTimeoutMs: detectBudgetMs(venueCrawlDelayMs),
    });
    // The same robots.txt gate and pacing as the crawler: this is a fetch of
    // the venue's own site, right after we read its robots.txt. It runs in
    // the background after the venue is created, so the wait blocks no one.
    const robots = await deadline.run('robots.txt', (_timeoutMs, budget) =>
      raceSignal(checkRobots(websiteUrl, CRAWLER_USER_AGENT), budget?.signal),
    );
    if (robots.status !== 'allowed') return 'unknown';
    const robotsDelayMs = await deadline.run(
      'robots.txt crawl-delay',
      (_timeoutMs, budget) =>
        raceSignal(
          getCrawlDelayMs(websiteUrl, CRAWLER_USER_AGENT),
          budget?.signal,
        ),
    );
    const delayMs = resolveCrawlDelayMs(venueCrawlDelayMs, robotsDelayMs, {
      url: websiteUrl,
    });
    if (delayMs === null) return 'unknown';
    // A longer robots.txt Crawl-delay widens the budget rather than
    // breaching it: the delay itself is never shortened.
    deadline.extend(
      detectBudgetMs(delayMs) - detectBudgetMs(venueCrawlDelayMs),
    );
    await deadline.wait(jitter(delayMs));

    // Each redirect hop clears robots.txt and waits before we follow it, at
    // the delay resolved above (or the hop host's own Crawl-delay if longer),
    // not just the 3 s floor, and against the same budget.
    const html = await deadline.run('page', async (timeoutMs, budget) => {
      const { response } = await fetchFollowingRobots(websiteUrl, {
        crawlDelayMs: delayMs,
        maxRedirects: DETECT_MAX_REDIRECTS,
        ...(timeoutMs !== undefined ? { timeoutMs } : {}),
        ...(budget !== undefined ? { budget } : {}),
      });
      if (!response.ok) return null;
      const buffer = await response.arrayBuffer();
      return new TextDecoder().decode(buffer.slice(0, MAX_BYTES));
    });
    if (html === null) return 'unknown';
    for (const { pattern, vendor } of VENDOR_SIGNALS) {
      if (pattern.test(html)) return vendor;
    }
    return 'unknown';
  } catch (err) {
    apiLogger.warn({ err }, 'detectTicketVendor: fetch failed');
    return 'unknown';
  }
}
