'use client'

import { useAuth } from '@clerk/nextjs'
import { Eye, Loader2 } from 'lucide-react'
import { useWatching } from '@/lib/queries/use-watching'
import { useWatchToggle } from '@/lib/queries/use-watch-toggle'

interface WatchShowButtonProps {
  eventId: string
  initialWatching?: boolean
  watchingCount?: number
}

export function WatchShowButton({
  eventId,
  initialWatching = false,
  watchingCount = 0,
}: WatchShowButtonProps) {
  const { isSignedIn } = useAuth()
  const { data: watchedShows } = useWatching()
  const toggle = useWatchToggle()

  const isPending = toggle.isPending

  // Derive watching state from the cache when available. If the cache hasn't
  // loaded yet but a mutation is in-flight, apply a local optimistic override
  // by flipping initialWatching — this prevents the button from staying in the
  // wrong state (or showing only a spinner with no label) while the watching
  // query is still fetching on first render.
  const cacheIsReady = watchedShows !== undefined
  const cacheWatching = cacheIsReady
    ? watchedShows.some((show) => show.eventId === eventId)
    : initialWatching
  const isWatching =
    isPending && !cacheIsReady ? !initialWatching : cacheWatching

  const handleToggle = () => {
    if (!isSignedIn || isPending) return
    toggle.mutate(eventId)
  }

  const baseBtn: React.CSSProperties = {
    all: 'unset',
    cursor: isPending ? 'default' : 'pointer',
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 28,
    padding: '0 11px',
    borderRadius: 7,
    fontFamily: 'var(--font-ui)',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '-0.005em',
    opacity: isPending ? 0.6 : 1,
    transition: 'opacity 0.15s',
  }

  const watchingStyle: React.CSSProperties = {
    ...baseBtn,
    background: 'color-mix(in oklab, var(--accent) 12%, transparent)',
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
  }

  const unwatchedStyle: React.CSSProperties = {
    ...baseBtn,
    background: 'transparent',
    color: 'var(--fg)',
    border: '1px solid var(--border-strong)',
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        aria-pressed={isWatching}
        aria-label={isWatching ? 'Watching — click to stop' : 'Watch this show'}
        style={isWatching ? watchingStyle : unwatchedStyle}
      >
        {isPending ? (
          <Loader2
            size={10}
            aria-hidden
            style={{ animation: 'fbSpin 0.7s linear infinite' }}
          />
        ) : isWatching ? (
          <svg
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
          >
            <path
              d="M2.5 6.5l2.5 2.5L9.5 4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <>
            {/* Eye icon — shown only on mobile (sm and below) */}
            <Eye
              size={12}
              aria-hidden
              className="block sm:hidden"
              style={{ flexShrink: 0 }}
            />
            {/* Plus icon — shown only on desktop */}
            <svg
              width="10"
              height="10"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden
              className="hidden sm:block"
            >
              <path
                d="M6 2.5v7M2.5 6h7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </>
        )}
        {/* Label — hidden on mobile when not watching (eye icon replaces it) */}
        <span className={isWatching ? undefined : 'hidden sm:inline'}>
          {isWatching ? 'Watching' : 'Watch this show'}
        </span>
      </button>

      {watchingCount > 0 && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            fontWeight: 700,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.04em',
          }}
        >
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              background: 'var(--accent)',
              flexShrink: 0,
            }}
            aria-hidden
          />
          {watchingCount} watching
          {isWatching ? '' : ' · alerts on price + sold out'}
        </span>
      )}
    </div>
  )
}
