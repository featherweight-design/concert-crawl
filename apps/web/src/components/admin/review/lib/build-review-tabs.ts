import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { type ReviewCounts } from '@/lib/queries/use-admin-review'
import { type ReviewTabDescriptor } from '../ReviewTabs'

/**
 * Counts are intentionally omitted from `prices` and `missing` (#1079). Price
 * coverage has no accurate server count — `priceEventsTotal` swings with the
 * missing-only toggle — and Missing counts `firstMissingAt IS NOT NULL`, which
 * reads as inaccurate against what the label implies.
 *
 * `counts.prices` counts pending submissions, so post-split it belongs to the
 * Submissions pill, where the number and the label finally describe the same
 * thing. No counts field may appear on two tabs: the sidebar Review badge sums
 * them, and a double-count would make the pills disagree with the badge.
 */
export const buildReviewTabs = (
  counts: ReviewCounts,
): ReadonlyArray<ReviewTabDescriptor> => [
  {
    key: 'event-flags',
    label: ADMIN_COPY.review.tabs.eventFlags,
    count: counts.eventFlags,
    kind: 'warning',
  },
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
  {
    key: 'missing',
    label: ADMIN_COPY.review.tabs.missing,
    kind: 'danger',
  },
  { key: 'all-events', label: ADMIN_COPY.review.tabs.allEvents },
  {
    key: 'contests',
    label: ADMIN_COPY.review.tabs.contests,
    count: counts.priceContests,
    kind: 'warning',
  },
]
