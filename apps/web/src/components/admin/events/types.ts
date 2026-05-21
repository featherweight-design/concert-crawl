export interface AdminEvent {
  id: string
  title: string
  artist: string
  venueId: string | null
  venueName: string | null
  date: string
  doorsTime: string | null
  showTime: string | null
  ticketPriceMin: string | null
  ticketPriceMax: string | null
  confidenceScore: string | null
  extractionStrategy: string | null
  sourceUrl: string | null
  genre: string[] | null
  createdAt: string
  verified: boolean
}
