import type { VenueWithEventCount } from '@concert-crawl/types'

export interface BulkVisibility {
  showVerify: boolean
  showUnverify: boolean
  showActivate: boolean
  showDeactivate: boolean
}

export function deriveBulkVisibility(
  venues: VenueWithEventCount[],
): BulkVisibility {
  return {
    showVerify: venues.some((venue) => !venue.verified),
    showUnverify: venues.some((venue) => venue.verified),
    showActivate: venues.some((venue) => !venue.active),
    showDeactivate: venues.some((venue) => venue.active),
  }
}
