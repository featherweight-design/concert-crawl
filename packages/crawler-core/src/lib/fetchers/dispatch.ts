import type { Venue } from '@concert-crawl/db'
import { aegFetcher } from './aeg.js'
import { detailPageFetcher } from './detail-page.js'
import { liveNationFetcher } from './livenation.js'
import { venuePilotFetcher } from './venuepilot.js'
import type { PlatformFetcher } from './index.js'

// Ordered list of available adapters. Each fetcher owns its own matching
// via canHandle(); dispatch returns the FIRST that claims the venue, so
// order encodes precedence. AEG and Live Nation each require venue.platform
// to name them AND a non-empty venue.platformVenueId; VenuePilot keys off
// venue.apiProvider. These are normally mutually exclusive,
// but the schema permits both columns to be populated — a misconfiguration.
// When both are set we prefer the explicit API integration (apiProvider),
// so VenuePilot is listed first. AEG and Live Nation can never both match,
// since venue.platform holds a single value. The same goes for
// 'detail-page', which keys off venue.platform and needs no platformVenueId
// (its listing URL is venue.websiteUrl).
const FETCHERS: readonly PlatformFetcher[] = [
  venuePilotFetcher,
  aegFetcher,
  liveNationFetcher,
  detailPageFetcher,
] as const

/**
 * Pick the platform fetcher for a venue, or null if the venue should
 * fall through to the HTML → JSON-LD → LLM cascade. Each fetcher's
 * canHandle() inspects the columns it cares about (AEG: platform +
 * platformVenueId; Live Nation: platform + platformVenueId; VenuePilot:
 * apiProvider + apiAccountId).
 */
export function dispatch(venue: Venue): PlatformFetcher | null {
  return FETCHERS.find((fetcher) => fetcher.canHandle(venue)) ?? null
}
