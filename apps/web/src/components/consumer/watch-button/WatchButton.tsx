'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

interface WatchButtonProps {
  eventId: string
  initialWatching: boolean
}

export function WatchButton({ eventId, initialWatching }: WatchButtonProps) {
  const [isWatching, setIsWatching] = useState(initialWatching)
  const [isPending, setIsPending] = useState(false)
  const { getToken } = useAuth()

  const handleToggle = useCallback(async () => {
    if (isPending) return

    // Optimistic update
    const prevWatching = isWatching
    setIsWatching((prev) => !prev)
    setIsPending(true)

    try {
      const token = await getToken()
      if (!token) {
        setIsWatching(prevWatching)
        return
      }

      const res = await fetch(`${API_URL}/v1/watching/${eventId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        // Revert on error
        setIsWatching(prevWatching)
      }
    } catch {
      // Revert on network error
      setIsWatching(prevWatching)
    } finally {
      setIsPending(false)
    }
  }, [eventId, getToken, isPending, isWatching])

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isWatching ? 'Remove from watching' : 'Watch this show'}
      aria-pressed={isWatching}
      disabled={isPending}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        background: 'none',
        border: 'none',
        borderRadius: 8,
        cursor: isPending ? 'default' : 'pointer',
        opacity: isPending ? 0.6 : 1,
        padding: 0,
        flexShrink: 0,
        transition: 'opacity 0.15s',
      }}
    >
      {isWatching ? (
        // Filled heart
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path
            d="M9 15l-6.5-6A3.5 3.5 0 019 4.5 3.5 3.5 0 0115.5 9L9 15z"
            fill="var(--signal)"
          />
        </svg>
      ) : (
        // Outline heart
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path
            d="M9 15l-6.5-6A3.5 3.5 0 019 4.5 3.5 3.5 0 0115.5 9L9 15z"
            stroke="var(--fg-subtle)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}
