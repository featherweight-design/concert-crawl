import Link from 'next/link'
import type { EventWithVenue, Event } from '@concert-crawl/types'
import { EventImage } from '../event-image'
import { formatShowTime, artistInitial } from '../definitions/lib'

interface SmallEventRowProps {
  event: EventWithVenue | Event
  date: string
  showVenue?: boolean
}

function getVenueName(event: EventWithVenue | Event): string | null {
  if ('venue' in event && event.venue) return event.venue.name
  return null
}

export function SmallEventRow({
  event,
  date,
  showVenue = true,
}: SmallEventRowProps) {
  const showTime = formatShowTime(event.showTime)
  const venueName = getVenueName(event)
  const priceDisplay =
    event.ticketPriceMin != null
      ? `$${parseFloat(event.ticketPriceMin).toFixed(0)}`
      : null

  const metaParts: string[] = []
  if (showVenue && venueName) metaParts.push(venueName)
  metaParts.push(date)
  if (showTime) metaParts.push(showTime)

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex items-center gap-2.5 py-2.5 transition-colors"
    >
      {/* Thumbnail — 40×40 */}
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
        <EventImage
          src={event.imageUrl}
          alt={event.artist}
          fallbackInitial={artistInitial(event.artist)}
          className="h-full w-full"
        />
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-[13px] font-bold text-fg transition-colors group-hover:text-signal">
          {event.artist}
        </p>
        <p
          className="mt-[1px] text-fg-muted"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.02em',
          }}
        >
          {metaParts.join(' · ')}
        </p>
      </div>

      {/* Price */}
      <div className="shrink-0">
        {priceDisplay ? (
          <span className="text-[12px] font-extrabold text-signal">
            {priceDisplay}
          </span>
        ) : (
          <span
            className="text-fg-subtle"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.03em',
            }}
          >
            tba
          </span>
        )}
      </div>
    </Link>
  )
}
