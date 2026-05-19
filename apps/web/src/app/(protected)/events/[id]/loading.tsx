import { AppHeader } from '@/components/consumer/app-header'
import { BottomNav } from '@/components/consumer/bottom-nav'

export default function EventDetailLoading() {
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
        {/* Hero image skeleton */}
        <div
          style={{
            width: '100%',
            aspectRatio: '16/7',
            borderRadius: 12,
            background: 'var(--surface-2)',
            marginBottom: 20,
            animation: 'skeletonPulse 1.4s ease-in-out infinite',
          }}
        />
        {/* Artist name */}
        <div
          style={{
            height: 28,
            width: '55%',
            borderRadius: 6,
            background: 'var(--surface-2)',
            marginBottom: 10,
            animation: 'skeletonPulse 1.4s ease-in-out 0.1s infinite',
          }}
        />
        {/* Venue + date */}
        <div
          style={{
            height: 14,
            width: '40%',
            borderRadius: 4,
            background: 'var(--surface-2)',
            marginBottom: 6,
            animation: 'skeletonPulse 1.4s ease-in-out 0.15s infinite',
          }}
        />
        <div
          style={{
            height: 14,
            width: '30%',
            borderRadius: 4,
            background: 'var(--surface-2)',
            marginBottom: 24,
            animation: 'skeletonPulse 1.4s ease-in-out 0.2s infinite',
          }}
        />
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {[100, 120].map((width, idx) => (
            <div
              key={idx}
              style={{
                width,
                height: 36,
                borderRadius: 8,
                background: 'var(--surface-2)',
                animation: `skeletonPulse 1.4s ease-in-out ${0.25 + idx * 0.08}s infinite`,
              }}
            />
          ))}
        </div>
        {/* Details block */}
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              height: 12,
              width: `${65 - idx * 10}%`,
              borderRadius: 4,
              background: 'var(--surface-2)',
              marginBottom: 8,
              animation: `skeletonPulse 1.4s ease-in-out ${0.3 + idx * 0.07}s infinite`,
            }}
          />
        ))}
      </main>
      <BottomNav />
    </div>
  )
}
