import { AppHeader } from '@/components/consumer/app-header'
import { BottomNav } from '@/components/consumer/bottom-nav'

export default function VenueLoading() {
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
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-20 pt-4 sm:px-6 sm:pb-6">
        {/* Venue name */}
        <div
          style={{
            height: 26,
            width: '50%',
            borderRadius: 6,
            background: 'var(--surface-2)',
            marginBottom: 8,
            animation: 'skeletonPulse 1.4s ease-in-out infinite',
          }}
        />
        {/* Address */}
        <div
          style={{
            height: 13,
            width: '35%',
            borderRadius: 4,
            background: 'var(--surface-2)',
            marginBottom: 24,
            animation: 'skeletonPulse 1.4s ease-in-out 0.1s infinite',
          }}
        />
        {/* Section header */}
        <div
          style={{
            height: 14,
            width: '25%',
            borderRadius: 4,
            background: 'var(--surface-2)',
            marginBottom: 16,
            animation: 'skeletonPulse 1.4s ease-in-out 0.15s infinite',
          }}
        />
        {/* Event rows */}
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 0',
              borderBottom: '1px solid var(--border)',
              animation: `skeletonPulse 1.4s ease-in-out ${0.2 + idx * 0.07}s infinite`,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
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
                  height: 13,
                  width: '58%',
                  borderRadius: 4,
                  background: 'var(--surface-2)',
                }}
              />
              <div
                style={{
                  height: 10,
                  width: '36%',
                  borderRadius: 4,
                  background: 'var(--surface-2)',
                }}
              />
            </div>
          </div>
        ))}
      </main>
      <BottomNav />
    </div>
  )
}
