import Link from 'next/link'
import type { EventWithVenue } from '@concert-crawl/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { EventImage } from '../event-image'
import { formatShowTime, formatPrice, artistInitial } from '../definitions/lib'
import { copy } from '../definitions/copy'

interface EventCardProps {
  event: EventWithVenue
  className?: string
}

export function EventCard({ event, className }: EventCardProps) {
  const showTime = formatShowTime(event.showTime)
  const doorsTime = formatShowTime(event.doorsTime)
  const price = formatPrice(event.ticketPriceMin, event.ticketPriceMax)
  const isCancelled = event.status === 'cancelled'
  const isPostponed = event.status === 'postponed'

  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        'group flex gap-3 rounded-xl border border-border bg-bg-elevated p-3 transition-colors hover:border-border-strong hover:bg-surface-1',
        className,
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-20">
        <EventImage
          src={event.imageUrl}
          alt={event.artist}
          fallbackInitial={artistInitial(event.artist)}
          className="h-full w-full"
        />
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <p className="truncate text-sm font-semibold text-fg group-hover:text-signal transition-colors">
          {event.artist}
        </p>
        {event.title !== event.artist && (
          <p className="truncate text-xs text-fg-muted">{event.title}</p>
        )}
        <p className="text-xs text-fg-subtle">{event.venue.name}</p>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {isCancelled && (
            <Badge variant="destructive">{copy.cancelledLabel}</Badge>
          )}
          {isPostponed && (
            <Badge variant="secondary">{copy.postponedLabel}</Badge>
          )}
          {showTime && !isCancelled && (
            <span className="text-xs text-fg-muted">
              {copy.showLabel} {showTime}
            </span>
          )}
          {doorsTime && !isCancelled && (
            <span className="text-xs text-fg-subtle">
              {copy.doorsLabel} {doorsTime}
            </span>
          )}
          {price && !isCancelled && (
            <span className="text-xs font-medium text-signal">{price}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
