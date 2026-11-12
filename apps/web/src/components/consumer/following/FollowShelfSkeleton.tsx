import {
  SHELF_CARD_BOX_CLASS,
  SHELF_RAIL_GAP_CLASS,
} from '@/components/consumer/definitions/constants';
import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';
import { shelfCardFrame } from './lib/shelf-card-frame';

// The Coming to Denver shelf in waiting (B+ `load_browse_m`, `load_browse_d`):
// an eyebrow bar and a title bar (plus the body in zero mode) in ShelfHead's
// own line boxes, then tall cards with the art block on top
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

// ShelfHead's eyebrow and title inherit preflight's base line height.
const INHERITED_LINE_HEIGHT = 1.5;

// One of ShelfHead's text lines as an empty line box: the live line's height
// (font size times line height), with the bar centred in it.
const HeadLine = ({
  fontSize,
  lineHeight = INHERITED_LINE_HEIGHT,
  width,
  barHeight,
  className = '',
}: {
  fontSize: number;
  lineHeight?: number;
  width: number | string;
  barHeight: number;
  className?: string;
}) => (
  <div
    data-testid="follow-shelf-skeleton-line"
    className={`flex items-center ${className}`}
    style={{ height: fontSize * lineHeight }}
  >
    <SkeletonBlock width={width} height={barHeight} radius={barHeight / 2} />
  </div>
);

interface FollowShelfSkeletonProps {
  /** The zero (starter) shelf's head carries a body line under the title. */
  withBody?: boolean;
}

export const FollowShelfSkeleton = ({
  withBody = false,
}: FollowShelfSkeletonProps) => (
  <section
    aria-hidden="true"
    data-testid="follow-shelf-skeleton"
    className="mb-5 pt-1.5"
  >
    {/* ShelfHead's boxes: a 10px eyebrow line, a 5px gap, a 15.5px h2 line,
        and in zero mode a 12.5px body line at 1.45 (two lines at phone
        width, where the starter body wraps). */}
    <div className="mb-[11px] flex flex-col gap-[5px]">
      <HeadLine fontSize={10} width={120} barHeight={9} />
      <HeadLine fontSize={15.5} width={150} barHeight={14} />
      {withBody && (
        <div data-testid="follow-shelf-skeleton-body">
          <HeadLine
            fontSize={12.5}
            lineHeight={1.45}
            width="92%"
            barHeight={10}
          />
          <HeadLine
            fontSize={12.5}
            lineHeight={1.45}
            width="60%"
            barHeight={10}
            className="sm:hidden"
          />
        </div>
      )}
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
