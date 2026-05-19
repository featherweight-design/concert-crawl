import { AppHeader } from '@/components/consumer/app-header'
import { BottomNav } from '@/components/consumer/bottom-nav'

function EventCardSkeleton({ delay }: { delay: number }) {
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
            width: '60%',
            borderRadius: 4,
            background: 'var(--surface-2)',
          }}
        />
        <div
          style={{
            height: 10,
            width: '40%',
            borderRadius: 4,
            background: 'var(--surface-2)',
          }}
        />
      </div>
    </div>
  )
}

export default function EventsLoading() {
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
      <BottomNav />
    </div>
  )
}
