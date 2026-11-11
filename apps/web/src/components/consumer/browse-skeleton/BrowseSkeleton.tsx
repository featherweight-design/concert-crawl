import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { PinkWave } from '@/components/consumer/pink-wave/PinkWave';
import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';

const copy = CONSUMER_COPY;

/**
 * One carded Browse row in waiting (B+ rule 9): the EventRow card's shape and
 * padding, with a neutral left edge where a show's genre color will go.
 */
export const BrowseRowSkeleton = () => (
  <div
    data-testid="browse-row-skeleton"
    className="flex items-center gap-3.5 rounded-xl border border-border bg-surface-1"
    style={{
      padding: '13px 12px 13px 14px',
      borderLeftWidth: 2,
      borderLeftColor: 'var(--border-strong)',
      minHeight: 82,
    }}
  >
    <SkeletonBlock width={56} height={56} radius={10} />
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <SkeletonBlock width="62%" height={14} radius={6} />
      <SkeletonBlock width="44%" height={10} radius={5} />
      <SkeletonBlock width="30%" height={16} radius={6} />
    </div>
    <SkeletonBlock width={34} height={14} radius={7} />
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

/**
 * Browse's page chrome, drawn for real while the data loads (rule 9): the
 * eyebrow and title render as text, and only the live controls, which can't
 * work yet, hold their shapes as skeletons.
 */
const ChromeSkeleton = () => (
  <div className="mb-5 flex flex-col gap-3">
    <div className="flex items-end justify-between gap-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span
          className="text-[10px] uppercase text-fg-muted"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
        >
          {copy.filterBar.locationLine}
        </span>
        <span
          className="truncate text-[28px] font-black leading-none text-fg"
          style={{ letterSpacing: '-0.03em' }}
        >
          {copy.filterBar.headingTitle}
        </span>
      </div>
      <SkeletonBlock width={84} height={40} radius={10} />
    </div>
    {/* Phone: the Filters and My artists pills. Desktop: the filter bar. */}
    <div className="flex gap-2 sm:hidden">
      <SkeletonBlock width={112} height={44} radius={999} />
      <SkeletonBlock width={132} height={44} radius={999} />
    </div>
    <div className="hidden sm:block">
      <SkeletonBlock height={66} radius={16} />
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
  <div aria-busy="true">
    <ChromeSkeleton />
    <HeroSkeleton />
    <div className="mb-3 flex items-center justify-between gap-3">
      <SkeletonBlock width={120} height={22} radius={8} />
      <div role="status" className="flex shrink-0 items-center gap-3">
        <span
          className="uppercase text-fg-muted"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.16em',
          }}
        >
          {copy.loadingShows}
        </span>
        <PinkWave scale="sm" />
      </div>
    </div>
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: rows }).map((_, idx) => (
        <BrowseRowSkeleton key={idx} />
      ))}
    </div>
  </div>
);
