import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { type ReviewCounts } from '@/lib/queries/use-admin-review';
import { type ReviewTabDescriptor } from '../ReviewTabs';

/**
 * Review keeps three tabs: price coverage, submissions and all events. The
 * decision tabs moved to Needs you (2b).
 *
 * Counts are intentionally omitted from `prices` (#1079). Price coverage has
 * no accurate server count — `priceEventsTotal` swings with the missing-only
 * toggle.
 *
 * `counts.prices` counts pending submissions, so post-split it belongs to the
 * Submissions pill, where the number and the label finally describe the same
 * thing. No counts field may appear on two tabs.
 */
export const buildReviewTabs = (
  counts: ReviewCounts,
): ReadonlyArray<ReviewTabDescriptor> => [
  {
    key: 'prices',
    label: ADMIN_COPY.review.tabs.prices,
    kind: 'signal',
  },
  {
    key: 'submissions',
    label: ADMIN_COPY.review.tabs.submissions,
    count: counts.prices,
    kind: 'signal',
  },
  { key: 'all-events', label: ADMIN_COPY.review.tabs.allEvents },
];
