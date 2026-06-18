'use client'

import { type ComponentProps } from 'react'
import { PendingSubmissionsPanel } from '../PendingSubmissionsPanel'
import { PriceCoverageTable } from '../PriceCoverageTable'

type PendingProps = ComponentProps<typeof PendingSubmissionsPanel>
type CoverageProps = ComponentProps<typeof PriceCoverageTable>

export interface PricesTabContentProps {
  submissions: PendingProps['submissions']
  onApproveSubmission: PendingProps['onApprove']
  onDenySubmission: PendingProps['onDeny']
  priceEvents: CoverageProps['events']
  priceEventsLoading: NonNullable<CoverageProps['loading']>
  hasMorePriceEvents: CoverageProps['hasMore']
  priceLoadingMore: NonNullable<CoverageProps['loadingMore']>
  pricesMissingOnly: CoverageProps['missingOnly']
  onTogglePriceFilter: CoverageProps['onToggleFilter']
  onLoadMorePriceEvents: CoverageProps['onLoadMore']
  onAddPrice: NonNullable<CoverageProps['onAddPrice']>
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
