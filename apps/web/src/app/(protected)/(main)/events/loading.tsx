import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { BrowseSkeleton } from '@/components/consumer/browse-skeleton';
import { DiscoveryShelfSkeleton } from '@/components/consumer/spotify/DiscoveryShelfSkeleton';
import { FollowShelfSkeleton } from '@/components/consumer/following/FollowShelfSkeleton';
import { SHELF_HINT_COOKIE, shouldReserveShelf } from '@/lib/shelf-hint';

// Reads the shelf hint cookie so the fallback reserves the "Based on your
// taste" shelf's footprint for viewers who actually get one — otherwise the
// shelf paints with the page and shoves the filter bar and list down. The
// hint is matched against the signed-in user so a shared browser doesn't
// reserve a premium slot for whoever signed in after the entitled account.
//
// Safe to make this fallback dynamic: the route is already `force-dynamic`
// (page.tsx), so its loading boundary is server-rendered at <Link> prefetch
// time (which sends cookies) rather than prebuilt, and Next re-uses a stale
// entry's loading boundary for up to 5 minutes. Reading a cookie here costs
// no extra round-trip and no delayed first paint.
export default async function EventsLoading() {
  const [cookieStore, { userId }] = await Promise.all([cookies(), auth()]);
  const reserveShelf = shouldReserveShelf(
    cookieStore.get(SHELF_HINT_COOKIE)?.value,
    userId,
  );

  return (
    // overflow-x-clip mirrors page.tsx — the shelf skeleton's card row is
    // full-bleed (-mx-4) on mobile, and the browse page's horizontal overflow
    // regression (#33) came from exactly that row.
    // 1088 mirrors page.tsx: the B+ 1040 column plus its gutters.
    <main className="mx-auto w-full max-w-[1088px] flex-1 overflow-x-clip px-4 pb-20 pt-4 sm:px-6 sm:pb-6">
      {/* One shelf slot, as on the page: the follow shelf holds it for every
          list view the server can answer for, and the Spotify taste shelf
          only when the follow seed comes back unknown, which the hint below
          is the only evidence of. */}
      {reserveShelf ? <DiscoveryShelfSkeleton /> : <FollowShelfSkeleton />}
      {/* B+ first load: chrome as text, data as skeletons, and the pink wave
          beside "Loading shows" in place of the old top progress bar. */}
      <BrowseSkeleton />
    </main>
  );
}
