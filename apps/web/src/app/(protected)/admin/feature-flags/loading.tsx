import { FeatureFlagsSkeleton } from '@/components/admin/feature-flags/FeatureFlagsSkeleton';

/**
 * `07/loading-feature-flags`: the title, then the flags card's rows. The
 * board's rows have no leading tile and end on a pill and a short bar, which
 * PageSkeleton's card rows don't draw, so the page has its own skeleton.
 */
export default function AdminFeatureFlagsLoading() {
  return <FeatureFlagsSkeleton />;
}
