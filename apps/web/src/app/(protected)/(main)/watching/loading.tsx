// The Watching route fallback (B+ rule 9, `06-states/bp-s-load_watching_m`):
// the sub-tab bar renders for real, then the headline and carded rows as
// `SkeletonBlock`s with neutral left edges.

import { MyShowsTabs } from '@/components/consumer/history/MyShowsTabs';
import {
  MyShowsGroupSkeleton,
  MyShowsHeadlineSkeleton,
  MyShowsRowSkeleton,
} from '@/components/consumer/history/MyShowsSkeleton';
import { NavProgress } from '@/components/consumer/history/NavProgress';

export default function WatchingLoading() {
  return (
    <>
      <NavProgress />
      {/* Matches WatchingContent's main container. */}
      <main className="mx-auto w-full max-w-[880px] flex-1 px-4 pb-20 pt-4 sm:px-8 sm:pb-10 sm:pt-8">
        <MyShowsTabs active="watching" />
        <MyShowsHeadlineSkeleton />
        <MyShowsGroupSkeleton />
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 4 }).map((_, idx) => (
            <MyShowsRowSkeleton key={idx} trailing="pill" />
          ))}
        </div>
      </main>
    </>
  );
}
