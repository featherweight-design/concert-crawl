'use client'

import { Fragment, useEffect, useRef } from 'react'
import type { Event } from '@concert-crawl/types'
import { SmallEventRow } from '../small-event-row'
import { formatShortDate } from '../definitions/lib'

interface VenueEventListProps {
  events: Event[]
  highlightId?: string
}

export function VenueEventList({ events, highlightId }: VenueEventListProps) {
  const highlightRef = useRef<HTMLDivElement>(null)

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
      {events.map((event: Event, idx: number) => (
        <Fragment key={event.id}>
          {idx > 0 && (
            <div className="h-px bg-border" style={{ marginLeft: 50 }} />
          )}
          <div ref={event.id === highlightId ? highlightRef : undefined}>
            <SmallEventRow
              event={event}
              date={formatShortDate(event.date)}
              showVenue={false}
            />
          </div>
        </Fragment>
      ))}
    </div>
  )
}
