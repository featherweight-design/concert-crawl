export interface BulkVisibility {
  showVerify: boolean
  showUnverify: boolean
  showActivate: boolean
  showDeactivate: boolean
}

export function deriveBulkVisibility(
  venues: Array<{ active: boolean; verified: boolean }>,
): BulkVisibility {
  return {
    showVerify: venues.some((venue) => !venue.verified),
    showUnverify: venues.some((venue) => venue.verified),
    showActivate: venues.some((venue) => !venue.active),
    showDeactivate: venues.some((venue) => venue.active),
  }
}
