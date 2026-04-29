import { Suspense } from 'react'
import type { EventsListResponse, VenuePublic } from '@concert-crawl/types'
import { publicApiClient } from '@/lib/api'
import { AppHeader } from '@/components/consumer/app-header'
import { HeroEventCard } from '@/components/consumer/hero-event-card'
import { EventCard } from '@/components/consumer/event-card'
import { FilterBar } from '@/components/consumer/filter-bar'
import { LoadMoreButton } from '@/components/consumer/load-more'
import { EmptyState } from '@/components/consumer/empty-state'
import { dateGroupLabel, isToday } from '@/components/consumer/definitions/lib'
import { copy } from '@/components/consumer/definitions/copy'

const PAGE_LIMIT = 20

interface BrowsePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function fetchEvents(
  params: Record<string, string | string[] | undefined>,
): Promise<EventsListResponse> {
  const qs = new URLSearchParams()
  if (typeof params['search'] === 'string') qs.set('search', params['search'])
  if (typeof params['venueSlug'] === 'string')
    qs.set('venueSlug', params['venueSlug'])
  if (typeof params['from'] === 'string') qs.set('from', params['from'])
  if (typeof params['offset'] === 'string') qs.set('offset', params['offset'])
  qs.set('limit', String(PAGE_LIMIT))

  return publicApiClient.get<EventsListResponse>(`/v1/events?${qs.toString()}`)
}

async function fetchVenues(): Promise<VenuePublic[]> {
  return publicApiClient.get<VenuePublic[]>('/v1/venues')
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams

  const [eventsResult, venues] = await Promise.all([
    fetchEvents(params),
    fetchVenues(),
  ])

  const { data: events, total, limit, offset } = eventsResult

  // Identify tonight's first event for the hero slot
  const firstEventIsToday =
    events.length > 0 && events[0] && isToday(events[0].date)
  const heroEvent = firstEventIsToday ? events[0] : null
  const listEvents = heroEvent ? events.slice(1) : events

  // Group remaining events by date
  const groups = new Map<string, typeof events>()
  for (const event of listEvents) {
    const key = event.date
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(event)
  }

  const isFiltered = params['search'] || params['venueSlug'] || params['from']
  const currentOffset =
    typeof params['offset'] === 'string' ? parseInt(params['offset'], 10) : 0

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        {/* Filter bar */}
        <div className="mb-6">
          <Suspense>
            <FilterBar venues={venues} />
          </Suspense>
        </div>

        {/* No results */}
        {events.length === 0 && (
          <EmptyState
            message={isFiltered ? copy.emptyFiltered : copy.emptyTonight}
            {...(isFiltered
              ? { action: { label: copy.emptyFilteredCta, href: '/events' } }
              : {})}
          />
        )}

        {/* Hero: tonight's first event */}
        {heroEvent && (
          <div className="mb-8">
            <HeroEventCard event={heroEvent} />
          </div>
        )}

        {/* Date-grouped event list */}
        {groups.size > 0 && (
          <div className="flex flex-col gap-8">
            {Array.from(groups.entries()).map(([date, dateEvents]) => (
              <section key={date} aria-label={dateGroupLabel(date)}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-fg-subtle">
                  {dateGroupLabel(date)}
                </h2>
                <div className="flex flex-col gap-2">
                  {dateEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Load more */}
        {events.length > 0 && (
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
    </div>
  )
}
