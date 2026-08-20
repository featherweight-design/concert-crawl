'use client'

import { type ComponentProps } from 'react'
import { PriceCoverageTable } from '../PriceCoverageTable'

type CoverageProps = ComponentProps<typeof PriceCoverageTable>

export interface PricesTabContentProps {
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
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
