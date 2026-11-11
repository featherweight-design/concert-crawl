// The Artists route fallback (B+ rule 9, `06-states/bp-s-load_artists_m`):
// the sub-tab bar renders for real, then the header, the group heading and six
// carded rows, the last two fading out as the board draws them.

import { MyShowsTabs } from '@/components/consumer/history/MyShowsTabs';
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
      {/* Matches MyShowsArtistsContent's mobile and desktop columns. */}
      <main className="mx-auto w-full max-w-[940px] flex-1 px-4 pb-20 pt-4 sm:px-[30px] sm:pb-10 sm:pt-7">
        <MyShowsTabs active="artists" />
        <MyShowsHeadlineSkeleton />
        <MyShowsGroupSkeleton />
        <div className="flex flex-col gap-2.5 sm:grid sm:grid-cols-2 sm:gap-3">
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
