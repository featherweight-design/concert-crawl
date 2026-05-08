export type { PriceSource } from '@concert-crawl/types'

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
