import type { Venue } from '@concert-crawl/db'
import { aegFetcher } from './aeg.js'
import { venuePilotFetcher } from './venuepilot.js'
import type { PlatformFetcher } from './index.js'

// Ordered list of available adapters. Each fetcher owns its own matching
// via canHandle(); dispatch returns the FIRST that claims the venue, so
// order encodes precedence. AEG matches on venue.platform, VenuePilot on
// venue.apiProvider. These are normally mutually exclusive, but the schema
// permits both columns to be populated — a misconfiguration. When both are
// set we prefer the explicit API integration (apiProvider), so VenuePilot
// is listed first.
const FETCHERS: readonly PlatformFetcher[] = [
  venuePilotFetcher,
  aegFetcher,
] as const

/**
 * Pick the platform fetcher for a venue, or null if the venue should
 * fall through to the HTML → JSON-LD → LLM cascade. Each fetcher's
 * canHandle() inspects the columns it cares about (AEG: platform +
 * platformVenueId; VenuePilot: apiProvider + apiAccountId).
 */
export function dispatch(venue: Venue): PlatformFetcher | null {
  return FETCHERS.find((fetcher) => fetcher.canHandle(venue)) ?? null
}
