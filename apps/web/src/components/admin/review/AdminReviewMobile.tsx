'use client';

import {
  AllEventsTabContent,
  type AllEventsApi,
} from './_tabs/AllEventsTabContent';
import { EMPTY_FILTERS, type AllEventsFilters } from './all/filters';
import { type AllEvent } from './all/types';

interface AdminReviewMobileProps {
  onAllEventsRowClick?: (id: string) => void;
  allEventsFilters?: AllEventsFilters;
  onAllEventsFiltersChange?: (next: AllEventsFilters) => void;
  allEventsPagination?: { page: number; pageSize: number };
  onAllEventsPaginationChange?: (next: {
    page: number;
    pageSize: number;
  }) => void;
  allEventsApi?: AllEventsApi;
  onAllEventsEdit?: (event: AllEvent) => void;
  onAllEventsViewDetail?: (event: AllEvent) => void;
}

/**
 * The phone shell for Review. All events is the only tab left (the price
 * tabs live on /admin/prices), so there is no tab switcher.
 */
export function AdminReviewMobile({
  onAllEventsRowClick,
  allEventsFilters,
  onAllEventsFiltersChange,
  allEventsPagination,
  onAllEventsPaginationChange,
  allEventsApi,
  onAllEventsEdit,
  onAllEventsViewDetail,
}: AdminReviewMobileProps) {
  const noopRowClick = (_id: string): void => undefined;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: 16,
      }}
    >
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <AllEventsTabContent
          isDesktop={false}
          onRowClick={onAllEventsRowClick ?? noopRowClick}
          filters={allEventsFilters ?? EMPTY_FILTERS}
          onFiltersChange={onAllEventsFiltersChange ?? (() => undefined)}
          {...(allEventsPagination ? { pagination: allEventsPagination } : {})}
          {...(onAllEventsPaginationChange
            ? { onPaginationChange: onAllEventsPaginationChange }
            : {})}
          {...(allEventsApi ? { api: allEventsApi } : {})}
          {...(onAllEventsEdit ? { onEdit: onAllEventsEdit } : {})}
          {...(onAllEventsViewDetail
            ? { onViewDetail: onAllEventsViewDetail }
            : {})}
        />
      </div>
    </div>
  );
}
