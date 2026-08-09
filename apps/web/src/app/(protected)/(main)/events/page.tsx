import { Suspense } from 'react'
import { headers } from 'next/headers'
import type {
  CrewShow,
  CrewSummary,
  EventsAvailabilityResponse,
  EventsListResponse,
  SpotifyTastePicksResponse,
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
import { DiscoveryShelf } from '@/components/consumer/spotify/DiscoveryShelf'
import { SpotifyLogo } from '@/components/brand/spotify-logo'
import { SPOTIFY_COPY } from '@/components/consumer/spotify/definitions/copy'
import { fetchSpotifyConnection, fetchTastePicks } from '@/lib/spotify'
import { fetchCrews, fetchCrewShows } from '@/lib/crews'
import { CrewLensList } from '@/components/consumer/crews'
import { FollowShelf } from '@/components/consumer/following'
import { FOLLOWING_COPY } from '@/components/consumer/following/definitions/copy'
import {
  SHELF_SUGGESTION_POOL,
  SHELF_VISIBLE_CARDS,
} from '@/components/consumer/following/definitions/constants'
import type { ShelfMode } from '@/components/consumer/following/definitions/types'
import {
  datedFollows,
  followsToShelfArtists,
  hasSpotifyFollows,
  seedArtistSuggestions,
  seedFollowedArtists,
  suggestionsToShelfArtists,
} from '@/lib/following'

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
  following = false,
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
  if (following) qs.set('following', '1')
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
  // Follow scope (native following PR 4): identical server gating to taste,
  // and the same rejection contract, so both scopes share one fallback path.
  // `followingApplied` is read back off the RESPONSE rather than assumed from
  // the request — the banner must never claim a scope the API declined.
  const followingRequested = params['filterFollowing'] === '1' && token != null
  const eventsPromise: Promise<{
    response: EventsListResponse
    tasteApplied: boolean
    followingApplied: boolean
  }> = (async () => {
    // Calendar fetches a bounded week — use the API max (100) so all shows in
    // the week are returned. List view uses PAGE_LIMIT and paginates
    // client-side.
    const viewLimit = view === 'cal' ? 100 : PAGE_LIMIT
    try {
      const response = await fetchEvents(
        fetchParams,
        token,
        viewLimit,
        tasteRequested,
        followingRequested,
      )
      return {
        response,
        tasteApplied: tasteRequested,
        followingApplied:
          followingRequested && response.followingApplied === true,
      }
    } catch (err) {
      const scopeRequested = tasteRequested || followingRequested
      if (
        scopeRequested &&
        err instanceof ApiError &&
        (err.status === 401 || err.status === 403)
      ) {
        // One retry drops BOTH scopes. Which one the API rejected isn't in the
        // error, and a second probe to find out costs a round-trip to render a
        // list the viewer can re-scope in one tap.
        console.warn('scope filter rejected — falling back to unfiltered', err)
        return {
          response: await fetchEvents(fetchParams, token, viewLimit, false),
          tasteApplied: false,
          followingApplied: false,
        }
      }
      throw err
    }
  })()

  // SSR seed for the "Based on your taste" shelf (#763 staging r4): fetch in
  // parallel with the events list so the shelf paints in the same HTML pass
  // instead of popping in after the client entitlement + picks round-trips.
  // 401/403 is the expected non-entitled path; anything else is logged so
  // real outages stay visible. Every failure degrades to undefined → the
  // shelf falls back to its client fetch.
  const tastePicksPromise: Promise<SpotifyTastePicksResponse | undefined> =
    view === 'list' && token
      ? fetchTastePicks(token).catch((err: unknown) => {
          const expected =
            err instanceof ApiError &&
            (err.status === 401 || err.status === 403)
          if (!expected) console.error('taste picks SSR prefetch failed', err)
          return undefined
        })
      : Promise.resolve(undefined)

  // The lens pill needs the viewer's crews on the first paint or it pops in
  // after the list. A failure degrades to no pill rather than a broken page:
  // the calendar is the thing this route is for.
  // ⚠️ ONE fetch, TWO consumers. The scope chip's count and the shelf's mode
  // are both decided from this list. Do not add a second call for either.
  const followsPromise = seedFollowedArtists(token)

  const crewsPromise: Promise<CrewSummary[]> = token
    ? fetchCrews(token).catch((err: unknown) => {
        console.error('[browse] crew lens list load failed', err)
        return []
      })
    : Promise.resolve([])

  const [
    eventsFetch,
    venues,
    genres,
    watchedShows,
    initialTastePicks,
    crews,
    follows,
    requestHeaders,
  ] = await Promise.all([
    eventsPromise,
    fetchVenues(token),
    fetchGenres(token).catch(() => []),
    watchedShowsPromise,
    tastePicksPromise,
    crewsPromise,
    followsPromise,
    headers(),
  ])
  const eventsResult = eventsFetch.response
  const tasteApplied = eventsFetch.tasteApplied
  const followingApplied = eventsFetch.followingApplied
  // Monetization spec §1.7: SCA notice gating for the tier picker the locked
  // taste chip can open. Unknown (local dev, header absent) fails safe to true.
  const scaRegion = isScaRegion(requestHeaders.get('x-vercel-ip-country'))

  const watchedIds = new Set(watchedShows.map((show) => show.eventId))

  // An unknown or since-left crew id resolves to null, and the page reads as
  // resting rather than as an error: a stale shared link is not a fault.
  const lensParam = params['crew']
  const lensCrew =
    typeof lensParam === 'string'
      ? (crews.find((crew) => crew.id === lensParam) ?? null)
      : null
  let lensShows: CrewShow[] = []
  // Tracked separately from the empty list: a failed fetch that fell through to
  // `[]` would otherwise render as "nobody is going to anything".
  let lensFailed = false
  if (lensCrew !== null) {
    if (token) {
      try {
        lensShows = await fetchCrewShows(token, lensCrew.id)
      } catch (err) {
        console.error('[browse] crew lens shows load failed', err)
        lensFailed = true
      }
    } else {
      lensFailed = true
    }
  }
  const lensActive = lensCrew !== null

  // Everything the viewer already chose, minus the lens. Clearing the lens is
  // not a trip back to a bare /events.
  const clearLensParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (key === 'crew') continue
    if (typeof value === 'string') clearLensParams.set(key, value)
    else if (Array.isArray(value))
      for (const entry of value) clearLensParams.append(key, entry)
  }
  const clearLensQuery = clearLensParams.toString()
  const clearLensHref = clearLensQuery ? `/events?${clearLensQuery}` : '/events'

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

  // ── Follow surfaces (native following PR 4) ──────────────────────────
  //
  // A signed-out visitor provably follows nobody, so 0 is a fact rather than a
  // guess. With a token, `undefined` from the seed means the fetch FAILED, and
  // that stays `null` (unknown) all the way to the chip: treating "we couldn't
  // ask" as "you follow nobody" would pull the chip out from under a viewer
  // who follows fifty artists.
  const followCount: number | null =
    token === null ? 0 : (follows?.length ?? null)

  // The shelf only exists in the browse list, and the crew lens replaces that
  // list wholesale — a shelf above someone else's feed is a non sequitur.
  const shelfSlotOpen = view === 'list' && !lensActive
  // `zero` recruits, so it runs for logged-out visitors too (their badges
  // render locked and hand off to the tier picker). Unknown gets no shelf: the
  // Spotify taste shelf still has the slot in that case.
  const shelfMode: ShelfMode | null = !shelfSlotOpen
    ? null
    : followCount === null
      ? null
      : followCount === 0
        ? 'zero'
        : hasSpotifyFollows(follows ?? [])
          ? 'spotify'
          : 'some'

  // Serial by necessity: we can't know the follow count until the seed lands,
  // and fetching suggestions unconditionally would tax every browse load with
  // a call the large majority of viewers never see the result of. Same shape
  // as the fetchCrewShows await above.
  const suggestions =
    shelfMode === 'zero'
      ? await seedArtistSuggestions(SHELF_SUGGESTION_POOL)
      : undefined

  const shelfArtists =
    shelfMode === null
      ? []
      : shelfMode === 'zero'
        ? suggestionsToShelfArtists(suggestions ?? [])
        : followsToShelfArtists(datedFollows(follows ?? [])).slice(
            0,
            SHELF_VISIBLE_CARDS,
          )

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

  // Taste filter with zero hits and no Spotify linked (#763 staging
  // feedback): entitled viewers without a connection get an empty 200 from
  // taste=1 (no follow rows), so the generic "0 hits" state offers no way
  // forward. Check the connection only in that narrow case and swap in a
  // connect nudge. A failed check degrades to the generic empty state.
  let tasteNudgeConnect = false
  if (tasteApplied && events.length === 0 && view === 'list' && token) {
    try {
      const connection = await fetchSpotifyConnection(token)
      tasteNudgeConnect = connection.status === 'disconnected'
    } catch (err) {
      console.error(
        'spotify connection check for taste empty state failed',
        err,
      )
    }
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
    (tasteApplied ? '1' : undefined) ??
    (followingApplied ? '1' : undefined)
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
    // overflow-x-clip contains the DiscoveryShelf's full-bleed carousel (which
    // uses -mx-4 + overflow-x-auto to reach the viewport edge on mobile) so its
    // horizontal scroll never leaks to the page and breaks the 320px baseline.
    <main className="mx-auto w-full max-w-5xl flex-1 overflow-x-clip px-4 pb-20 pt-4 sm:px-6 sm:pb-6">
      {/* Broken-Spotify-link notice — renders nothing unless the connection
          is in an error/revoked state. */}
      <SpotifyStatusBanner />

      {/* One shelf slot, two claimants. The follow shelf wins it whenever the
          server could decide a mode, because following is the thing this
          surface is now for; the Spotify taste shelf keeps the slot only when
          the follow seed came back unknown. Deliberately NOT a removal of the
          taste shelf — it still renders for every viewer the follow seed
          couldn't answer for. */}
      {shelfMode !== null && followCount !== null ? (
        <FollowShelf
          mode={shelfMode}
          artists={shelfArtists}
          followCount={followCount}
          scaRegion={scaRegion}
        />
      ) : (
        view === 'list' &&
        !lensActive && (
          <DiscoveryShelf
            {...(initialTastePicks !== undefined && {
              initialPicks: initialTastePicks,
            })}
          />
        )
      )}

      {/* Filter bar */}
      <div className="mb-5">
        <Suspense>
          <FilterBar
            venues={venues}
            genres={genres}
            scaRegion={scaRegion}
            crews={crews}
            lensCount={lensFailed ? null : lensShows.length}
            followCount={followCount}
          />
        </Suspense>
      </div>

      {/* Follow scope banner — role="status" so a screen reader hears the
          list narrow when the chip is toggled, and rendered only when the API
          reported `followingApplied`. Same shell as the taste banner beside
          it, minus the Spotify mark: these follows are ours. */}
      {followingApplied && !lensActive && (
        <div
          role="status"
          className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2"
          style={{
            background:
              'color-mix(in oklch, var(--signal) 10%, var(--surface-1))',
            border:
              '1px solid color-mix(in oklch, var(--signal) 28%, var(--border))',
          }}
        >
          <span className="text-xs font-semibold text-fg">
            {total === 1
              ? FOLLOWING_COPY.bannerSingular
              : FOLLOWING_COPY.banner(total)}
          </span>
        </div>
      )}

      {/* Taste scope banner — only when the API actually applied taste=1
          (taste-filter.jsx mock). */}
      {tasteApplied && !tasteNudgeConnect && !lensActive && (
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

      {/* The lens replaces the calendar rather than composing with it: its feed
          is the crew's attendance query, which the events endpoint's filters
          have no purchase on. Everything below is Browse's own list. */}
      {lensActive && (
        <CrewLensList
          crewName={lensCrew.name}
          shows={lensShows}
          failed={lensFailed}
          clearLensHref={clearLensHref}
        />
      )}

      {tasteNudgeConnect && !lensActive && (
        <EmptyState
          state="filtered"
          eyebrow={SPOTIFY_COPY.tasteFilter.emptyNotConnected.eyebrow}
          title={SPOTIFY_COPY.tasteFilter.emptyNotConnected.title}
          body={SPOTIFY_COPY.tasteFilter.emptyNotConnected.body}
          primaryCta={{
            label: SPOTIFY_COPY.tasteFilter.emptyNotConnected.primaryCta,
            href: '/me?section=connections',
          }}
          secondaryCta={{
            label: SPOTIFY_COPY.tasteFilter.emptyNotConnected.secondaryCta,
            href: '/events',
          }}
        />
      )}

      {events.length === 0 &&
        view === 'list' &&
        !tasteNudgeConnect &&
        !lensActive && (
          <EmptyState
            state={isFiltered ? 'filtered' : 'no-data'}
            eyebrow={
              isFiltered ? copy.emptyFilteredEyebrow : copy.emptyTonightEyebrow
            }
            title={
              isFiltered ? copy.emptyFilteredTitle : copy.emptyTonightTitle
            }
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

      {heroEvent && view === 'list' && !lensActive && (
        <div className="mb-6">
          <HeroEventCard
            event={heroEvent}
            isWatching={watchedIds.has(heroEvent.id)}
          />
        </div>
      )}

      {view === 'cal' && selectedDate && !lensActive && (
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

      {view === 'list' && events.length > 0 && !lensActive && (
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
