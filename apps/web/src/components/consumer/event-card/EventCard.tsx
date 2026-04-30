import Link from 'next/link'
import type { EventWithVenue } from '@concert-crawl/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { EventImage } from '../event-image'
import { formatShowTime, artistInitial, venueShort } from '../definitions/lib'
import { copy } from '../definitions/copy'

interface EventCardProps {
  event: EventWithVenue
  className?: string
}

export function EventCard({ event, className }: EventCardProps) {
  const showTime = formatShowTime(event.showTime)
  const isCancelled = event.status === 'cancelled'
  const isPostponed = event.status === 'postponed'

  const priceDisplay =
    event.ticketPriceMin != null
      ? `$${parseFloat(event.ticketPriceMin).toFixed(0)}`
      : null

  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        'group flex items-center gap-2.5 py-2.5 transition-colors',
        className,
      )}
    >
      {/* Thumbnail — 48×48 */}
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md">
        <EventImage
          src={event.imageUrl}
          alt={event.artist}
          fallbackInitial={artistInitial(event.artist)}
          className="h-full w-full"
        />
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col">
        {isCancelled || isPostponed ? (
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-fg transition-colors group-hover:text-signal">
              {event.artist}
            </p>
            {isCancelled && (
              <Badge variant="destructive">{copy.cancelledLabel}</Badge>
            )}
            {isPostponed && (
              <Badge variant="secondary">{copy.postponedLabel}</Badge>
            )}
          </div>
        ) : (
          <p className="truncate text-sm font-bold text-fg transition-colors group-hover:text-signal">
            {event.artist}
          </p>
        )}
        {event.title !== event.artist && (
          <p className="truncate text-[12px] font-medium text-fg-muted">
            {event.title}
          </p>
        )}
        <p
          className="mt-0.5 flex items-center gap-1.5 text-fg-muted"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9.5px',
            letterSpacing: '0.02em',
          }}
        >
          <span>{venueShort(event.venue.name)}</span>
          {showTime && (
            <>
              <span className="opacity-40">·</span>
              <span>{showTime}</span>
            </>
          )}
        </p>
      </div>

      {/* Price */}
      <div className="shrink-0">
        {!isCancelled && priceDisplay ? (
          <span className="text-[13px] font-extrabold text-signal">
            {priceDisplay}
          </span>
        ) : !isCancelled ? (
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
        ) : null}
      </div>
    </Link>
  )
}
