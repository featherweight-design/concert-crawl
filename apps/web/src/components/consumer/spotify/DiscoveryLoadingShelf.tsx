'use client'

// DiscoveryShelf LOADING state (design_handoff_discovery_loading). Fires on
// the narrow gap: entitled + Spotify-connected + `useTastePicks()` still in
// flight (cold hydration / no SSR seed / mid-session entitlement upgrade).
// Box model mirrors TastePickCard VERBATIM (168 · 14 · surface-1 · border ·
// image 116 · body pad 10/11/12 · gap 7) so real picks land with zero shift.
// Timeout chip after 8s per the handoff — "slow", not "broken".

import { useEffect, useState } from 'react'
import { SpotifyLogo } from '@/components/brand/spotify-logo'
import { SPOTIFY_COPY } from './definitions/copy'

const COPY = SPOTIFY_COPY.discovery
const LOADING = COPY.loading

// Design handoff DL_MOTION (sole source of truth for motion timings).
const SWEEP_ANIM = 'dlSweep 1500ms cubic-bezier(0.4,0,0.2,1) infinite'
const DOT_ANIM = 'dlDot 1400ms ease-in-out infinite'

// Timeout at 8s per the handoff — flips the shelf from shimmer to a light
// retry chip. Deliberately shorter than a plausible slow-network fetch so
// we surface "slow, not broken" before the user gives up scrolling past.
const TIMEOUT_MS = 8000

// Sweeping light band tied to --fg so it lightens on dark, darkens on Light
// — no raw color, --accent untouched (spec §7).
const SweepOverlay = () => (
  <div
    aria-hidden
    className="dl-sweep pointer-events-none absolute inset-0"
    style={{
      background:
        'linear-gradient(100deg, transparent 32%, color-mix(in oklch, var(--fg) 11%, transparent) 50%, transparent 68%)',
      animation: SWEEP_ANIM,
    }}
  />
)

// Placeholder bar. `tint="price"` paints a faint --signal wash so the price
// row still reads as "price" through the skeleton.
const SkeletonBar = ({
  width,
  height,
  radius = 5,
  tint,
}: {
  width: number | string
  height: number
  radius?: number
  tint?: 'price'
}) => (
  <div
    aria-hidden
    style={{
      width,
      height,
      borderRadius: radius,
      flexShrink: 0,
      background:
        tint === 'price'
          ? 'color-mix(in oklch, var(--signal) 18%, var(--surface-2))'
          : 'var(--surface-2)',
    }}
  />
)

// One skeleton pick card — box-identical to TastePickCard.
const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <li
    className={`relative flex w-[168px] shrink-0 flex-col overflow-hidden rounded-[14px] ${className}`}
    style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
    }}
  >
    <div style={{ height: 116, background: 'var(--surface-2)' }} />
    <div
      className="flex flex-col"
      style={{ padding: '10px 11px 12px', gap: 7 }}
    >
      <SkeletonBar width={74} height={16} />
      <SkeletonBar width="82%" height={13} />
      <SkeletonBar width="94%" height={9} radius={4} />
      <SkeletonBar width={44} height={11} tint="price" />
    </div>
    <SweepOverlay />
  </li>
)

const LoadingHeader = ({ isTimeout }: { isTimeout: boolean }) => (
  <div className="mb-2.5 flex items-center gap-[9px]">
    <SpotifyLogo size={22} />
    <div className="min-w-0 flex-1">
      <h2
        className="font-extrabold text-fg"
        style={{
          fontSize: '16px',
          letterSpacing: '-0.02em',
          fontFamily: 'var(--font-ui)',
        }}
      >
        {COPY.title}
      </h2>
      <div className="mt-0.5 flex items-center gap-1.5">
        {!isTimeout && (
          <span
            aria-hidden
            className="dl-anim"
            style={{
              width: 5,
              height: 5,
              borderRadius: 5,
              background: 'var(--signal)',
              flexShrink: 0,
              boxShadow: '0 0 5px var(--signal)',
              animation: DOT_ANIM,
            }}
          />
        )}
        <span
          className="font-bold uppercase"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.1em',
            color: 'var(--fg-subtle)',
          }}
        >
          {isTimeout ? LOADING.eyebrowTimeout : LOADING.eyebrow}
        </span>
      </div>
    </div>
  </div>
)

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

  const handleRetry = () => {
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
      <LoadingHeader isTimeout={isTimeout} />
      {isTimeout ? (
        <TimeoutRetryChip onRetry={handleRetry} />
      ) : (
        <ul
          aria-hidden
          className="-mx-4 flex list-none gap-[11px] overflow-hidden px-4 pb-1 pt-0.5 sm:mx-0 sm:px-0"
        >
          {/* 2 cards mobile / 4 desktop, per the design handoff. Rendering
              4 up-front and hiding the extras on mobile avoids
              SSR-vs-client mismatch that a window.matchMedia branch would
              introduce. The `overflow-hidden` on the parent hides any
              spillover if the viewport can't fit all four at desktop. */}
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard className="hidden sm:flex" />
          <SkeletonCard className="hidden sm:flex" />
        </ul>
      )}
    </section>
  )
}
