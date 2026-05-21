function VenueEventRowSkeleton({ delay }: { delay: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        animation: `skeletonPulse 1.4s ease-in-out ${delay}s infinite`,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 6,
          background: 'var(--surface-2)',
          flexShrink: 0,
        }}
      />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div
          style={{
            height: 14,
            width: '55%',
            borderRadius: 4,
            background: 'var(--surface-2)',
          }}
        />
        <div
          style={{
            height: 10,
            width: '32%',
            borderRadius: 3,
            background: 'var(--surface-2)',
          }}
        />
      </div>
    </div>
  )
}

export default function VenueLoading() {
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

      {/* Hero — 320px full-bleed */}
      <div
        style={{
          width: '100%',
          height: 320,
          background: 'var(--surface-2)',
          flexShrink: 0,
          animation: 'skeletonPulse 1.4s ease-in-out infinite',
        }}
      />

      {/* Content column */}
      <div className="relative -mt-5 flex-1 pb-10">
        <div className="mx-auto w-full max-w-[880px] px-[18px] sm:px-8">
          {/* Venue name — h1 26px / weight 900 */}
          <div
            style={{
              height: 28,
              width: '48%',
              borderRadius: 6,
              background: 'var(--surface-2)',
              marginBottom: 10,
              animation: 'skeletonPulse 1.4s ease-in-out 0.1s infinite',
            }}
          />

          {/* City + Directions row */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <div
              style={{
                height: 11,
                width: 64,
                borderRadius: 3,
                background: 'var(--surface-2)',
                animation: 'skeletonPulse 1.4s ease-in-out 0.14s infinite',
              }}
            />
            <div
              style={{
                height: 11,
                width: 72,
                borderRadius: 3,
                background: 'var(--surface-2)',
                animation: 'skeletonPulse 1.4s ease-in-out 0.16s infinite',
              }}
            />
          </div>

          {/* Map placeholder */}
          <div
            style={{
              height: 160,
              borderRadius: 10,
              background: 'var(--surface-2)',
              marginBottom: 20,
              animation: 'skeletonPulse 1.4s ease-in-out 0.42s infinite',
            }}
          />

          {/* Section header — "Upcoming" + count */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 12,
              borderBottom: '1px solid var(--border)',
              paddingBottom: 8,
            }}
          >
            <div
              style={{
                height: 16,
                width: 88,
                borderRadius: 4,
                background: 'var(--surface-2)',
                animation: 'skeletonPulse 1.4s ease-in-out 0.48s infinite',
              }}
            />
            <div
              style={{
                height: 11,
                width: 52,
                borderRadius: 3,
                background: 'var(--surface-2)',
                animation: 'skeletonPulse 1.4s ease-in-out 0.5s infinite',
              }}
            />
          </div>

          {/* Event rows */}
          {Array.from({ length: 5 }).map((_, idx) => (
            <VenueEventRowSkeleton key={idx} delay={0.52 + idx * 0.07} />
          ))}
        </div>
      </div>
    </>
  )
}
