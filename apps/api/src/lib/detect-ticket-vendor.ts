import { jitter } from '@concert-crawl/crawler-core/jitter'
import {
  checkRobots,
  getCrawlDelayMs,
  resolveCrawlDelayMs,
} from '@concert-crawl/crawler-core/robots'
import { CRAWLER_USER_AGENT } from '@concert-crawl/types'
import type { TicketVendor } from '@concert-crawl/types'
import { apiLogger } from './logger.js'

// Our own floor between requests, the same 3 seconds the crawler uses. It
// separates the robots.txt read from the page fetch.
const DETECT_FETCH_DELAY_MS = 3000

const VENDOR_SIGNALS: Array<{ pattern: RegExp; vendor: TicketVendor }> = [
  { pattern: /axs\.com/i, vendor: 'axs' },
  { pattern: /class="axs-/i, vendor: 'axs' },
  { pattern: /ticketmaster\.com/i, vendor: 'ticketmaster' },
  { pattern: /seatgeek\.com/i, vendor: 'seatgeek' },
  { pattern: /dice\.fm/i, vendor: 'dice' },
  { pattern: /eventbrite\.com/i, vendor: 'eventbrite' },
]

export async function detectTicketVendor(
  websiteUrl: string,
): Promise<TicketVendor> {
  try {
    // The same robots.txt gate and pacing as the crawler: this is a fetch of
    // the venue's own site, right after we read its robots.txt. It runs in
    // the background after the venue is created, so the wait blocks no one.
    const robots = await checkRobots(websiteUrl, CRAWLER_USER_AGENT)
    if (robots.status !== 'allowed') return 'unknown'
    const delayMs = resolveCrawlDelayMs(
      DETECT_FETCH_DELAY_MS,
      await getCrawlDelayMs(websiteUrl, CRAWLER_USER_AGENT),
      { url: websiteUrl },
    )
    if (delayMs === null) return 'unknown'
    await new Promise((resolve) => setTimeout(resolve, jitter(delayMs)))

    const res = await fetch(websiteUrl, {
      headers: {
        'User-Agent': CRAWLER_USER_AGENT,
      },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return 'unknown'
    const MAX_BYTES = 256 * 1024 // 256 KB
    const buffer = await res.arrayBuffer()
    const html = new TextDecoder().decode(buffer.slice(0, MAX_BYTES))
    for (const { pattern, vendor } of VENDOR_SIGNALS) {
      if (pattern.test(html)) return vendor
    }
    return 'unknown'
  } catch (err) {
    apiLogger.warn({ err }, 'detectTicketVendor: fetch failed')
    return 'unknown'
  }
}
