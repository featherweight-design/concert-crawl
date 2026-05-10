import { Fragment, Suspense } from 'react'
import type {
  EventsListResponse,
  VenuePublic,
  WatchingShow,
} from '@concert-crawl/types'
import { publicApiClient } from '@/lib/api'
import { auth } from '@/lib/auth'
import { fetchWatching } from '@/lib/watching'
import { AppHeader } from '@/components/consumer/app-header'
import { BottomNav } from '@/components/consumer/bottom-nav'
import { HeroEventCard } from '@/components/consumer/hero-event-card'
import { EventCard } from '@/components/consumer/event-card'
import { FilterBar } from '@/components/consumer/filter-bar'
import { LoadMoreButton } from '@/components/consumer/load-more'
import { EmptyState } from '@/components/consumer/empty-state'
import {
  currentWeekDays,
  dateGroupLabel,
  filterWhenToDateRange,
  isToday,
  type WeekDayInfo,
} from '@/components/consumer/definitions/lib'
import { copy } from '@/components/consumer/definitions/copy'
import { WeekStrip } from '@/components/consumer/week-strip'

export const dynamic = 'force-dynamic'

const PAGE_LIMIT = 20

type CalendarWeekDay = WeekDayInfo & { hasEvents: boolean }

interface BrowsePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function fetchEvents(
  params: Record<string, string | string[] | undefined>,
): Promise<EventsListResponse> {
  const qs = new URLSearchParams()
  if (typeof params['search'] === 'string') qs.set('search', params['search'])
  // filterWhere takes precedence over the legacy venueSlug param
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
  qs.set('limit', String(PAGE_LIMIT))
  return publicApiClient.get<EventsListResponse>(`/v1/events?${qs.toString()}`)
}

async function fetchVenues(): Promise<VenuePublic[]> {
  return publicApiClient.get<VenuePublic[]>('/v1/venues')
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
  let weekDays: CalendarWeekDay[] = currentWeekDays().map((day) => ({
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

    const validSelectedDate =
      typeof selectedDate === 'string' &&
      weekDays.some((day) => day.date === selectedDate)
        ? selectedDate
        : (weekDays.find((day) => day.date === fromParam)?.date ??
          weekDays.find((day) => day.date === toParam)?.date ??
          weekDays[0]?.date)

    if (validSelectedDate) selectedDate = validSelectedDate
  }

  const { getToken } = await auth()
  const token = await getToken()

  const watchedShowsPromise: Promise<WatchingShow[]> = token
    ? fetchWatching(token).catch(() => [])
    : Promise.resolve([])

  const [eventsResult, venues, watchedShows] = await Promise.all([
    fetchEvents(fetchParams),
    fetchVenues(),
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

  const groups = new Map<string, typeof events>()
  for (const event of listEvents) {
    if (view === 'cal' && selectedDate && event.date !== selectedDate) continue
    const key = event.date
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(event)
  }

  const isFiltered =
    params['search'] ??
    params['venueSlug'] ??
    params['from'] ??
    params['filterWhen'] ??
    params['filterWhere'] ??
    params['filterPrice'] ??
    params['filterVibe']
  const currentOffset = eventsResult.offset

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-4 sm:px-6 sm:pb-6">
        {/* Filter bar */}
        <div className="mb-5">
          <Suspense>
            <FilterBar venues={venues} />
          </Suspense>
        </div>

        {events.length === 0 && view === 'list' && (
          <EmptyState
            message={isFiltered ? copy.emptyFiltered : copy.emptyTonight}
            {...(isFiltered
              ? { action: { label: copy.emptyFilteredCta, href: '/events' } }
              : {})}
          />
        )}

        {heroEvent && view === 'list' && (
          <div className="mb-6">
            <HeroEventCard event={heroEvent} />
          </div>
        )}

        {view === 'cal' && selectedDate && (
          <WeekStrip
            days={weekDays}
            selectedDate={selectedDate}
            buildHref={(nextDate) => {
              const nextParams = new URLSearchParams()
              for (const [key, value] of Object.entries(params)) {
                if (typeof value === 'string' && key !== 'offset') {
                  nextParams.set(key, value)
                }
              }
              nextParams.set('view', 'cal')
              nextParams.set('selectedDate', nextDate)
              return `/events?${nextParams.toString()}`
            }}
          />
        )}

        {view === 'cal' && groups.size === 0 && (
          <p className="py-12 text-center text-sm text-fg-muted">
            No shows on this day.
          </p>
        )}

        {groups.size > 0 && (
          <div className="flex flex-col gap-6">
            {Array.from(groups.entries()).map(([date, dateEvents]) => {
              const label = dateGroupLabel(date)
              const isTonight = label.toLowerCase() === 'tonight'
              return (
                <section key={date} aria-label={label}>
                  {/* Day group header */}
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
                  {/* Event rows with dividers */}
                  <div>
                    {dateEvents.map((event, i) => (
                      <Fragment key={event.id}>
                        {i > 0 && (
                          <div
                            className="h-px bg-border"
                            style={{ marginLeft: 58 }}
                          />
                        )}
                        <EventCard
                          event={event}
                          isWatching={watchedIds.has(event.id)}
                        />
                      </Fragment>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}

        {events.length > 0 && view === 'list' && (
          <div className="mt-8">
            <Suspense>
              <LoadMoreButton
                currentOffset={currentOffset}
                limit={limit}
                total={total}
              />
            </Suspense>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
