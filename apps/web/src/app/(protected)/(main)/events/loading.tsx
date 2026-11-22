import { auth } from '@clerk/nextjs/server';
import {
  BrowseSkeleton,
  ShelfSlotSkeletonGate,
} from '@/components/consumer/browse-skeleton';
import { FollowShelfSkeleton } from '@/components/consumer/following/FollowShelfSkeleton';

// Safe to make this fallback dynamic: the route is already `force-dynamic`
// (page.tsx), so its loading boundary is server-rendered at <Link> prefetch
// time rather than prebuilt. auth() is read so a signed-out visitor's shelf
// skeleton carries the body line their starter shelf has.
export default async function EventsLoading() {
  const { userId } = await auth();

  return (
    // overflow-x-clip mirrors page.tsx — the shelf skeleton's card row is
    // full-bleed (-mx-4) on mobile, and the browse page's horizontal overflow
    // regression (#33) came from exactly that row.
    // 1088 mirrors page.tsx: the B+ 1040 column plus its gutters.
    <main className="mx-auto w-full max-w-[1088px] flex-1 overflow-x-clip px-4 pb-20 pt-4 lg:px-6 lg:pb-6">
      {/* The follow shelf holds the slot for every list view the server can
          answer for. The slot only exists in the list view with no crew lens
          (isShelfSlotOpen), which only the URL can tell. A signed-out visitor
          provably follows nobody, so their shelf is the zero (starter) one,
          with its body line. */}
      <ShelfSlotSkeletonGate>
        <FollowShelfSkeleton withBody={userId === null} />
      </ShelfSlotSkeletonGate>
      {/* B+ first load: chrome as text, data as skeletons, and the pink wave
          beside "Loading shows" in place of the old top progress bar. */}
      <BrowseSkeleton />
    </main>
  );
}
