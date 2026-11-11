import { BackChip } from '@/components/consumer/back-chip/BackChip';
import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';

const UPCOMING_ROW_COUNT = 4;

function VenueEventRowSkeleton() {
  return (
    <div
      data-testid="venue-event-row-skeleton"
      className="flex items-center gap-3.5 rounded-[12px] border border-border bg-surface-1 py-[13px] pl-3.5 pr-3"
      style={{ borderLeftWidth: 2 }}
    >
      <SkeletonBlock width={56} height={56} radius={10} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <SkeletonBlock width="55%" height={14} />
        <SkeletonBlock width="32%" height={10} />
      </div>
    </div>
  );
}

/**
 * Route fallback for a venue page (B+ `bp-s-load_venue_m`, rule 9). The back
 * chip renders at once; the hero holds the glyph's place, and the header,
 * stats, About and the first card are skeletons in the page's own shapes. The
 * sheen is SkeletonBlock's, which holds still under reduced motion.
 */
export default function VenueLoading() {
  return (
    <div aria-busy="true">
      {/* Hero: 380px on a phone, as the page */}
      <div className="relative flex h-[380px] w-full shrink-0 items-center justify-center sm:h-[400px] sm:justify-end sm:pr-[14%]">
        <div data-testid="venue-hero-skeleton">
          <SkeletonBlock width={140} height={140} radius={36} />
        </div>
        <BackChip top={56} fallbackHref="/events" />
      </div>

      <div className="relative -mt-10 flex-1 pb-24 sm:pb-10">
        <div className="mx-auto flex w-full max-w-[880px] flex-col px-[18px] sm:px-8">
          <SkeletonBlock width={80} height={20} />
          <div className="mt-3">
            <SkeletonBlock width="66%" height={34} radius={8} />
          </div>
          <div className="mt-3">
            <SkeletonBlock width={140} height={10} />
          </div>

          {/* Stats row */}
          <div className="mt-5 flex gap-4 border-y border-border py-4">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="flex flex-1 flex-col gap-2">
                <SkeletonBlock width={50} height={8} />
                <SkeletonBlock width={60} height={18} />
              </div>
            ))}
          </div>

          {/* About */}
          <div className="mt-5 flex flex-col gap-2.5">
            <SkeletonBlock height={11} />
            <SkeletonBlock width="92%" height={11} />
            <SkeletonBlock width="60%" height={11} />
          </div>

          {/* First-timer callout */}
          <div className="mt-6">
            <SkeletonBlock height={70} radius={14} />
          </div>

          {/* Upcoming */}
          <div className="mt-8 flex flex-col gap-2">
            {Array.from({ length: UPCOMING_ROW_COUNT }, (_, idx) => (
              <VenueEventRowSkeleton key={idx} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
