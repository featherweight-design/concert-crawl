'use client'

import { EventFlagsSection } from '../EventFlagsSection'

interface EventFlag {
  id: string
  title: string
  artist: string | null
  date: string
  doorsTime: string | null
  showTime: string | null
  ticketPriceMin: string | null
  ticketPriceMax: string | null
  confidenceScore: number | null
  extractionStrategy: string | null
  sourceUrl: string | null
  genre: string[] | null
  createdAt: string
  venueId: string
  venueName: string | null
}

export interface EventFlagsTabContentProps {
  events: EventFlag[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

export const EventFlagsTabContent = ({
  events,
  onApprove,
  onReject,
}: EventFlagsTabContentProps) => (
  <EventFlagsSection
    events={events}
    onApprove={onApprove}
    onReject={onReject}
  />
)
