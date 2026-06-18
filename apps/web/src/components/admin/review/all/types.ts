export type AllEventLifecycle = 'upcoming' | 'postponed' | 'cancelled'

export interface AllEvent {
  id: string
  title: string
  artist: string | null
  venueId: string
  venueName: string | null
  date: string
  doorsTime: string | null
  showTime: string | null
  ticketPriceMin: string | null
  ticketPriceMax: string | null
  confidenceScore: number | null
  verified: boolean
  status: AllEventLifecycle
  extractionStrategy: string | null
  sourceUrl: string | null
  genre: string[] | null
  createdAt: string
  isSoldOut: boolean
}
