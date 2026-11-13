// The Concerts route fallback (B+ rule 9, `06-states/bp-s-load_concerts_m`):
// the sub-tab bar renders for real, then the two-by-three stats, a month
// heading and carded rows whose right column is the round venue stamp.

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
      {/* The column and the real sub-tab bar are the My shows layout's. */}
      <main className="w-full flex-1">
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
