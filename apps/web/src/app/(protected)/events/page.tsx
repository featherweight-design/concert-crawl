import { Fragment, Suspense } from 'react'
import type { EventsListResponse, VenuePublic } from '@concert-crawl/types'
import { publicApiClient } from '@/lib/api'
import { AppHeader } from '@/components/consumer/app-header'
import { BottomNav } from '@/components/consumer/bottom-nav'
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
  const offsetParam = params['offset']
  if (typeof offsetParam === 'string' && /^\d+$/.test(offsetParam)) {
    const parsed = Number(offsetParam)
    if (Number.isSafeInteger(parsed) && parsed >= 0)
      qs.set('offset', String(parsed))
  }
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

  const { data: events, total, limit } = eventsResult

  const firstEventIsToday =
    events.length > 0 && events[0] !== undefined && isToday(events[0].date)
  const heroEvent = firstEventIsToday ? events[0] : null
  const listEvents = heroEvent ? events.slice(1) : events

  const groups = new Map<string, typeof events>()
  for (const event of listEvents) {
    const key = event.date
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(event)
  }

  const isFiltered = params['search'] ?? params['venueSlug'] ?? params['from']
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

        {events.length === 0 && (
          <EmptyState
            message={isFiltered ? copy.emptyFiltered : copy.emptyTonight}
            {...(isFiltered
              ? { action: { label: copy.emptyFilteredCta, href: '/events' } }
              : {})}
          />
        )}

        {heroEvent && (
          <div className="mb-6">
            <HeroEventCard event={heroEvent} />
          </div>
        )}

        {groups.size > 0 && (
          <div className="flex flex-col gap-6">
            {Array.from(groups.entries()).map(([date, dateEvents]) => {
              const label = dateGroupLabel(date)
              const isTonight = label.toLowerCase() === 'tonight'
              return (
                <section key={date} aria-label={label}>
                  {/* Day group header */}
                  <div className="mb-1 flex items-center gap-2 py-2">
                    <span
                      className="shrink-0 text-[12px] uppercase"
                      style={{
                        fontFamily: 'var(--font-ui)',
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        color: isTonight ? 'var(--accent)' : 'var(--fg)',
                      }}
                    >
                      {label}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                    <span
                      className="shrink-0 text-fg-subtle"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
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
                        <EventCard event={event} />
                      </Fragment>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}

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

      <BottomNav />
    </div>
  )
}
