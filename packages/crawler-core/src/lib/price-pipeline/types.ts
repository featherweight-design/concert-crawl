export type PriceSource =
  | 'structured_data'
  | 'ticketmaster'
  | 'eventbrite'
  | 'dice'
  | 'songkick'
  | 'bandsintown'
  | 'seatgeek'
  | 'community'

export interface PriceTierResult {
  priceMin: number
  priceMax: number | null
  source: PriceSource
}

export interface PipelineContext {
  eventId: string
  venueId: string
  artist: string
  date: string // YYYY-MM-DD
  priceUrl?: string | null
  ticketUrl?: string | null
}
