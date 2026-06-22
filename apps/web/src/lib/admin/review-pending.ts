import type { ReviewCounts } from '@/lib/queries/use-admin-review'

// Pending count drives the "X pending" header pill on /admin/review and
// the mobile subtitle. Includes every triage tab — Event Flags
// (verified=false), Prices (community submissions awaiting moderation),
// and Missing (stale-crawl events needing a postpone/cancel/dismiss
// decision). All three are work items the admin needs to act on, so
// they share the "pending" semantic (#711).
export const computePendingCount = (counts: ReviewCounts): number =>
  counts.eventFlags + counts.prices + counts.missing
