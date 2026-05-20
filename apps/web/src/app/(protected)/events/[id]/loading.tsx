import { AppHeader } from '@/components/consumer/app-header'

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
      {/* Desktop-only header */}
      <div className="hidden sm:block">
        <AppHeader />
      </div>

      {/* Hero — 300px full-bleed */}
      <div
        style={{
          width: '100%',
          height: 300,
          background: 'var(--surface-2)',
          flexShrink: 0,
          animation: 'skeletonPulse 1.4s ease-in-out infinite',
        }}
      />

      {/* Content column — mirrors -mt-5 / sm:-mt-[60px] from the real page */}
      <div className="relative -mt-5 sm:-mt-[60px] sm:z-[1] flex-1">
        <div className="mx-auto w-full max-w-[880px] box-border px-[18px] sm:px-8 pb-10 sm:pb-16 sm:pt-5">
          {/* Artist name — h1 26px / weight 900 */}
          <div
            style={{
              height: 28,
              width: '55%',
              borderRadius: 6,
              background: 'var(--surface-2)',
              marginBottom: 12,
              animation: 'skeletonPulse 1.4s ease-in-out 0.08s infinite',
            }}
          />

          {/* Watch show button */}
          <div
            style={{
              height: 36,
              width: 140,
              borderRadius: 8,
              background: 'var(--surface-2)',
              marginBottom: 16,
              animation: 'skeletonPulse 1.4s ease-in-out 0.16s infinite',
            }}
          />

          {/* Info block — 4 rows (Venue, Date, Doors/Show, Ages) with icon + label + value */}
          <div
            style={{
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              padding: '4px 0',
              marginBottom: 16,
            }}
          >
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 0',
                  animation: `skeletonPulse 1.4s ease-in-out ${0.2 + idx * 0.06}s infinite`,
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: 'var(--surface-2)',
                    flexShrink: 0,
                  }}
                />
                {/* Label + value stacked */}
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 3 }}
                >
                  <div
                    style={{
                      height: 9,
                      width: 36,
                      borderRadius: 3,
                      background: 'var(--surface-2)',
                    }}
                  />
                  <div
                    style={{
                      height: 14,
                      width: [120, 100, 90, 60][idx],
                      borderRadius: 4,
                      background: 'var(--surface-2)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Price card */}
          <div
            style={{
              height: 80,
              borderRadius: 10,
              background: 'var(--surface-2)',
              marginBottom: 16,
              animation: 'skeletonPulse 1.4s ease-in-out 0.44s infinite',
            }}
          />

          {/* Primary CTA — h-12 full-width */}
          <div
            style={{
              height: 48,
              width: '100%',
              borderRadius: 10,
              background: 'var(--surface-2)',
              animation: 'skeletonPulse 1.4s ease-in-out 0.5s infinite',
            }}
          />
        </div>
      </div>
    </div>
  )
}
