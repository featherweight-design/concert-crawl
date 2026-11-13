import { jitter } from '@concert-crawl/crawler-core/jitter';
import {
  checkRobots,
  getCrawlDelayMs,
  resolveCrawlDelayMs,
} from '@concert-crawl/crawler-core/robots';
import { fetchFollowingRobots } from '@concert-crawl/crawler-core/robots-fetch';
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

/**
 * `venueCrawlDelayMs` is the venue's stored delay. The crawl paces this site
 * at the longer of it and robots.txt's Crawl-delay, never under 3 s, so
 * detection does the same: robots.txt, then the page, then each redirect hop,
 * every request at least that far apart.
 */
export async function detectTicketVendor(
  websiteUrl: string,
  venueCrawlDelayMs: number = MIN_CRAWL_DELAY_MS,
): Promise<TicketVendor> {
  try {
    // The same robots.txt gate and pacing as the crawler: this is a fetch of
    // the venue's own site, right after we read its robots.txt. It runs in
    // the background after the venue is created, so the wait blocks no one.
    const robots = await checkRobots(websiteUrl, CRAWLER_USER_AGENT);
    if (robots.status !== 'allowed') return 'unknown';
    const delayMs = resolveCrawlDelayMs(
      venueCrawlDelayMs,
      await getCrawlDelayMs(websiteUrl, CRAWLER_USER_AGENT),
      { url: websiteUrl },
    );
    if (delayMs === null) return 'unknown';
    await new Promise((resolve) => setTimeout(resolve, jitter(delayMs)));

    // Each redirect hop clears robots.txt and waits before we follow it, at
    // the delay resolved above (or the hop host's own Crawl-delay if longer),
    // not just the 3 s floor.
    const { response: res } = await fetchFollowingRobots(websiteUrl, {
      crawlDelayMs: delayMs,
      timeoutMs: 8_000,
    });
    if (!res.ok) return 'unknown';
    const MAX_BYTES = 256 * 1024; // 256 KB
    const buffer = await res.arrayBuffer();
    const html = new TextDecoder().decode(buffer.slice(0, MAX_BYTES));
    for (const { pattern, vendor } of VENDOR_SIGNALS) {
      if (pattern.test(html)) return vendor;
    }
    return 'unknown';
  } catch (err) {
    apiLogger.warn({ err }, 'detectTicketVendor: fetch failed');
    return 'unknown';
  }
}
