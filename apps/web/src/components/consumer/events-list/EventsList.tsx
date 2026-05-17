'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import type { EventWithVenue, EventsListResponse } from '@concert-crawl/types'
import { apiClient, publicApiClient } from '@/lib/api'
import { EventCard } from '@/components/consumer/event-card/EventCard'
import { cn } from '@/lib/utils'
import { dateGroupLabel } from '@/components/consumer/definitions/lib'
import { copy } from '@/components/consumer/definitions/copy'

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
  const [events, setEvents] = useState<EventWithVenue[]>(initialEvents)
  const [offset, setOffset] = useState<number>(initialOffset)
  const watchedIdsSet = useMemo(
    () => new Set(initialWatchedIds),
    [initialWatchedIds],
  )
  const [isPending, startTransition] = useTransition()

  const { getToken } = useAuth()
  const searchParams = useSearchParams()

  const loadMore = () => {
    startTransition(async () => {
      try {
        const token = await getToken()
        const nextOffset = offset + limit
        const params = new URLSearchParams(searchParams.toString())
        params.set('offset', String(nextOffset))
        params.delete('page')
        const path = `/v1/events?${params.toString()}`
        const result = token
          ? await apiClient.get<EventsListResponse>(path, token)
          : await publicApiClient.get<EventsListResponse>(path)
        const newEvents = result.data
        setEvents((prev) => [...prev, ...newEvents])
        setOffset(nextOffset)
      } catch (err) {
        console.error(err)
      }
    })
  }

  const groups = new Map<string, EventWithVenue[]>()
  for (const event of events) {
    const key = event.date
    if (!groups.has(key)) groups.set(key, [])
    const group = groups.get(key)
    if (group) group.push(event)
  }

  const hasMore = events.length < total

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
                        isWatching={watchedIdsSet.has(event.id)}
                      />
                    </Fragment>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {hasMore && (
        <div className="mt-8 flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={isPending}
            className={cn(
              'inline-flex h-10 items-center justify-center rounded-md border border-border-strong bg-surface-2 px-4 text-[13px] font-bold text-signal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-1',
              isPending && 'pointer-events-none opacity-60',
            )}
          >
            {isPending ? 'Loading…' : copy.loadMore}
          </button>
        </div>
      )}
    </>
  )
}
