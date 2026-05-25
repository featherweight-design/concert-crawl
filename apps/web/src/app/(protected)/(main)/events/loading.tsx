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

export default function EventsLoading() {
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-4 sm:px-6 sm:pb-6">
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
