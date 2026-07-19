'use client'

import Link from 'next/link'
import type { CachedEvent, CachedVenue } from '@/lib/pwa/cached-content'
import { OFFLINE_COPY } from './definitions/copy'

interface CachedShortcutsProps {
  events: CachedEvent[]
  venues: CachedVenue[]
}

const MAX_EVENTS = 6
const MAX_VENUES = 6

const formatEventLine = (event: CachedEvent): string => {
  // "The Roxy · Aug 14" — venue name + short date; keeps the shortcut card
  // low-density and readable inside a bordered row.
  //
  // Append a midday time when the value is a bare date so `new Date` doesn't
  // treat it as UTC midnight and display the previous day in Mountain time.
  // (Match the pattern used in AdminReviewMobile.tsx:176.)
  const raw = event.date.includes('T') ? event.date : `${event.date}T12:00:00`
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return event.venue.name
  const short = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  return `${event.venue.name} · ${short}`
}

export const CachedShortcuts = ({ events, venues }: CachedShortcutsProps) => {
  const eventItems = events.slice(0, MAX_EVENTS)
  const venueItems = venues.slice(0, MAX_VENUES)

  return (
    <section className="flex flex-col gap-4">
      <h2
        className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {OFFLINE_COPY.fallback.shortcutsLabel}
      </h2>
      {eventItems.length > 0 && (
        <ul className="flex flex-col gap-2">
          {eventItems.map((event) => (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="flex flex-col gap-1 rounded-lg border border-border bg-surface-1 px-4 py-3 hover:bg-surface-2"
              >
                <span className="text-sm font-semibold text-fg">
                  {event.title}
                </span>
                <span className="text-xs text-fg-muted">
                  {formatEventLine(event)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {venueItems.length > 0 && (
        <ul className="flex flex-col gap-2">
          {venueItems.map((venue) => (
            <li key={venue.id}>
              <Link
                href={`/venues/${venue.slug}`}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-1 px-4 py-3 hover:bg-surface-2"
              >
                <span className="text-sm font-semibold text-fg">
                  {venue.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-fg-subtle">{OFFLINE_COPY.fallback.authNote}</p>
    </section>
  )
}

export const CachedEmpty = () => (
  <section className="flex flex-col gap-3 text-center">
    <h2 className="text-lg font-semibold text-fg">
      {OFFLINE_COPY.fallback.empty.title}
    </h2>
    <p className="text-sm text-fg-muted">{OFFLINE_COPY.fallback.empty.sub}</p>
    <Link
      href="/"
      className="mx-auto inline-flex min-h-[44px] items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-semibold text-fg"
    >
      {OFFLINE_COPY.fallback.empty.link}
    </Link>
  </section>
)
