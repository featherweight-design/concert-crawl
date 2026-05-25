'use client'

import { Fragment, useEffect, useRef } from 'react'
import type { EventWithVenue } from '@concert-crawl/types'
import { EventCard } from '../event-card/EventCard'

interface VenueEventListProps {
  events: EventWithVenue[]
  highlightId?: string
  watchedIds?: string[]
}

export function VenueEventList({
  events,
  highlightId,
  watchedIds = [],
}: VenueEventListProps) {
  const highlightRef = useRef<HTMLDivElement>(null)
  const watchedSet = new Set(watchedIds)

  useEffect(() => {
    if (!highlightId || !highlightRef.current) return
    const el = highlightRef.current
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    el.scrollIntoView({
      behavior: reducedMotion ? 'instant' : 'smooth',
      block: 'center',
    })
    if (!reducedMotion) {
      el.dataset['highlighted'] = 'true'
      const timer = setTimeout(() => {
        delete el.dataset['highlighted']
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [highlightId])

  return (
    <div>
      {events.map((event: EventWithVenue, idx: number) => (
        <Fragment key={event.id}>
          {idx > 0 && (
            <div className="h-px bg-border" style={{ marginLeft: 60 }} />
          )}
          <div ref={event.id === highlightId ? highlightRef : undefined}>
            <EventCard event={event} isWatching={watchedSet.has(event.id)} />
          </div>
        </Fragment>
      ))}
    </div>
  )
}
