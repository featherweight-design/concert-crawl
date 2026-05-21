import { Suspense } from 'react'
import type {
  EventsListResponse,
  VenuePublic,
  WatchingShow,
} from '@concert-crawl/types'
import { publicApiClient, apiClient } from '@/lib/api'
import { auth } from '@/lib/auth'
import { fetchWatching } from '@/lib/watching'
import { HeroEventCard } from '@/components/consumer/hero-event-card'
import { FilterBar } from '@/components/consumer/filter-bar'
import { EmptyState } from '@/components/consumer/empty-state'
import { EventsList } from '@/components/consumer/events-list'
import { CalendarView } from '@/components/consumer/calendar-view/CalendarView'
import {
  currentWeekDays,
  filterWhenToDateRange,
  isToday,
  type WeekDayInfo,
} from '@/components/consumer/definitions/lib'
import { localDateString } from '@/lib/time'
import { copy } from '@/components/consumer/definitions/copy'

export const dynamic = 'force-dynamic'

const PAGE_LIMIT = 20

type CalendarWeekDay = WeekDayInfo & { hasEvents: boolean }

interface BrowsePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function fetchEvents(
  params: Record<string, string | string[] | undefined>,
  token: string | null,
  limit = PAGE_LIMIT,
): Promise<EventsListResponse> {
  const qs = new URLSearchParams()
  if (typeof params['search'] === 'string') qs.set('search', params['search'])
  const venueSlug = params['filterWhere'] ?? params['venueSlug']
  if (typeof venueSlug === 'string') qs.set('venueSlug', venueSlug)
  if (typeof params['from'] === 'string') qs.set('from', params['from'])
  if (typeof params['to'] === 'string') qs.set('to', params['to'])
  const offsetParam = params['offset']
  if (typeof offsetParam === 'string' && /^\d+$/.test(offsetParam)) {
    const parsed = Number(offsetParam)
    if (Number.isSafeInteger(parsed) && parsed >= 0)
      qs.set('offset', String(parsed))
  }
  if (typeof params['filterPrice'] === 'string')
    qs.set('filterPrice', params['filterPrice'])
  if (typeof params['filterVibe'] === 'string')
    qs.set('filterVibe', params['filterVibe'])
  qs.set('limit', String(limit))
  const url = `/v1/events?${qs.toString()}`
  return token
    ? apiClient.get<EventsListResponse>(url, token)
    : publicApiClient.get<EventsListResponse>(url)
}

async function fetchVenues(token: string | null): Promise<VenuePublic[]> {
  return token
    ? apiClient.get<VenuePublic[]>('/v1/venues', token)
    : publicApiClient.get<VenuePublic[]>('/v1/venues')
}

async function fetchGenres(token: string | null): Promise<string[]> {
  return token
    ? apiClient.get<string[]>('/v1/events/genres', token)
    : publicApiClient.get<string[]>('/v1/events/genres')
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams
  const view = params['view'] === 'cal' ? 'cal' : 'list'

  // Translate filterWhen shorthand into concrete from/to date strings for the API.
  let fetchParams: Record<string, string | string[] | undefined> = params
  const filterWhen =
    typeof params['filterWhen'] === 'string' ? params['filterWhen'] : undefined
  if (filterWhen) {
    const range = filterWhenToDateRange(filterWhen)
    if (range) fetchParams = { ...params, from: range.from, to: range.to }
  }
  // Read weekOffset for calendar view pagination (0 = current week, 1 = next week, etc.)
  const weekOffsetRaw = params['weekOffset']
  const weekOffsetParsed =
    typeof weekOffsetRaw === 'string' ? parseInt(weekOffsetRaw, 10) : 0
  const weekOffset =
    Number.isFinite(weekOffsetParsed) && weekOffsetParsed >= 0
      ? weekOffsetParsed
      : 0

  const today = localDateString('America/Denver')

  let weekDays: CalendarWeekDay[] = currentWeekDays(
    'America/Denver',
    weekOffset,
  ).map((day) => ({
    ...day,
    hasEvents: false,
  }))
  const selectedDateParam = params['selectedDate']
  let selectedDate =
    typeof selectedDateParam === 'string'
      ? selectedDateParam
      : Array.isArray(selectedDateParam)
        ? selectedDateParam[0]
        : undefined
  const fromParam =
    typeof params['from'] === 'string'
      ? params['from']
      : Array.isArray(params['from'])
        ? params['from'][0]
        : undefined
  const toParam =
    typeof params['to'] === 'string'
      ? params['to']
      : Array.isArray(params['to'])
        ? params['to'][0]
        : undefined

  if (view === 'cal') {
    // Only default to current week when no date filter is active.
    // If filterWhen or explicit from/to is set, fetchParams already has the right range.
    if (!filterWhen && !fromParam && !toParam) {
      const monday = weekDays[0]?.date
      const sunday = weekDays[6]?.date
      if (monday && sunday) {
        fetchParams = {
          ...params,
          from: monday,
          to: sunday,
        }
      }
    }

    // Default to today (if today is in the visible week), otherwise the first
    // visible day of the week. Never fall back to Monday unconditionally.
    const todayInWeek = weekDays.some((day) => day.date === today)
    const fallbackDate = todayInWeek ? today : weekDays[0]?.date

    const validSelectedDate =
      typeof selectedDate === 'string' &&
      weekDays.some((day) => day.date === selectedDate)
        ? selectedDate
        : (weekDays.find((day) => day.date === fromParam)?.date ??
          weekDays.find((day) => day.date === toParam)?.date ??
          fallbackDate)

    if (validSelectedDate) selectedDate = validSelectedDate
  }

  const { getToken } = await auth()
  const token = await getToken()

  const watchedShowsPromise: Promise<WatchingShow[]> = token
    ? fetchWatching(token).catch(() => [])
    : Promise.resolve([])

  // Calendar fetches a bounded week — use the API max (100) so all shows in the
  // week are returned. List view uses PAGE_LIMIT and paginates client-side.
  const calendarLimit = 100
  const [eventsResult, venues, genres, watchedShows] = await Promise.all([
    fetchEvents(
      fetchParams,
      token,
      view === 'cal' ? calendarLimit : PAGE_LIMIT,
    ),
    fetchVenues(token),
    fetchGenres(token).catch(() => []),
    watchedShowsPromise,
  ])

  const watchedIds = new Set(watchedShows.map((show) => show.eventId))

  const { data: events, total, limit } = eventsResult

  if (view === 'cal') {
    weekDays = weekDays.map((day) => ({
      ...day,
      hasEvents: events.some((event) => event.date === day.date),
    }))
  }

  const firstEventIsToday =
    events.length > 0 && events[0] !== undefined && isToday(events[0].date)
  const heroEvent = firstEventIsToday ? events[0] : null
  const listEvents = heroEvent && view === 'list' ? events.slice(1) : events

  const isFiltered =
    params['search'] ??
    params['venueSlug'] ??
    params['from'] ??
    params['filterWhen'] ??
    params['filterWhere'] ??
    params['filterPrice'] ??
    params['filterVibe']
  const currentOffset = eventsResult.offset

  // Compute week navigation hrefs server-side so they can be passed as plain
  // strings to the CalendarView client component.
  const calPrevWeekHref: string | null =
    weekOffset > 0
      ? (() => {
          const prevParams = new URLSearchParams()
          for (const [key, value] of Object.entries(params)) {
            if (
              typeof value === 'string' &&
              key !== 'offset' &&
              key !== 'selectedDate'
            ) {
              prevParams.set(key, value)
            }
          }
          prevParams.set('view', 'cal')
          const prevOffset = weekOffset - 1
          if (prevOffset > 0) {
            prevParams.set('weekOffset', String(prevOffset))
          } else {
            prevParams.delete('weekOffset')
          }
          return `/events?${prevParams.toString()}`
        })()
      : null

  const calNextWeekHref = (() => {
    const nextParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (
        typeof value === 'string' &&
        key !== 'offset' &&
        key !== 'selectedDate'
      ) {
        nextParams.set(key, value)
      }
    }
    nextParams.set('view', 'cal')
    nextParams.set('weekOffset', String(weekOffset + 1))
    return `/events?${nextParams.toString()}`
  })()

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-4 sm:px-6 sm:pb-6">
      {/* Filter bar */}
      <div className="mb-5">
        <Suspense>
          <FilterBar venues={venues} genres={genres} />
        </Suspense>
      </div>

      {events.length === 0 && view === 'list' && (
        <EmptyState
          state={isFiltered ? 'filtered' : 'no-data'}
          eyebrow={
            isFiltered ? copy.emptyFilteredEyebrow : copy.emptyTonightEyebrow
          }
          title={isFiltered ? copy.emptyFilteredTitle : copy.emptyTonightTitle}
          body={isFiltered ? copy.emptyFilteredBody : copy.emptyTonightBody}
          {...(isFiltered
            ? {
                secondaryCta: {
                  label: copy.emptyFilteredCta,
                  href: '/events',
                },
              }
            : {
                primaryCta: {
                  label: copy.emptyTonightCta,
                  href: '/events?filterWhen=this-week',
                },
              })}
        />
      )}

      {heroEvent && view === 'list' && (
        <div className="mb-6">
          <HeroEventCard
            event={heroEvent}
            isWatching={watchedIds.has(heroEvent.id)}
          />
        </div>
      )}

      {view === 'cal' && selectedDate && (
        <CalendarView
          days={weekDays}
          events={events}
          initialSelectedDate={selectedDate}
          today={today}
          watchedIds={Array.from(watchedIds)}
          prevWeekHref={calPrevWeekHref}
          nextWeekHref={calNextWeekHref}
        />
      )}

      {view === 'list' && events.length > 0 && (
        <Suspense>
          <EventsList
            initialEvents={listEvents}
            initialOffset={currentOffset}
            total={total}
            limit={limit}
            initialWatchedIds={Array.from(watchedIds)}
          />
        </Suspense>
      )}
    </main>
  )
}
