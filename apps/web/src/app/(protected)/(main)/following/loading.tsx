// Mirrors HistoryLoading, adjusted for the Artists list: a sub-tab bar, a mono
// group heading, and rows whose right column is the follow control.

function ArtistRowSkeleton({ delay }: { delay: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '56px 1fr auto',
        gap: 12,
        alignItems: 'center',
        padding: '11px 16px',
        borderTop: '1px solid var(--border)',
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
          gap: 6,
          minWidth: 0,
        }}
      >
        <div
          style={{
            height: 14,
            width: '52%',
            borderRadius: 4,
            background: 'var(--surface-2)',
          }}
        />
        <div
          style={{
            height: 10,
            width: '40%',
            borderRadius: 3,
            background: 'var(--surface-2)',
          }}
        />
      </div>
      <div
        style={{
          width: 92,
          // NF_FOLLOW_SIZES.md — the height the real row's follow control
          // resolves to, so the skeleton swap costs no layout shift.
          height: 44,
          borderRadius: 10,
          background: 'var(--surface-2)',
          flexShrink: 0,
        }}
      />
    </div>
  )
}

export default function FollowingLoading() {
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
      <main className="mx-auto w-full max-w-[940px] flex-1 px-4 pb-20 pt-4 sm:px-[30px] sm:pb-10 sm:pt-7">
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

        {/* Group heading */}
        <div
          style={{
            height: 10,
            width: 108,
            borderRadius: 3,
            background: 'var(--surface-2)',
            margin: '13px 0 9px',
            animation: 'skeletonPulse 1.4s ease-in-out 0.06s infinite',
          }}
        />

        <div className="-mx-4 sm:mx-0">
          {Array.from({ length: 5 }).map((_, idx) => (
            <ArtistRowSkeleton key={idx} delay={0.1 + idx * 0.07} />
          ))}
        </div>
      </main>
    </>
  )
}
