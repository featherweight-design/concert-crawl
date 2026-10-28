export interface RemoveVenueControlProps {
  venueId: string
  venueName: string
  /** Inactive and crawl-paused: what a completed removal leaves behind. */
  removed: boolean
}
