'use client'

// DiscoveryShelf LOADING state (design_handoff_discovery_loading). Fires on
// the narrow gap: entitled + Spotify-connected + `useTastePicks()` still in
// flight (cold hydration / no SSR seed / mid-session entitlement upgrade).
// Box model mirrors TastePickCard VERBATIM (168 · 14 · surface-1 · border ·
// image 116 · body pad 10/11/12 · gap 7) so real picks land with zero shift.
// Timeout chip after 8s per the handoff — "slow", not "broken".

import { useEffect, useState } from 'react'
import { SPOTIFY_COPY } from './definitions/copy'
import {
  ShelfSkeletonCards,
  ShelfSkeletonHeader,
} from './DiscoveryShelfSkeleton'

const LOADING = SPOTIFY_COPY.discovery.loading

// Timeout at 8s per the handoff — flips the shelf from shimmer to a light
// retry chip. Deliberately shorter than a plausible slow-network fetch so
// we surface "slow, not broken" before the user gives up scrolling past.
const TIMEOUT_MS = 8000

const TimeoutRetryChip = ({ onRetry }: { onRetry: () => void }) => (
  <div
    className="flex items-center"
    style={{
      gap: 12,
      padding: '12px 14px',
      borderRadius: 12,
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
    }}
  >
    <span
      aria-hidden
      style={{
        width: 6,
        height: 6,
        borderRadius: 6,
        background: 'var(--warning)',
        flexShrink: 0,
        boxShadow: '0 0 6px var(--warning)',
      }}
    />
    <div className="min-w-0 flex-1">
      <div
        className="font-bold uppercase"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.14em',
          color: 'var(--warning)',
          marginBottom: 3,
        }}
      >
        {LOADING.timeout.eyebrow}
      </div>
      <div
        className="font-bold text-fg"
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          letterSpacing: '-0.01em',
        }}
      >
        {LOADING.timeout.title}
      </div>
    </div>
    <button
      type="button"
      onClick={onRetry}
      className="flex-shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      style={{
        padding: '8px 14px',
        borderRadius: 9,
        border:
          '1.5px solid color-mix(in oklch, var(--signal) 45%, var(--border))',
        color: 'var(--signal)',
        fontFamily: 'var(--font-ui)',
        fontWeight: 800,
        fontSize: 12.5,
        letterSpacing: '-0.01em',
        background: 'transparent',
      }}
    >
      {LOADING.timeout.retryCta}
    </button>
  </div>
)

export const DiscoveryLoadingShelf = ({
  onRetry,
  timeoutMs = TIMEOUT_MS,
}: {
  // The refetch trigger for the timeout chip — usually
  // `picksQuery.refetch` from the parent.
  onRetry: () => void
  // Injectable for tests only; prod uses the design-locked 8s.
  timeoutMs?: number
}) => {
  const [isTimeout, setIsTimeout] = useState(false)
  // Bumped on every Retry click so the effect below re-arms the timer.
  // Without this, a Retry that itself hangs would shimmer forever — the
  // effect's [timeoutMs] deps don't re-run on isTimeout state changes.
  const [retryNonce, setRetryNonce] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setIsTimeout(true), timeoutMs)
    return () => clearTimeout(timer)
  }, [timeoutMs, retryNonce])

  const retry = () => {
    setIsTimeout(false)
    setRetryNonce((prev) => prev + 1)
    onRetry()
  }

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label={LOADING.ariaLabel}
      className="mb-5 pt-1.5"
    >
      <ShelfSkeletonHeader isTimeout={isTimeout} />
      {isTimeout ? (
        <TimeoutRetryChip onRetry={retry} />
      ) : (
        <ShelfSkeletonCards />
      )}
    </section>
  )
}
