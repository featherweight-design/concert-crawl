import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';

const VENUES_INDEX_COPY = CONSUMER_COPY.venuesIndex;

/** Pill widths for the three filter buttons (Sort, Capacity, Distance). */
const FILTER_PILL_WIDTHS = [176, 128, 128] as const;
const ROW_COUNT = 6;

function VenueRowSkeleton() {
  return (
    <div
      data-testid="venue-row-skeleton"
      className="flex items-center gap-3.5 rounded-[14px] border border-border bg-surface-1 py-3 pl-3 pr-4 lg:gap-5 lg:py-3.5 lg:pl-3.5 lg:pr-5"
    >
      <span className="shrink-0 lg:hidden">
        <SkeletonBlock width={56} height={56} radius={13} />
      </span>
      <span className="hidden shrink-0 lg:block">
        <SkeletonBlock width={64} height={64} radius={15} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <SkeletonBlock width="58%" height={16} />
        <SkeletonBlock width="36%" height={10} />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <SkeletonBlock width={36} height={9} />
        <SkeletonBlock width={28} height={18} />
      </div>
    </div>
  );
}

/**
 * Route fallback for /venues (B+ rule 9): the heading and the shape of the
 * filter bar render at once, and only the data areas are skeletons. The sheen
 * is SkeletonBlock's, which holds still under reduced motion.
 */
export default function VenuesLoading() {
  return (
    <div
      aria-busy="true"
      className="mx-auto w-full max-w-[1120px] px-[18px] pb-24 pt-4 sm:px-8 sm:pt-[48px]"
    >
      <div className="mb-[18px] flex flex-wrap items-baseline gap-[10px] sm:gap-[14px]">
        <h1
          className="m-0 bg-clip-text text-[28px] font-extrabold text-transparent sm:text-[40px] [letter-spacing:-0.03em] sm:[letter-spacing:-0.035em]"
          style={{
            backgroundImage:
              'linear-gradient(90deg, var(--signal), var(--accent))',
          }}
        >
          {VENUES_INDEX_COPY.pageHeading}
        </h1>
        <SkeletonBlock width={92} height={12} />
      </div>

      <div className="mb-7 flex gap-2 overflow-hidden">
        {FILTER_PILL_WIDTHS.map((width, idx) => (
          <span key={idx} className="shrink-0">
            <SkeletonBlock width={width} height={36} radius={999} />
          </span>
        ))}
      </div>

      {/* Flagship card */}
      <div className="mb-[18px] overflow-hidden rounded-[14px] border border-border bg-surface-1 lg:mb-8 lg:grid lg:grid-cols-[360px_1fr]">
        <div className="h-[180px] lg:h-[240px]">
          <SkeletonBlock height="100%" radius={0} />
        </div>
        <div className="flex flex-col gap-3 p-4 lg:px-7 lg:py-6">
          <SkeletonBlock width={88} height={18} />
          <SkeletonBlock width="70%" height={28} />
          <SkeletonBlock width="40%" height={11} />
          <div className="mt-3 flex gap-6 border-t border-border pt-4 lg:gap-10">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="flex flex-col gap-1.5">
                <SkeletonBlock width={56} height={9} />
                <SkeletonBlock width={48} height={20} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {Array.from({ length: ROW_COUNT }, (_, idx) => (
          <VenueRowSkeleton key={idx} />
        ))}
      </div>
    </div>
  );
}
