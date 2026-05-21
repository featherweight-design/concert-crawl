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
          gap: 5,
        }}
      >
        {/* Artist name */}
        <div
          style={{
            height: 14,
            width: '58%',
            borderRadius: 4,
            background: 'var(--surface-2)',
          }}
        />
        {/* Subtitle */}
        <div
          style={{
            height: 11,
            width: '42%',
            borderRadius: 4,
            background: 'var(--surface-2)',
          }}
        />
        {/* Venue / time */}
        <div
          style={{
            height: 10,
            width: '35%',
            borderRadius: 3,
            background: 'var(--surface-2)',
          }}
        />
      </div>
      {/* Watch button placeholder */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'var(--surface-2)',
          flexShrink: 0,
        }}
      />
    </div>
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
        {/* FilterBar skeleton */}
        <div className="mb-5 flex gap-2 overflow-hidden">
          {[80, 72, 96, 88].map((width, idx) => (
            <div
              key={idx}
              style={{
                width,
                height: 34,
                borderRadius: 8,
                background: 'var(--surface-2)',
                flexShrink: 0,
                animation: `skeletonPulse 1.4s ease-in-out ${idx * 0.1}s infinite`,
              }}
            />
          ))}
        </div>
        {/* Event card skeletons */}
        <div className="flex flex-col">
          {Array.from({ length: 6 }).map((_, idx) => (
            <EventCardSkeleton key={idx} delay={idx * 0.07} />
          ))}
        </div>
      </main>
    </>
  )
}
