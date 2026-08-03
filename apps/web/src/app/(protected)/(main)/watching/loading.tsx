function WatchingCardSkeleton({ delay }: { delay: number }) {
  return (
    // Matches EventRow's watching surface: 56px art, 14px gap, p-3, and the
    // 36px action gutter the remove control sits in.
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '56px 1fr auto 36px',
        gap: 14,
        alignItems: 'flex-start',
        padding: 12,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        position: 'relative',
        animation: `skeletonPulse 1.4s ease-in-out ${delay}s infinite`,
      }}
    >
      {/* Art */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 8,
          background: 'var(--surface-2)',
          flexShrink: 0,
        }}
      />
      {/* Info */}
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
            width: '42%',
            borderRadius: 3,
            background: 'var(--surface-2)',
          }}
        />
      </div>
      {/* Price column */}
      <div
        style={{
          width: 40,
          height: 18,
          borderRadius: 4,
          background: 'var(--surface-2)',
          flexShrink: 0,
        }}
      />
      {/* Action gutter */}
      <div />
    </div>
  )
}

export default function WatchingLoading() {
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
      {/* Matches WatchingContent main container */}
      <main className="mx-auto w-full max-w-[880px] flex-1 px-4 pb-20 pt-4 sm:px-8 sm:pb-10 sm:pt-8">
        {/* Headline block — mirrors mb-5/sm:mb-6, border-b, pb-4/sm:pb-5 */}
        <div className="mb-5 border-b border-border pb-4 sm:mb-6 sm:pb-5">
          {/* "WATCHING" eyebrow */}
          <div
            style={{
              height: 10,
              width: 64,
              borderRadius: 3,
              background: 'var(--surface-2)',
              marginBottom: 6,
              animation: 'skeletonPulse 1.4s ease-in-out infinite',
            }}
          />
          {/* "N shows" large heading */}
          <div
            style={{
              height: 36,
              width: 120,
              borderRadius: 6,
              background: 'var(--surface-2)',
              animation: 'skeletonPulse 1.4s ease-in-out 0.06s infinite',
            }}
          />
        </div>

        {/* Group section header */}
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
              animation: 'skeletonPulse 1.4s ease-in-out 0.1s infinite',
            }}
          />
        </div>

        {/* Row card skeletons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <WatchingCardSkeleton key={idx} delay={0.12 + idx * 0.08} />
          ))}
        </div>
      </main>
    </>
  )
}
