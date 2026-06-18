'use client'

import { Fragment, useEffect, useMemo, useRef } from 'react'
import type { EventWithVenue } from '@concert-crawl/types'
import { EventCard } from '../event-card/EventCard'
import { dateGroupLabel } from '../definitions/lib'

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

  const groups = useMemo(() => {
    const grouped = new Map<string, EventWithVenue[]>()
    for (const event of events) {
      const key = event.date
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(event)
    }
    return grouped
  }, [events])

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
    <div className="flex flex-col gap-6">
      {Array.from(groups.entries()).map(([date, dateEvents]) => {
        const label = dateGroupLabel(date)
        const isTonight = label.toLowerCase() === 'tonight'
        return (
          <section key={date} aria-label={label}>
            <div
              className="mb-1 flex items-baseline gap-2.5 pb-2"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <h2
                className="shrink-0 leading-none"
                style={{
                  fontFamily: 'Inter, system-ui',
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: '-0.02em',
                  color: isTonight ? 'var(--accent)' : 'var(--fg)',
                }}
              >
                {label}
              </h2>
              <span
                className="shrink-0 uppercase text-fg-subtle"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.06em',
                }}
              >
                {dateEvents.length} show
                {dateEvents.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div>
              {dateEvents.map((event, idx) => (
                <Fragment key={event.id}>
                  {idx > 0 && (
                    <div
                      className="h-px bg-border"
                      style={{ marginLeft: 60 }}
                    />
                  )}
                  <div
                    ref={event.id === highlightId ? highlightRef : undefined}
                  >
                    <EventCard
                      event={event}
                      isWatching={watchedSet.has(event.id)}
                    />
                  </div>
                </Fragment>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
