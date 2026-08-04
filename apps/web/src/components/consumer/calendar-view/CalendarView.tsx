'use client'

import { Fragment, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  EventsAvailabilityResponse,
  EventWithVenue,
} from '@concert-crawl/types'
import { EventRow, fromEventWithVenue } from '@/components/consumer/event-row'
import { EmptyState } from '@/components/consumer/empty-state'
import {
  WeekStrip,
  WeekStripHeader,
  type WeekStripDay,
} from '@/components/consumer/week-strip'
import { dateGroupLabel } from '@/components/consumer/definitions/lib'
import {
  monthLabelFor,
  pickerWindow,
  weekOffsetForDate,
} from '@/components/consumer/jump-picker/date-math'
import { useAvailability } from '@/lib/queries/use-availability'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY

interface CalendarViewProps {
  days: WeekStripDay[]
  events: EventWithVenue[]
  initialSelectedDate: string
  today: string
  watchedIds: string[]
  prevWeekHref: string | null
  nextWeekHref: string
  // SSR-prefetched availability window; seeds the jump picker's react-query
  // cache so all in-picker month paging is client-side.
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
  initialAvailability,
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate)
  // A cross-week jump soft-navigates via router.push, so Next.js re-renders this
  // component with a fresh initialSelectedDate but React keeps the old useState
  // value. Adjust state during render when the prop changes so the selection
  // follows the new week instead of filtering it against the stale date.
  const [syncedInitialDate, setSyncedInitialDate] =
    useState(initialSelectedDate)
  if (initialSelectedDate !== syncedInitialDate) {
    setSyncedInitialDate(initialSelectedDate)
    setSelectedDate(initialSelectedDate)
  }
  // Derived client-side so the cue label tracks in-week picks that cross a
  // month boundary (no server re-render happens for those).
  const monthLabel = useMemo(() => monthLabelFor(selectedDate), [selectedDate])
  const watchedSet = useMemo(() => new Set(watchedIds), [watchedIds])
  const router = useRouter()

  const { from, to } = pickerWindow(today)
  const { data: availability } = useAvailability({
    from,
    to,
    ...(initialAvailability !== undefined
      ? { initialData: initialAvailability }
      : {}),
  })

  const weekDates = useMemo(() => new Set(days.map((day) => day.date)), [days])

  // Picking a date inside the current rendered week stays client-side (no fetch,
  // no navigation). Picking a date outside it re-paginates via router.push,
  // preserving every active filter param (mirrors calNextWeekHref param-copy).
  const onJumpPick = (iso: string) => {
    if (weekDates.has(iso)) {
      // Same client-side select + URL-sync as tapping a day in the strip.
      handleDateSelect(iso)
      return
    }
    const offset = weekOffsetForDate(iso, today)
    const params = new URLSearchParams(window.location.search)
    params.delete('offset')
    params.set('view', 'cal')
    params.set('weekOffset', String(offset))
    params.set('selectedDate', iso)
    router.push(`/events?${params.toString()}`)
  }

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
      <WeekStripHeader
        monthLabel={monthLabel}
        selectedDate={selectedDate}
        today={today}
        availability={availability ?? new Map()}
        onPick={onJumpPick}
        prevWeekHref={prevWeekHref}
        nextWeekHref={nextWeekHref}
        showBackToToday={!weekDates.has(today)}
        onBackToToday={() => onJumpPick(today)}
      />
      <WeekStrip
        days={days}
        selectedDate={selectedDate}
        today={today}
        onDateSelect={handleDateSelect}
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
                    {copy.showCount(dateEvents.length)}
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
                      <EventRow
                        show={fromEventWithVenue(event, {
                          isWatching: watchedSet.has(event.id),
                        })}
                        surface="browse"
                        className="py-2.5"
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
