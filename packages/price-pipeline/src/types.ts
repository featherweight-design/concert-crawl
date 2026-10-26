import type { PriceSource } from '@concert-crawl/types'

export type { PriceSource }

export interface PriceTierResult {
  priceMin: number
  priceMax: number | null
  source: PriceSource
}

export interface PipelineContext {
  eventId: string
  venueId: string
  artist: string
  supportingArtists?: string[] | null
  tourName?: string | null
  date: string // YYYY-MM-DD
  priceUrl?: string | null
  ticketUrl?: string | null
}

/**
 * Thrown by a tier that could not try this event right now for a reason that
 * says nothing about the event, such as a robots.txt that did not answer. The
 * pipeline logs it as an error but does not mark the event exhausted, so the
 * next run tries again.
 */
export class PriceFetchDeferredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PriceFetchDeferredError'
  }
}
