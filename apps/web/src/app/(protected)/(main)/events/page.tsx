import { Suspense } from 'react'
import { headers } from 'next/headers'
import type {
  EventsAvailabilityResponse,
  EventsListResponse,
  VenuePublic,
  WatchingShow,
} from '@concert-crawl/types'
import { publicApiClient, apiClient, ApiError } from '@/lib/api'
import { isScaRegion } from '@/lib/sca-region'
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
  pickCalendarSelectedDate,
  type WeekDayInfo,
} from '@/components/consumer/definitions/lib'
import { localDateString } from '@/lib/time'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { pickerWindow } from '@/components/consumer/jump-picker/date-math'
import { fetchAvailability } from '@/lib/queries/availability'
import { SpotifyStatusBanner } from '@/components/consumer/spotify/SpotifyStatusBanner'
import { SpotifyLogo } from '@/components/brand/spotify-logo'
import { SPOTIFY_COPY } from '@/components/consumer/spotify/definitions/copy'

const copy = CONSUMER_COPY

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
  taste = false,
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
  if (taste) qs.set('taste', '1')
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
  }

  const { getToken } = await auth()
  const token = await getToken()

  const watchedShowsPromise: Promise<WatchingShow[]> = token
    ? fetchWatching(token).catch(() => [])
    : Promise.resolve([])

  // Taste filter (#763 PR 7): server-gated behind the spotify-sync
  // entitlement, so only send taste=1 with a token. If the API rejects it
  // (401/403 — signed out mid-session, entitlement lapsed, or a tampered
  // URL), fall back to the unfiltered list instead of erroring the page;
  // tasteApplied drives the scope banner so the UI never claims a filter
  // the API didn't apply.
  const tasteRequested = params['filterTaste'] === '1' && token != null
  const eventsPromise: Promise<{
    response: EventsListResponse
    tasteApplied: boolean
  }> = (async () => {
    // Calendar fetches a bounded week — use the API max (100) so all shows in
    // the week are returned. List view uses PAGE_LIMIT and paginates
    // client-side.
    const viewLimit = view === 'cal' ? 100 : PAGE_LIMIT
    try {
      return {
        response: await fetchEvents(
          fetchParams,
          token,
          viewLimit,
          tasteRequested,
        ),
        tasteApplied: tasteRequested,
      }
    } catch (err) {
      if (
        tasteRequested &&
        err instanceof ApiError &&
        (err.status === 401 || err.status === 403)
      ) {
        console.error('taste filter rejected — falling back to unfiltered', err)
        return {
          response: await fetchEvents(fetchParams, token, viewLimit, false),
          tasteApplied: false,
        }
      }
      throw err
    }
  })()

  const [eventsFetch, venues, genres, watchedShows, requestHeaders] =
    await Promise.all([
      eventsPromise,
      fetchVenues(token),
      fetchGenres(token).catch(() => []),
      watchedShowsPromise,
      headers(),
    ])
  const eventsResult = eventsFetch.response
  const tasteApplied = eventsFetch.tasteApplied
  // Monetization spec §1.7: SCA notice gating for the tier picker the locked
  // taste chip can open. Unknown (local dev, header absent) fails safe to true.
  const scaRegion = isScaRegion(requestHeaders.get('x-vercel-ip-country'))

  const watchedIds = new Set(watchedShows.map((show) => show.eventId))

  // SSR-prefetch the availability window (date→count) for the jump picker so
  // react-query is seeded and all in-picker month paging is client-side. Only
  // needed in calendar view; a failure degrades gracefully to a client fetch.
  let initialAvailability: EventsAvailabilityResponse | undefined
  if (view === 'cal') {
    const availabilityWindow = pickerWindow(today)
    try {
      initialAvailability = await fetchAvailability(
        availabilityWindow.from,
        availabilityWindow.to,
        token,
      )
    } catch (err) {
      console.error('availability prefetch failed', err)
      initialAvailability = undefined
    }
  }

  const { data: events, total, limit } = eventsResult

  if (view === 'cal') {
    weekDays = weekDays.map((day) => ({
      ...day,
      hasEvents: events.some((event) => event.date === day.date),
    }))
    // Pick selectedDate after weekDays.hasEvents is populated so the fallback
    // can prefer the first day with shows on week-arrow nav (#636).
    selectedDate = pickCalendarSelectedDate({
      weekDays,
      userProvidedSelectedDate: selectedDate,
      fromParam,
      toParam,
      today,
    })
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
    params['filterVibe'] ??
    (tasteApplied ? '1' : undefined)
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
      {/* Broken-Spotify-link notice — renders nothing unless the connection
          is in an error/revoked state. */}
      <SpotifyStatusBanner />

      {/* Filter bar */}
      <div className="mb-5">
        <Suspense>
          <FilterBar venues={venues} genres={genres} scaRegion={scaRegion} />
        </Suspense>
      </div>

      {/* Taste scope banner — only when the API actually applied taste=1
          (taste-filter.jsx mock). */}
      {tasteApplied && (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2"
          style={{
            background:
              'color-mix(in oklch, var(--signal) 10%, var(--surface-1))',
            border:
              '1px solid color-mix(in oklch, var(--signal) 28%, var(--border))',
          }}
        >
          <SpotifyLogo size={16} />
          <span className="text-xs font-semibold text-fg">
            {total === 1
              ? SPOTIFY_COPY.tasteFilter.bannerSingular
              : SPOTIFY_COPY.tasteFilter.banner(total)}
          </span>
        </div>
      )}

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
          initialAvailability={initialAvailability}
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
