import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { EventWithVenue, EventsListResponse } from '@concert-crawl/types'
import { publicApiClient } from '@/lib/api'
import { AppHeader } from '@/components/consumer/app-header'
import { EventImage } from '@/components/consumer/event-image'
import { EventCard } from '@/components/consumer/event-card'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  formatEventDate,
  formatShowTime,
  formatPrice,
  artistInitial,
} from '@/components/consumer/definitions/lib'
import { copy } from '@/components/consumer/definitions/copy'

interface EventDetailPageProps {
  params: Promise<{ id: string }>
}

async function fetchEvent(id: string): Promise<EventWithVenue | null> {
  try {
    return await publicApiClient.get<EventWithVenue>(`/v1/events/${id}`)
  } catch {
    return null
  }
}

async function fetchRelated(
  venueSlug: string,
  excludeId: string,
): Promise<EventWithVenue[]> {
  try {
    const result = await publicApiClient.get<EventsListResponse>(
      `/v1/events?venueSlug=${encodeURIComponent(venueSlug)}&limit=4&offset=0`,
    )
    return result.data.filter((ev) => ev.id !== excludeId).slice(0, 3)
  } catch {
    return []
  }
}

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const { id } = await params
  const event = await fetchEvent(id)

  if (!event) notFound()

  const related = await fetchRelated(event.venue.slug, event.id)

  const showTime = formatShowTime(event.showTime)
  const doorsTime = formatShowTime(event.doorsTime)
  const price = formatPrice(event.ticketPriceMin, event.ticketPriceMax)
  const dateLabel = formatEventDate(event.date, event.venue.timezone)

  const isCancelled = event.status === 'cancelled'
  const isPostponed = event.status === 'postponed'

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

        <article className="flex flex-col gap-8">
          {/* Hero image */}
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl sm:aspect-[21/9]">
            <EventImage
              src={event.imageUrl}
              alt={event.artist}
              fallbackInitial={artistInitial(event.artist)}
              className="h-full w-full"
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
            />
          </div>

          {/* Event header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                {isCancelled && (
                  <Badge variant="destructive">{copy.cancelledLabel}</Badge>
                )}
                {isPostponed && (
                  <Badge variant="secondary">{copy.postponedLabel}</Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-fg sm:text-3xl">
                {event.artist}
              </h1>
              {event.title !== event.artist && (
                <p className="text-base text-fg-muted">{event.title}</p>
              )}
            </div>

            {event.ticketUrl && !isCancelled && (
              <a
                href={event.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'default', size: 'lg' })}
              >
                {copy.ticketsCta}
              </a>
            )}
          </div>

          {/* Event meta */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-bg-elevated p-4 sm:grid-cols-4">
            <MetaItem label="Date" value={dateLabel} />
            {showTime && <MetaItem label={copy.showLabel} value={showTime} />}
            {doorsTime && (
              <MetaItem label={copy.doorsLabel} value={doorsTime} />
            )}
            {price && <MetaItem label="Price" value={price} highlight />}
          </div>

          {/* Venue */}
          <div className="flex flex-col gap-1">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
              Venue
            </h2>
            <Link
              href={`/venues/${event.venue.slug}`}
              className="text-base font-medium text-fg hover:text-signal transition-colors"
            >
              {event.venue.name}
            </Link>
            <p className="text-sm text-fg-subtle">{event.venue.city}</p>
            <a
              href={event.venue.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-signal hover:underline"
            >
              Venue website →
            </a>
          </div>

          {/* Description */}
          {event.description && (
            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-fg-subtle">
                About
              </h2>
              <p className="text-sm leading-relaxed text-fg-muted whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Genre tags */}
          {event.genre && event.genre.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.genre.map((genre) => (
                <Badge key={genre} variant="secondary">
                  {genre}
                </Badge>
              ))}
            </div>
          )}

          {/* Related shows at this venue */}
          {related.length > 0 && (
            <section aria-label="More at this venue">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-fg-subtle">
                More at {event.venue.name}
              </h2>
              <div className="flex flex-col gap-2">
                {related.map((relatedEvent) => (
                  <EventCard key={relatedEvent.id} event={relatedEvent} />
                ))}
              </div>
            </section>
          )}
        </article>
      </main>
    </div>
  )
}

function MetaItem({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-fg-subtle">{label}</span>
      <span
        className={
          highlight
            ? 'text-sm font-semibold text-signal'
            : 'text-sm font-medium text-fg'
        }
      >
        {value}
      </span>
    </div>
  )
}
