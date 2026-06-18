import type { Venue } from '@concert-crawl/db'
import { aegFetcher } from './aeg.js'
import type { PlatformFetcher } from './index.js'

// Ordered list of available adapters. Order doesn't matter today
// because each fetcher's `platform` is distinct, but if we ever add
// detect-by-URL fallbacks (no venue.platform set, infer from
// venue.websiteUrl) the first match would win.
const FETCHERS: readonly PlatformFetcher[] = [aegFetcher] as const

/**
 * Pick the platform fetcher for a venue, or null if the venue should
 * fall through to the HTML → JSON-LD → LLM cascade.
 *
 * Returns null when:
 *  - venue.platform is null (no platform configured)
 *  - no registered fetcher claims that platform value (defensive
 *    against a value typo'd into the column by an admin or migration)
 *  - the matching fetcher's canHandle() rejects the venue (e.g.
 *    platformVenueId is missing)
 */
export function dispatch(venue: Venue): PlatformFetcher | null {
  if (!venue.platform) return null
  const fetcher = FETCHERS.find((entry) => entry.platform === venue.platform)
  if (!fetcher) return null
  if (!fetcher.canHandle(venue)) return null
  return fetcher
}
