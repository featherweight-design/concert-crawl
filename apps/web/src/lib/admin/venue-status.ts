import type { Venue } from '@concert-crawl/types'

export type VenueStatus = 'active' | 'paused' | 'blocked'

export function deriveVenueStatus(
  venue: Pick<Venue, 'active' | 'blockedAt' | 'consecutiveFailures'>,
): VenueStatus {
  if (venue.blockedAt !== null && venue.consecutiveFailures > 0)
    return 'blocked'
  if (!venue.active) return 'paused'
  return 'active'
}

export function venueHealthPercent(
  venue: Pick<Venue, 'consecutiveFailures'>,
): number {
  return venue.consecutiveFailures === 0
    ? 100
    : Math.max(0, 100 - venue.consecutiveFailures * 20)
}
