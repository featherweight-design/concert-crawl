'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
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
  const [isConfirming, setIsConfirming] = useState(false)
  const { data: watchedShows } = useWatching()
  const toggle = useWatchToggle()

  // Derive watching state from cache; fall back to prop while cache loads
  const isWatching =
    watchedShows !== undefined
      ? watchedShows.some((show) => show.eventId === eventId)
      : initialWatching

  const isPending = toggle.isPending

  const handleToggle = () => {
    if (!isSignedIn || isPending) return
    setIsConfirming(false)
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

  if (isWatching && isConfirming) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          aria-label="Stop watching this show"
          style={{
            ...baseBtn,
            background: 'transparent',
            color: 'var(--warning)',
            border: '1px solid var(--warning)',
          }}
        >
          Stop watching
        </button>
        <button
          type="button"
          onClick={() => setIsConfirming(false)}
          disabled={isPending}
          aria-label="Cancel"
          style={{
            ...baseBtn,
            padding: '0 8px',
            background: 'transparent',
            color: 'var(--fg-muted)',
            border: '1px solid var(--border)',
          }}
        >
          Cancel
        </button>
      </div>
    )
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
        onClick={isWatching ? () => setIsConfirming(true) : handleToggle}
        disabled={isPending}
        aria-pressed={isWatching}
        aria-label={isWatching ? 'Watching — click to stop' : 'Watch this show'}
        style={{
          ...baseBtn,
          background: isWatching
            ? 'color-mix(in oklab, var(--accent) 12%, transparent)'
            : 'transparent',
          color: isWatching ? 'var(--accent)' : 'var(--fg)',
          border: isWatching
            ? '1px solid var(--accent)'
            : '1px solid var(--border-strong)',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
          {isWatching ? (
            <path
              d="M2.5 6.5l2.5 2.5L9.5 4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M6 2.5v7M2.5 6h7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          )}
        </svg>
        {isWatching ? 'Watching' : 'Watch this show'}
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
