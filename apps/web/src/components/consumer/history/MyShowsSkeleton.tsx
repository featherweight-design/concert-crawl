// The My shows loading pieces (B+ rule 9, `06-states/bp-s-load_watching_m`,
// `bp-s-load_concerts_m`, `bp-s-load_artists_m`).
//
// The page chrome (the sub-tab bar) renders for real in each route fallback;
// only the data is a skeleton. Every block is a `SkeletonBlock`, so the sweep
// rides the one shared overlay and holds still under reduced motion. No hooks
// and no 'use client', so the route `loading.tsx` files can render these.

import { SkeletonBlock } from '@/components/consumer/skeleton/SkeletonBlock';
import {
  HISTORY_DENSITY,
  HISTORY_DENSITY_CONFIG,
} from './definitions/constants';

/** What sits in a row's right column: a price or follow pill, or a stamp. */
export type SkeletonTrailing = 'pill' | 'stamp';

/** The Watching and Artists card geometry: EventRow's carded row at 56px art. */
const PILL_ROW = {
  artSize: 56,
  padding: '13px 12px 13px 14px',
  gap: 14,
} as const;

/**
 * The Concerts row is a HistoryItem, so its skeleton reads the live geometry
 * at the density the route renders: the art, the padding and the stamp slot
 * can never drift from the row they stand in for.
 */
const STAMP_ROW = HISTORY_DENSITY_CONFIG[HISTORY_DENSITY];

/**
 * One carded row: the same card shape as the live rows, with a neutral left
 * edge in place of the genre colour. `fade` dims the tail of a long list, as
 * the Artists board draws it.
 */
export const MyShowsRowSkeleton = ({
  trailing,
  fade = 1,
}: {
  trailing: SkeletonTrailing;
  fade?: number;
}) => {
  const stamp = trailing === 'stamp';
  const artSize = stamp ? STAMP_ROW.artSize : PILL_ROW.artSize;
  return (
    <div
      data-testid="my-shows-row-skeleton"
      data-trailing={trailing}
      className="flex items-center rounded-xl border border-border bg-surface-1"
      style={{
        gap: stamp ? STAMP_ROW.gap : PILL_ROW.gap,
        padding: stamp
          ? `${STAMP_ROW.padY}px ${STAMP_ROW.padR}px ${STAMP_ROW.padY}px ${STAMP_ROW.padL}px`
          : PILL_ROW.padding,
        borderLeftWidth: 2,
        borderLeftColor: 'var(--border-strong)',
        opacity: fade,
      }}
    >
      <span data-testid="my-shows-row-skeleton-art" className="shrink-0">
        <SkeletonBlock width={artSize} height={artSize} radius={8} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col" style={{ gap: 8 }}>
        <SkeletonBlock width="55%" height={13} radius={6} />
        <SkeletonBlock width="75%" height={10} radius={5} />
      </span>
      <span data-testid="my-shows-row-skeleton-trailing" className="shrink-0">
        {stamp ? (
          <SkeletonBlock
            width={STAMP_ROW.stampSize}
            height={STAMP_ROW.stampSize}
            radius="50%"
          />
        ) : (
          <SkeletonBlock width={40} height={18} radius={7} />
        )}
      </span>
    </div>
  );
};

/** The mono eyebrow bar plus the big headline bar, over the header divider. */
export const MyShowsHeadlineSkeleton = () => (
  <div
    data-testid="my-shows-headline-skeleton"
    className="mb-5 flex flex-col gap-3 border-b border-border pb-4 lg:mb-6 lg:pb-5"
  >
    <SkeletonBlock width={60} height={8} radius={4} />
    <SkeletonBlock width="min(190px, 55%)" height={34} radius={8} />
  </div>
);

/** The Concerts stats: two rows of three value-over-label tiles. */
export const MyShowsStatsSkeleton = () => (
  <div
    data-testid="my-shows-stats-skeleton"
    className="mb-5 grid grid-cols-3 gap-x-5 gap-y-6 border-b border-border pb-5 lg:mb-6"
  >
    {Array.from({ length: 6 }).map((_, idx) => (
      <span key={idx} className="flex flex-col gap-2">
        <SkeletonBlock width={50} height={22} radius={6} />
        <SkeletonBlock width={40} height={8} radius={4} />
      </span>
    ))}
  </div>
);

/** A group or month heading. */
export const MyShowsGroupSkeleton = () => (
  <div style={{ padding: '4px 0 12px' }}>
    <SkeletonBlock width={90} height={10} radius={5} />
  </div>
);

/** The fade the Artists board gives its last two rows. */
export const rowFadeFor = (index: number, count: number): number => {
  const fromEnd = count - 1 - index;
  if (fromEnd === 0) return 0.4;
  if (fromEnd === 1) return 0.7;
  return 1;
};
