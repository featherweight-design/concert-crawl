import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const SIZE = 24
const OVERLAP = Math.round(SIZE * 0.3)

/**
 * Placeholder while the watcher roster loads. Reserves the surface's 28px row
 * height so the hero doesn't shift when the sentence arrives. The shimmer is
 * suppressed under `prefers-reduced-motion`; `role="status"` still announces
 * the wait.
 */
export const WatchersSkeleton = () => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    className="flex items-center gap-2"
    style={{ minHeight: 28 }}
  >
    <div className="flex items-center" aria-hidden>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="w-shimmer rounded-full bg-surface-2"
          style={{
            marginLeft: index === 0 ? 0 : -OVERLAP,
            width: SIZE,
            height: SIZE,
            boxShadow: '0 0 0 2px var(--bg)',
            animation: 'wShimmer 1.4s ease-in-out infinite',
            animationDelay: `${index * 0.15}s`,
          }}
        />
      ))}
    </div>
    <div
      aria-hidden
      className="w-shimmer bg-surface-2"
      style={{
        width: 132,
        height: 10,
        borderRadius: 5,
        animation: 'wShimmer 1.4s ease-in-out infinite',
        animationDelay: '0.2s',
      }}
    />
    <span className="sr-only">{CONSUMER_COPY.watchers.loading}</span>
  </div>
)
