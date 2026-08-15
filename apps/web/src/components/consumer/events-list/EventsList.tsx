'use client'

import { Fragment, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import type { EventWithVenue, EventsListResponse } from '@concert-crawl/types'
import { useEvents } from '@/lib/queries/use-events'
import { useWatching } from '@/lib/queries/use-watching'
import { EventRow, fromEventWithVenue } from '@/components/consumer/event-row'
import { dateGroupLabel } from '@/components/consumer/definitions/lib'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY

const PAGE_LIMIT = 20

export interface EventsListProps {
  initialEvents: EventWithVenue[]
  initialOffset: number
  total: number
  limit: number
  initialWatchedIds: string[]
}

export const EventsList = ({
  initialEvents,
  initialOffset,
  total,
  limit,
  initialWatchedIds,
}: EventsListProps) => {
  const searchParams = useSearchParams()
  // Read here rather than passed down from the server page: the list refetches
  // on a client-side filter change, so a server-rendered prop would name the
  // previous filter while the rows below it answer the current one.
  const filterVibe = searchParams.get('filterVibe') ?? undefined

  // Build a stable query key from URL params (strip offset — managed by pagination)
  const searchParamsString = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('offset')
    params.delete('page')
    return params.toString()
  }, [searchParams])

  // Seed the cache with the SSR-provided first page
  const initialData: EventsListResponse = useMemo(
    () => ({ data: initialEvents, total, limit, offset: initialOffset }),
    [initialEvents, total, limit, initialOffset],
  )

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useEvents({
    searchParamsString,
    limit: limit || PAGE_LIMIT,
    initialData,
    initialOffset,
  })

  const { data: watchedShows } = useWatching()
  const watchedIds = useMemo(
    () => new Set((watchedShows ?? []).map((show) => show.eventId)),
    [watchedShows],
  )

  // Flatten pages into a single event list
  const events = useMemo(
    () => (data?.pages ?? []).flatMap((page) => page.data),
    [data],
  )

  // Group events by date for display
  const groups = useMemo(() => {
    const grouped = new Map<string, EventWithVenue[]>()
    for (const event of events) {
      const key = event.date
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(event)
    }
    return grouped
  }, [events])

  // Fall back to initialWatchedIds while the watching cache loads
  const effectiveWatchedIds =
    watchedShows !== undefined ? watchedIds : new Set(initialWatchedIds)

  return (
    <>
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
                          isWatching: effectiveWatchedIds.has(event.id),
                        })}
                        surface="browse"
                        filterVibe={filterVibe}
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

      {isFetchingNextPage && (
        <div className="mt-2 flex flex-col">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                animation: `skeletonPulse 1.4s ease-in-out ${idx * 0.07}s infinite`,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    height: 13,
                    width: '60%',
                    borderRadius: 4,
                    background: 'var(--surface-2)',
                  }}
                />
                <div
                  style={{
                    height: 10,
                    width: '40%',
                    borderRadius: 4,
                    background: 'var(--surface-2)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {hasNextPage && !isFetchingNextPage && (
        <div className="mt-8 flex justify-center pt-2">
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border-strong bg-surface-2 px-4 text-[13px] font-bold text-signal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-1"
          >
            {copy.loadMore}
          </button>
        </div>
      )}
    </>
  )
}
