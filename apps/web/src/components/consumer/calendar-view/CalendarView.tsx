'use client'

import { Fragment, useMemo, useState } from 'react'
import type {
  EventsAvailabilityResponse,
  EventWithVenue,
} from '@concert-crawl/types'
import { EventCard } from '@/components/consumer/event-card'
import { EmptyState } from '@/components/consumer/empty-state'
import { WeekStrip } from '@/components/consumer/week-strip'
import { dateGroupLabel } from '@/components/consumer/definitions/lib'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY
import type { WeekStripDay } from '@/components/consumer/week-strip'

interface CalendarViewProps {
  days: WeekStripDay[]
  events: EventWithVenue[]
  initialSelectedDate: string
  today: string
  watchedIds: string[]
  prevWeekHref: string | null
  nextWeekHref: string
  // SSR-prefetched availability window; wired into the jump picker in a later
  // task. Accepted here as a no-op passthrough so the page can pass it now.
  initialAvailability?: EventsAvailabilityResponse | undefined
}

export function CalendarView({
  days,
  events,
  initialSelectedDate,
  today,
  watchedIds,
  prevWeekHref,
  nextWeekHref,
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate)
  const watchedSet = useMemo(() => new Set(watchedIds), [watchedIds])

  const filteredEvents = useMemo(
    () => events.filter((event) => event.date === selectedDate),
    [events, selectedDate],
  )

  const groups = useMemo(() => {
    const grouped = new Map<string, EventWithVenue[]>()
    for (const event of filteredEvents) {
      const key = event.date
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(event)
    }
    return grouped
  }, [filteredEvents])

  function handleDateSelect(date: string) {
    setSelectedDate(date)
    // Sync URL so the selected date is bookmarkable/shareable without
    // triggering a Next.js navigation (which would cause a server re-render).
    const url = new URL(window.location.href)
    url.searchParams.set('selectedDate', date)
    window.history.replaceState(null, '', url.toString())
  }

  return (
    <>
      <WeekStrip
        days={days}
        selectedDate={selectedDate}
        today={today}
        onDateSelect={handleDateSelect}
        prevWeekHref={prevWeekHref}
        nextWeekHref={nextWeekHref}
      />

      {groups.size === 0 && (
        <EmptyState
          state="no-data"
          density="dense"
          eyebrow={copy.emptyCalEyebrow}
          title={copy.emptyCalTitle}
          body={copy.emptyCalBody}
        />
      )}

      {groups.size > 0 && (
        <div className="flex flex-col gap-6">
          {Array.from(groups.entries()).map(([date, dateEvents]) => {
            const label = dateGroupLabel(date)
            const isTonight = label.toLowerCase() === 'tonight'
            return (
              <section key={date} aria-label={label}>
                <div
                  className="mb-1 flex items-baseline gap-2.5 px-4 pb-2"
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
                          style={{ marginLeft: 58 }}
                        />
                      )}
                      <EventCard
                        event={event}
                        isWatching={watchedSet.has(event.id)}
                      />
                    </Fragment>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}
