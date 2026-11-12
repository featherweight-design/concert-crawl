import {
  SHELF_CARD_BOX_CLASS,
  SHELF_RAIL_GAP_CLASS,
} from '@/components/consumer/definitions/constants';
import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';
import { shelfCardFrame } from './lib/shelf-card-frame';

// The Coming to Denver shelf in waiting (B+ `load_browse_m`, `load_browse_d`):
// an eyebrow bar and a title bar, then tall cards with the art block on top
// and two text bars under it. Three show at phone width (the third cut by the
// edge) and five from sm, the live shelf's footprint, so nothing below moves
// when the page lands. No hooks and no 'use client': Browse's route fallback
// is a server component.

const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <li
    data-testid="follow-shelf-skeleton-card"
    className={`flex shrink-0 flex-col overflow-hidden rounded-[14px] ${SHELF_CARD_BOX_CLASS} ${className}`}
    style={{ listStyle: 'none', ...shelfCardFrame(null) }}
  >
    <div className="flex-1" style={{ background: 'var(--surface-2)' }} />
    <div
      className="flex shrink-0 flex-col"
      style={{ padding: '12px 11px 14px', gap: 8 }}
    >
      <SkeletonBlock width="70%" height={14} radius={7} />
      <SkeletonBlock width="46%" height={9} radius={5} />
    </div>
  </li>
);

export const FollowShelfSkeleton = () => (
  <section
    aria-hidden="true"
    data-testid="follow-shelf-skeleton"
    className="mb-5 pt-1.5"
  >
    <div className="mb-[11px] flex flex-col gap-[7px]">
      <SkeletonBlock width={120} height={9} radius={5} />
      <SkeletonBlock width={150} height={14} radius={7} />
    </div>
    {/* Full bleed on the phone, as the live rail is. The page's
        overflow-x-clip holds the cut-off card in. */}
    <ul
      className={`-mx-4 flex list-none overflow-hidden px-4 py-3 sm:mx-0 sm:px-0 ${SHELF_RAIL_GAP_CLASS}`}
    >
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard className="hidden sm:flex" />
      <SkeletonCard className="hidden sm:flex" />
    </ul>
  </section>
);
