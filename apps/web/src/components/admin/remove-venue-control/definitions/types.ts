export interface RemoveVenueControlProps {
  venueId: string
  venueName: string
  /** The venue's data was removed at its request (`venues.removed_at`). */
  removed: boolean
}
