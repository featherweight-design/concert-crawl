// Mirrors WatchingLoading, adjusted for History's shape: a sub-tab bar, a stat
// hero instead of a headline block, and rows whose right column is a 28px stamp.

function HistoryRowSkeleton({ delay }: { delay: number }) {
  return (
    // Matches HistoryItem cozy density: artSize 56, padY 14, padL 14, padR 16, gap 14
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '56px 1fr auto',
        gap: 14,
        alignItems: 'center',
        padding: '14px 16px',
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        animation: `skeletonPulse 1.4s ease-in-out ${delay}s infinite`,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 8,
          background: 'var(--surface-2)',
          flexShrink: 0,
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          minWidth: 0,
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
            height: 11,
            width: '48%',
            borderRadius: 3,
            background: 'var(--surface-2)',
          }}
        />
      </div>
      {/* Stub stamp column — 28px to match cozy */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: 'var(--surface-2)',
          flexShrink: 0,
        }}
      />
    </div>
  )
}

function StatTileSkeleton({ delay }: { delay: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          height: 28,
          width: 44,
          borderRadius: 5,
          background: 'var(--surface-2)',
          animation: `skeletonPulse 1.4s ease-in-out ${delay}s infinite`,
        }}
      />
      <div
        style={{
          height: 10,
          width: 52,
          borderRadius: 3,
          background: 'var(--surface-2)',
          animation: `skeletonPulse 1.4s ease-in-out ${delay}s infinite`,
        }}
      />
    </div>
  )
}

export default function HistoryLoading() {
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
      <main className="mx-auto w-full max-w-[880px] flex-1 px-4 pb-20 pt-4 sm:px-8 sm:pb-10 sm:pt-8 lg:max-w-[960px]">
        {/* Sub-tab bar */}
        <div
          className="mb-4 sm:mb-6"
          style={{
            height: 44,
            borderRadius: 10,
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            animation: 'skeletonPulse 1.4s ease-in-out infinite',
          }}
        />

        {/* Stat hero */}
        <div className="mb-5 border-b border-border pb-4 sm:mb-6 sm:pb-5">
          <div
            style={{
              height: 10,
              width: 96,
              borderRadius: 3,
              background: 'var(--surface-2)',
              marginBottom: 14,
              animation: 'skeletonPulse 1.4s ease-in-out 0.06s infinite',
            }}
          />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <StatTileSkeleton key={idx} delay={0.1 + idx * 0.06} />
            ))}
          </div>
        </div>

        {/* Month bucket header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
            padding: '10px 4px 6px',
          }}
        >
          <div
            style={{
              height: 10,
              width: 72,
              borderRadius: 3,
              background: 'var(--surface-2)',
              animation: 'skeletonPulse 1.4s ease-in-out 0.28s infinite',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <HistoryRowSkeleton key={idx} delay={0.3 + idx * 0.08} />
          ))}
        </div>
      </main>
    </>
  )
}
