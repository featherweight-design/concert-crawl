'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  getCachedEvents,
  getCachedVenues,
  type CachedEvent,
  type CachedVenue,
} from '@/lib/pwa/cached-content'
import { CachedShortcuts, CachedEmpty } from './CachedShortcuts'
import { OFFLINE_COPY } from './definitions/copy'

export const OfflineFallback = () => {
  const router = useRouter()
  const [events, setEvents] = useState<CachedEvent[]>([])
  const [venues, setVenues] = useState<CachedVenue[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [nextEvents, nextVenues] = await Promise.all([
        getCachedEvents(),
        getCachedVenues(),
      ])
      if (cancelled) return
      setEvents(nextEvents)
      setVenues(nextVenues)
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const onRetry = useCallback(() => {
    router.refresh()
  }, [router])

  const hasContent = events.length > 0 || venues.length > 0

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-5 py-10">
      <div className="flex flex-col gap-3">
        <span
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {OFFLINE_COPY.fallback.eyebrow}
        </span>
        <h1 className="text-2xl font-extrabold text-fg">
          {OFFLINE_COPY.fallback.title}
        </h1>
        <p className="text-sm text-fg-muted">{OFFLINE_COPY.fallback.sub}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-[44px] w-fit items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-fg-on-accent"
        >
          {OFFLINE_COPY.fallback.retry}
        </button>
      </div>
      {loaded &&
        (hasContent ? (
          <CachedShortcuts events={events} venues={venues} />
        ) : (
          <CachedEmpty />
        ))}
    </main>
  )
}
