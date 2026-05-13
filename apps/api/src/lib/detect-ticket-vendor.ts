import type { TicketVendor } from '@concert-crawl/types'
import { apiLogger } from './logger.js'

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
    const res = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'ConcertCrawl/1.0 (+https://concertcrawl.app/bot)',
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
