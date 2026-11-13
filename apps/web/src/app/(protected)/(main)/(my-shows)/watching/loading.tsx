// The Watching route fallback (B+ rule 9, `06-states/bp-s-load_watching_m`):
// the sub-tab bar renders for real, then the headline and carded rows as
// `SkeletonBlock`s with neutral left edges.

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
      {/* The column and the real sub-tab bar are the My shows layout's. */}
      <main className="w-full flex-1">
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
