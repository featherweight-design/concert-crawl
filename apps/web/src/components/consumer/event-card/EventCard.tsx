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
import { pickBrowseHeadline } from '@/components/consumer/price-region/lib/pick-headline'

const copy = CONSUMER_COPY

interface EventCardProps {
  event: EventWithVenue
  className?: string
  isWatching?: boolean
}

// Defensive fallback for events whose API row omits priceByTier (legacy
// payloads, draft events, anything mid-migration). The list endpoint now
// always populates priceByTier when at least one corroborated submission
// exists for the event (closes #787), so the hot path is the helper-based
// resolution above this comment.
function resolveListChipKindLegacy(
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

  // Browse table #7 (locked): mirror pickTierHeadline / compareTierRows
  // from the API by reading the headline directly off the canonical
  // priceByTier payload. The helper returns { price, kind } picked from
  // the cheapest tier with a non-null headline; falls through to the
  // legacy ticketPriceMin + (priceSource, priceVendor) heuristic when the
  // event's priceByTier is null (defensive — list endpoint should always
  // populate it for events with at least one corroborated submission).
  const browseHeadline = pickBrowseHeadline(event.priceByTier)
  const priceNum =
    browseHeadline !== null
      ? Math.round(browseHeadline.price)
      : event.ticketPriceMin != null
        ? Math.round(parseFloat(event.ticketPriceMin))
        : null
  const listChipKind: MTListChipKind =
    browseHeadline !== null
      ? browseHeadline.kind
      : resolveListChipKindLegacy(event.priceSource, event.priceVendor)

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
