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
  pricesMissingOnly: CoverageProps['missingOnly']
  onTogglePriceFilter: CoverageProps['onToggleFilter']
  priceEventsPage: CoverageProps['page']
  priceEventsPageSize: CoverageProps['pageSize']
  priceEventsTotal: CoverageProps['total']
  onPriceEventsPageChange: CoverageProps['onPageChange']
  onPriceEventsPageSizeChange: CoverageProps['onPageSizeChange']
  onAddPrice: NonNullable<CoverageProps['onAddPrice']>
}

export const PricesTabContent = ({
  submissions,
  onApproveSubmission,
  onDenySubmission,
  priceEvents,
  priceEventsLoading,
  pricesMissingOnly,
  onTogglePriceFilter,
  priceEventsPage,
  priceEventsPageSize,
  priceEventsTotal,
  onPriceEventsPageChange,
  onPriceEventsPageSizeChange,
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
      onToggleFilter={onTogglePriceFilter}
      page={priceEventsPage}
      pageSize={priceEventsPageSize}
      total={priceEventsTotal}
      onPageChange={onPriceEventsPageChange}
      onPageSizeChange={onPriceEventsPageSizeChange}
    />
  </div>
)
