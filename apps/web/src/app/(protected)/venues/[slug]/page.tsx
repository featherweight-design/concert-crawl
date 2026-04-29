import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { VenueWithEvents, Event } from '@concert-crawl/types'
import { publicApiClient } from '@/lib/api'
import { AppHeader } from '@/components/consumer/app-header'
import { EmptyState } from '@/components/consumer/empty-state'
import { buttonVariants } from '@/components/ui/button'
import {
  formatEventDate,
  formatShowTime,
  formatPrice,
} from '@/components/consumer/definitions/lib'
import { copy } from '@/components/consumer/definitions/copy'

interface VenueProfilePageProps {
  params: Promise<{ slug: string }>
}

async function fetchVenueWithEvents(
  slug: string,
): Promise<VenueWithEvents | null> {
  try {
    return await publicApiClient.get<VenueWithEvents>(`/v1/venues/${slug}`)
  } catch {
    return null
  }
}

export default async function VenueProfilePage({
  params,
}: VenueProfilePageProps) {
  const { slug } = await params
  const result = await fetchVenueWithEvents(slug)

  if (!result) notFound()

  const { venue, upcomingEvents } = result

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        {/* Back link */}
        <Link
          href="/events"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-fg-subtle hover:text-fg transition-colors"
        >
          ← All shows
        </Link>

        {/* Venue hero — designed for future Claude-generated imagery (full-bleed slot) */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-bg-elevated">
          {/* Full-bleed hero placeholder: replace with <VenueHeroImage> when Claude-generated imagery ships */}
          <div className="flex aspect-[16/7] items-center justify-center bg-surface-2 sm:aspect-[21/7]">
            <span className="text-6xl font-black text-fg-subtle/20 select-none">
              {venue.name.charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="px-6 py-5">
            <h1 className="text-2xl font-bold text-fg sm:text-3xl">
              {venue.name}
            </h1>
            <p className="mt-1 text-sm text-fg-subtle">{venue.city}</p>
            <a
              href={venue.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-signal hover:underline"
            >
              Venue website →
            </a>
          </div>
        </div>

        {/* Upcoming shows */}
        <section aria-label={copy.venueUpcoming}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-fg-subtle">
            {copy.venueUpcoming}
          </h2>

          {upcomingEvents.length === 0 ? (
            <EmptyState message={copy.venueNoShows} />
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingEvents.map((event) => (
                <VenueEventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function VenueEventRow({ event }: { event: Event }) {
  const showTime = formatShowTime(event.showTime)
  const price = formatPrice(event.ticketPriceMin, event.ticketPriceMax)
  const dateLabel = formatEventDate(event.date, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex items-center gap-4 rounded-xl border border-border bg-bg-elevated px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface-1"
    >
      {/* Date column */}
      <div className="w-24 shrink-0">
        <p className="text-sm font-medium text-fg-muted">{dateLabel}</p>
        {showTime && <p className="text-xs text-fg-subtle">{showTime}</p>}
      </div>

      {/* Artist / title */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg group-hover:text-signal transition-colors">
          {event.artist}
        </p>
        {event.title !== event.artist && (
          <p className="truncate text-xs text-fg-muted">{event.title}</p>
        )}
      </div>

      {/* Price + tickets */}
      <div className="flex shrink-0 items-center gap-3">
        {price && (
          <span className="text-xs font-medium text-signal">{price}</span>
        )}
        {event.ticketUrl && (
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(ev) => ev.stopPropagation()}
            className={buttonVariants({ variant: 'outline', size: 'xs' })}
          >
            {copy.ticketsCta}
          </a>
        )}
      </div>
    </Link>
  )
}
