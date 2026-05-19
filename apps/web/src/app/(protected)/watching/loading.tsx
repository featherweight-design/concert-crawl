import { AppHeader } from '@/components/consumer/app-header'
import { BottomNav } from '@/components/consumer/bottom-nav'

export default function WatchingLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
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
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-20 pt-6 sm:px-6 sm:pb-6">
        {/* Page title */}
        <div
          style={{
            height: 22,
            width: '30%',
            borderRadius: 5,
            background: 'var(--surface-2)',
            marginBottom: 20,
            animation: 'skeletonPulse 1.4s ease-in-out infinite',
          }}
        />
        {/* Watching item rows */}
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 0',
              borderBottom: '1px solid var(--border)',
              animation: `skeletonPulse 1.4s ease-in-out ${idx * 0.08}s infinite`,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
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
                  height: 11,
                  width: '38%',
                  borderRadius: 4,
                  background: 'var(--surface-2)',
                }}
              />
            </div>
            <div
              style={{
                width: 72,
                height: 28,
                borderRadius: 7,
                background: 'var(--surface-2)',
                flexShrink: 0,
              }}
            />
          </div>
        ))}
      </main>
      <BottomNav />
    </div>
  )
}
