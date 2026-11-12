import { FilterBarPreview } from '@/components/consumer/filter-bar/chrome';
import { LoadingShowsStatus } from './LoadingShowsStatus';
import { PinkWave } from '@/components/consumer/pink-wave/PinkWave';
import { rowMin } from '@/components/consumer/event-row/definitions/row-min';
import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';

/**
 * One carded Browse row in waiting (B+ rule 9): the EventRow card's shape and
 * padding, with a neutral left edge where a show's genre color will go.
 */
export const BrowseRowSkeleton = () => (
  <div
    data-testid="browse-row-skeleton"
    className="rounded-xl border border-border bg-surface-1"
    style={{
      // EventRow's carded browse geometry at width (EventRow.tsx), so the
      // swap to real rows doesn't shift the list.
      padding: '13px 12px 13px 14px',
      borderLeftWidth: 2,
      borderLeftColor: 'var(--border-strong)',
    }}
  >
    <div
      className="flex items-center"
      style={{ gap: 14, minHeight: rowMin('browse', false) }}
    >
      <SkeletonBlock width={56} height={56} radius={10} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <SkeletonBlock width="62%" height={14} radius={6} />
        <SkeletonBlock width="44%" height={10} radius={5} />
        <SkeletonBlock width="30%" height={16} radius={6} />
      </div>
      <SkeletonBlock width={34} height={14} radius={7} />
    </div>
  </div>
);

/** The tonight spotlight's footprint: a square panel beside its text. */
const HeroSkeleton = () => (
  <div
    data-testid="browse-hero-skeleton"
    className="mb-6 flex items-center gap-3.5 rounded-[14px] border border-border bg-surface-1 p-3.5"
  >
    <SkeletonBlock width={112} height={112} radius={10} />
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <SkeletonBlock width={72} height={16} radius={5} />
      <SkeletonBlock width="78%" height={20} radius={6} />
      <SkeletonBlock width="50%" height={11} radius={5} />
    </div>
  </div>
);

interface BrowseSkeletonProps {
  /** Rows to hold below the loading line. */
  rows?: number;
}

/**
 * Browse's first load (B+ `load_browse_m`, `load_browse_d`). The pink wave
 * sits beside "Loading shows" (rule 10: Browse's first load is one of the
 * three places it appears). Under reduced motion the wave holds its still
 * frame and the skeleton sweep is hidden by the global guard.
 */
export const BrowseSkeleton = ({ rows = 4 }: BrowseSkeletonProps) => (
  <div>
    {/* The chrome renders as it looks live (rule 9; Hugh's audit ruling:
        match the mock), inert. It follows FilterBar through ./chrome, so the
        B6a/B6b filter bar restyle updates it there, not here. */}
    {/* On the phone the My artists chip stays off: the live chip renders
        nothing until its entitlement resolves, so drawing it here could show
        a chip that then vanishes. From sm up the preview draws the segmented
        bar as `load_browse_d` does, My artists and Who included. */}
    <div className="mb-5">
      <FilterBarPreview />
    </div>
    <HeroSkeleton />
    <div className="mb-3 flex items-center justify-between gap-3">
      <SkeletonBlock width={120} height={22} radius={8} />
      <div className="flex shrink-0 items-center gap-3">
        <LoadingShowsStatus />
        {/* load_browse_d ends the trail on the core alone: no halo rings. */}
        <PinkWave scale="sm" halo={false} />
      </div>
    </div>
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: rows }).map((_, idx) => (
        <BrowseRowSkeleton key={idx} />
      ))}
    </div>
  </div>
);
