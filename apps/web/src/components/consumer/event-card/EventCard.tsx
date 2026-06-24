import Link from 'next/link'
import type { EventWithVenue } from '@concert-crawl/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { EventImage } from '../event-image'
import { WatchShowButton } from '../watch-show-button'
import { GenreChips } from '../GenreChips'
import { formatShowTime, venueShort } from '../definitions/lib'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import {
  MTListChip,
  type MTListChipKind,
} from '@/components/consumer/price-region'

const copy = CONSUMER_COPY

interface EventCardProps {
  event: EventWithVenue
  className?: string
  isWatching?: boolean
}

// Fallback path while the browse list endpoint does not surface `priceByTier`
// (tracked as GH issue #787 — once the list response carries per-tier data,
// this helper is replaced with `pickBrowseHeadline(event.priceByTier)`).
function resolveListChipKind(
  priceSource: EventWithVenue['priceSource'],
  priceVendor: string | null | undefined,
): MTListChipKind {
  if (!priceSource) return null
  if (priceSource === 'seatgeek') return 'resale'
  if (priceSource === 'community') {
    if (priceVendor === 'VenueBoxOffice') return 'boxoffice'
    if (priceVendor === 'SeatGeek') return 'resale'
    return 'community'
  }
  return null // primary → no special chip
}

export function EventCard({
  event,
  className,
  isWatching = false,
}: EventCardProps) {
  const showTime = formatShowTime(event.showTime)
  const isCancelled = event.status === 'cancelled'
  const isPostponed = event.status === 'postponed'

  const priceNum =
    event.ticketPriceMin != null
      ? Math.round(parseFloat(event.ticketPriceMin))
      : null
  const listChipKind = resolveListChipKind(event.priceSource, event.priceVendor)

  return (
    <div
      data-testid="event-card"
      className={cn('group flex items-start gap-2.5 py-2.5', className)}
    >
      {/* Thumbnail — 48×48, links to event detail */}
      <Link
        href={`/events/${event.id}`}
        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md"
        tabIndex={-1}
        aria-hidden
      >
        <EventImage
          src={event.imageUrl}
          alt={event.artist}
          artist={event.artist}
          identityScale="tile"
          className="h-full w-full"
        />
      </Link>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col">
        {isCancelled || isPostponed ? (
          <div className="flex items-center gap-2">
            <Link
              href={`/events/${event.id}`}
              className="truncate text-sm font-bold text-fg transition-colors hover:text-signal"
            >
              {event.artist}
            </Link>
            {isCancelled && (
              <Badge variant="destructive">{copy.cancelledLabel}</Badge>
            )}
            {isPostponed && (
              <Badge variant="secondary">{copy.postponedLabel}</Badge>
            )}
          </div>
        ) : (
          <Link
            href={`/events/${event.id}`}
            className="truncate text-sm font-bold text-fg transition-colors hover:text-signal"
          >
            {event.artist}
          </Link>
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
            fontSize: '11px',
            letterSpacing: '0.02em',
          }}
        >
          <Link
            href={`/venues/${event.venue.slug}`}
            data-testid="venue-name-link"
            className="hover:underline"
          >
            <span>{venueShort(event.venue.name)}</span>
          </Link>
          {showTime && (
            <>
              <span className="opacity-40">·</span>
              <span>{showTime}</span>
            </>
          )}
        </p>
        <GenreChips genres={event.genre} className="mt-1" maxChips={3} />
      </div>

      {/* Watch button */}
      <WatchShowButton eventId={event.id} initialWatching={isWatching} />

      {/* Price chip — links to event detail */}
      <Link
        href={`/events/${event.id}`}
        className="shrink-0 text-right"
        tabIndex={-1}
      >
        {!isCancelled && !isPostponed && priceNum !== null ? (
          // Property table §8 Browse table #1–4: list chips always render the
          // "from $X" prefix to signal that this is the cheapest tier, not the
          // only tier. MTListChip defaults to from=true; pass explicitly to
          // keep the contract obvious at the call site.
          <MTListChip price={priceNum} kind={listChipKind} from={true} />
        ) : !isCancelled && !isPostponed ? (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9.5px',
              color: 'var(--fg-subtle)',
              letterSpacing: '0.04em',
            }}
          >
            tba
          </span>
        ) : null}
      </Link>
    </div>
  )
}
