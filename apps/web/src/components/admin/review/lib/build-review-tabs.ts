import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { type ReviewTabDescriptor } from '../ReviewTabs';

/**
 * Review keeps one tab, all events. The decision tabs moved to Needs you
 * (2b) and the price tabs to Prices (4d).
 */
export const buildReviewTabs = (): ReadonlyArray<ReviewTabDescriptor> => [
  { key: 'all-events', label: ADMIN_COPY.review.tabs.allEvents },
];
