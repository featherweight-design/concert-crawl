'use client'

import { PendingSubmissionsPanel } from '../PendingSubmissionsPanel'
import { PriceCoverageTable } from '../PriceCoverageTable'

interface PriceSubmission {
  id: string
  eventId: string
  userId: string
  priceMin: string | null
  priceMax: string | null
  note?: string | null
  status: string
  createdAt: string
  eventTitle: string | null
  eventDate: string | null
  ticketUrl: string | null
  venueName: string | null
}

interface PriceEvent {
  eventId: string
  eventTitle: string
  artist: string | null
  venueName: string | null
  date: string
  ticketUrl: string | null
  priceMin: string | null
  priceMax: string | null
  priceSource: string | null
  lastRetrievedAt: string | null
  lastOutcome: string | null
}

export interface PricesTabContentProps {
  submissions: PriceSubmission[]
  onApproveSubmission: (id: string) => void
  onDenySubmission: (id: string) => void
  priceEvents: PriceEvent[]
  priceEventsLoading: boolean
  hasMorePriceEvents: boolean
  priceLoadingMore: boolean
  pricesMissingOnly: boolean
  onTogglePriceFilter: () => void
  onLoadMorePriceEvents: () => void
  onAddPrice: (
    eventId: string,
    priceMin: string,
    priceMax: string | null,
    vendor: string,
    howFound: string,
  ) => Promise<void>
}

export const PricesTabContent = ({
  submissions,
  onApproveSubmission,
  onDenySubmission,
  priceEvents,
  priceEventsLoading,
  hasMorePriceEvents,
  priceLoadingMore,
  pricesMissingOnly,
  onTogglePriceFilter,
  onLoadMorePriceEvents,
  onAddPrice,
}: PricesTabContentProps) => (
  <div
    id="submissions-section"
    style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
  >
    <PendingSubmissionsPanel
      submissions={submissions}
      onApprove={onApproveSubmission}
      onDeny={onDenySubmission}
    />
    <PriceCoverageTable
      events={priceEvents}
      loading={priceEventsLoading}
      onAddPrice={onAddPrice}
      missingOnly={pricesMissingOnly}
      hasMore={hasMorePriceEvents}
      loadingMore={priceLoadingMore}
      onToggleFilter={onTogglePriceFilter}
      onLoadMore={onLoadMorePriceEvents}
    />
  </div>
)
