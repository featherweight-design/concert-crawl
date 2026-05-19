const SKELETON_ROWS = 4

function SkeletonRow({ delay }: { delay: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        animation: `skeletonPulse 1.4s ease-in-out ${delay}s infinite`,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
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
            height: 13,
            width: '55%',
            borderRadius: 4,
            background: 'var(--surface-2)',
          }}
        />
        <div
          style={{
            height: 10,
            width: '35%',
            borderRadius: 4,
            background: 'var(--surface-2)',
          }}
        />
      </div>
    </div>
  )
}

export function SearchLoadingState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 8 }}>
      {Array.from({ length: SKELETON_ROWS }, (_, idx) => (
        <SkeletonRow key={idx} delay={idx * 0.1} />
      ))}
    </div>
  )
}
