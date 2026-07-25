import { cookies } from 'next/headers'
import { auth } from '@clerk/nextjs/server'
import { DiscoveryShelfSkeleton } from '@/components/consumer/spotify/DiscoveryShelfSkeleton'
import { SHELF_HINT_COOKIE, shouldReserveShelf } from '@/lib/shelf-hint'

function EventCardSkeleton({ delay }: { delay: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 0',
        animation: `skeletonPulse 1.4s ease-in-out ${delay}s infinite`,
      }}
    >
      {/* Thumbnail — 48×48 */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 6,
          background: 'var(--surface-2)',
          flexShrink: 0,
        }}
      />
      {/* Info column */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {/* Artist name */}
        <div
          style={{
            height: 14,
            width: '52%',
            borderRadius: 4,
            background: 'var(--surface-2)',
          }}
        />
        {/* Venue / time */}
        <div
          style={{
            height: 10,
            width: '38%',
            borderRadius: 3,
            background: 'var(--surface-2)',
          }}
        />
        {/* Genre chips row */}
        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
          {[52, 44, 36].map((width, chipIdx) => (
            <div
              key={chipIdx}
              style={{
                height: 18,
                width,
                borderRadius: 20,
                background: 'var(--surface-2)',
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      </div>
      {/* Watch button — 28px icon on mobile, ~112px text pill on desktop */}
      <div
        className="w-7 sm:w-[112px]"
        style={{
          height: 28,
          borderRadius: 7,
          background: 'var(--surface-2)',
          flexShrink: 0,
        }}
      />
      {/* Price placeholder */}
      <div
        style={{
          width: 28,
          height: 14,
          borderRadius: 3,
          background: 'var(--surface-2)',
          flexShrink: 0,
          alignSelf: 'center',
        }}
      />
    </div>
  )
}

function DateGroupSkeleton({
  headerWidth,
  cardCount,
  baseDelay,
}: {
  headerWidth: number
  cardCount: number
  baseDelay: number
}) {
  return (
    <section>
      {/* Date header — mirrors EventsList: mb-1 flex items-baseline gap-2.5 px-4 pb-2 border-bottom */}
      <div
        className="mb-1 flex items-baseline gap-2.5 px-4 pb-2"
        style={{
          borderBottom: '1px solid var(--border)',
          animation: `skeletonPulse 1.4s ease-in-out ${baseDelay}s infinite`,
        }}
      >
        <div
          style={{
            height: 18,
            width: headerWidth,
            borderRadius: 4,
            background: 'var(--surface-2)',
            flexShrink: 0,
          }}
        />
        <div
          style={{
            height: 10,
            width: 52,
            borderRadius: 3,
            background: 'var(--surface-2)',
            flexShrink: 0,
          }}
        />
      </div>
      {/* Event cards */}
      <div>
        {Array.from({ length: cardCount }).map((_, cardIdx) => (
          <div key={cardIdx}>
            {cardIdx > 0 && (
              <div className="h-px bg-border" style={{ marginLeft: 58 }} />
            )}
            <EventCardSkeleton delay={baseDelay + 0.06 + cardIdx * 0.07} />
          </div>
        ))}
      </div>
    </section>
  )
}

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
  const [cookieStore, { userId }] = await Promise.all([cookies(), auth()])
  const reserveShelf = shouldReserveShelf(
    cookieStore.get(SHELF_HINT_COOKIE)?.value,
    userId,
  )

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: 2,
          background: 'var(--accent)',
          animation: 'navProgress 3s ease-out forwards',
          zIndex: 9999,
        }}
      />
      {/* overflow-x-clip mirrors page.tsx — the shelf skeleton's card row is
          full-bleed (-mx-4) on mobile, and the browse page's horizontal
          overflow regression (#33) came from exactly that row. */}
      <main className="mx-auto w-full max-w-5xl flex-1 overflow-x-clip px-4 pb-20 pt-4 sm:px-6 sm:pb-6">
        {reserveShelf && <DiscoveryShelfSkeleton />}

        {/* FilterBar skeleton — mirrors FilterBar's flex-col gap-3 */}
        <div className="relative mb-5 flex flex-col gap-3">
          {/* Heading row: title left, List/Cal toggle right */}
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-0.5">
              {/* "DENVER · THIS WEEK" eyebrow */}
              <div
                style={{
                  height: 10,
                  width: 90,
                  borderRadius: 3,
                  background: 'var(--surface-2)',
                  animation: 'skeletonPulse 1.4s ease-in-out infinite',
                }}
              />
              {/* "What's on?" h1 */}
              <div
                style={{
                  height: 28,
                  width: 155,
                  borderRadius: 5,
                  background: 'var(--surface-2)',
                  animation: 'skeletonPulse 1.4s ease-in-out 0.05s infinite',
                }}
              />
            </div>
            {/* List / Cal toggle */}
            <div
              style={{
                width: 96,
                height: 36,
                borderRadius: 8,
                background: 'var(--surface-2)',
                animation: 'skeletonPulse 1.4s ease-in-out 0.08s infinite',
              }}
            />
          </div>

          {/* Filter chips — h-9 (36px), rounded-full to match actual chips */}
          <div className="flex gap-2 overflow-hidden">
            {[98, 106, 104, 96].map((width, idx) => (
              <div
                key={idx}
                style={{
                  width,
                  height: 36,
                  borderRadius: 9999,
                  background: 'var(--surface-2)',
                  flexShrink: 0,
                  animation: `skeletonPulse 1.4s ease-in-out ${0.1 + idx * 0.05}s infinite`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Event list — 3 date groups matching EventsList structure */}
        <div className="flex flex-col gap-6">
          <DateGroupSkeleton headerWidth={85} cardCount={1} baseDelay={0.2} />
          <DateGroupSkeleton headerWidth={112} cardCount={3} baseDelay={0.34} />
          <DateGroupSkeleton headerWidth={100} cardCount={2} baseDelay={0.62} />
        </div>
      </main>
    </>
  )
}
