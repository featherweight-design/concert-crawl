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
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.dataset['highlighted'] = 'true'
    const timer = setTimeout(() => {
      delete el.dataset['highlighted']
    }, 2000)
    return () => clearTimeout(timer)
  }, [highlightId])

  return (
    <>
      <style>{`
        [data-highlighted="true"] {
          animation: ccEventHighlight 2s ease forwards;
        }
        @keyframes ccEventHighlight {
          0%   { background: var(--overlay-hover); border-radius: 8px; }
          60%  { background: var(--overlay-hover); border-radius: 8px; }
          100% { background: transparent; border-radius: 8px; }
        }
      `}</style>
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
    </>
  )
}
