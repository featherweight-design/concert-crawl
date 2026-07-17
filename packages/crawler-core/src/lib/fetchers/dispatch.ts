import type { Venue } from '@concert-crawl/db'
import { aegFetcher } from './aeg.js'
import { venuePilotFetcher } from './venuepilot.js'
import type { PlatformFetcher } from './index.js'

// Ordered list of available adapters. Each fetcher owns its own matching
// via canHandle(); dispatch returns the first that claims the venue.
// AEG matches on venue.platform, VenuePilot on venue.apiProvider — a
// venue never matches both (a VenuePilot venue has platform = null).
const FETCHERS: readonly PlatformFetcher[] = [
  aegFetcher,
  venuePilotFetcher,
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
