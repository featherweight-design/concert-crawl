// The Artists route fallback (B+ rule 9, `06-states/bp-s-load_artists_m`):
// the sub-tab bar renders for real, then the header, the group heading and six
// carded rows, the last two fading out as the board draws them.

import {
  MyShowsGroupSkeleton,
  MyShowsHeadlineSkeleton,
  MyShowsRowSkeleton,
  rowFadeFor,
} from '@/components/consumer/history/MyShowsSkeleton';
import { NavProgress } from '@/components/consumer/history/NavProgress';

const ROWS = 6;

export default function FollowingLoading() {
  return (
    <>
      <NavProgress />
      {/* The column and the real sub-tab bar are the My shows layout's. */}
      <main className="w-full flex-1">
        <MyShowsHeadlineSkeleton />
        <MyShowsGroupSkeleton />
        <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3">
          {Array.from({ length: ROWS }).map((_, idx) => (
            <MyShowsRowSkeleton
              key={idx}
              trailing="pill"
              fade={rowFadeFor(idx, ROWS)}
            />
          ))}
        </div>
      </main>
    </>
  );
}
