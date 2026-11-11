// The Concerts route fallback (B+ rule 9, `06-states/bp-s-load_concerts_m`):
// the sub-tab bar renders for real, then the two-by-three stats, a month
// heading and carded rows whose right column is the round venue stamp.

import { MyShowsTabs } from '@/components/consumer/history/MyShowsTabs';
import {
  MyShowsGroupSkeleton,
  MyShowsRowSkeleton,
  MyShowsStatsSkeleton,
} from '@/components/consumer/history/MyShowsSkeleton';
import { NavProgress } from '@/components/consumer/history/NavProgress';

export default function HistoryLoading() {
  return (
    <>
      <NavProgress />
      {/* Matches HistoryContent's Shell. */}
      <main className="mx-auto w-full max-w-[880px] flex-1 px-4 pb-20 pt-4 sm:px-8 sm:pb-10 sm:pt-8 lg:max-w-[960px]">
        <MyShowsTabs active="history" />
        <MyShowsStatsSkeleton />
        <MyShowsGroupSkeleton />
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 4 }).map((_, idx) => (
            <MyShowsRowSkeleton key={idx} trailing="stamp" />
          ))}
        </div>
      </main>
    </>
  );
}
