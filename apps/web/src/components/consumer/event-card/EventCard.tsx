import Link from 'next/link'
import type { EventWithVenue } from '@concert-crawl/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { EventImage } from '../event-image'
import { WatchShowButton } from '../watch-show-button'
import { formatShowTime, venueShort } from '../definitions/lib'
import { copy } from '../definitions/copy'

interface EventCardProps {
  event: EventWithVenue
  className?: string
  isWatching?: boolean
}

type SourceKind = 'primary' | 'resale' | 'community'

function resolveKind(
  priceSource: EventWithVenue['priceSource'],
): SourceKind | null {
  if (!priceSource) return null
  if (priceSource === 'seatgeek') return 'resale'
  if (priceSource === 'community') return 'community'
  return 'primary'
}

// ── PriceChip — inline price with trust tell ─────────────────────
// No directional arrows: we lack historical data for delta detection.
// Trust tell: "R" = resale, "C" = community.

function PriceChip({
  price,
  kind,
}: {
  price: string
  kind: SourceKind | null
}) {
  const trustTell =
    kind === 'resale'
      ? {
          letter: 'R',
          color: 'oklch(0.65 0.20 25)',
          bg: 'color-mix(in oklab, oklch(0.65 0.20 25) 16%, transparent)',
        }
      : kind === 'community'
        ? {
            letter: 'C',
            color: 'var(--trust-community)',
            bg: 'color-mix(in oklab, var(--trust-community) 14%, transparent)',
          }
        : null

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-ui)',
          fontWeight: 800,
          fontSize: 13,
          color: 'var(--signal)',
          letterSpacing: '-0.01em',
        }}
      >
        {price}
      </span>
      {trustTell && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            color: trustTell.color,
            letterSpacing: '0.06em',
            marginLeft: 1,
            opacity: 0.85,
            padding: '1px 3px',
            borderRadius: 3,
            background: trustTell.bg,
            lineHeight: 1,
          }}
        >
          {trustTell.letter}
        </span>
      )}
    </span>
  )
}

export function EventCard({
  event,
  className,
  isWatching = false,
}: EventCardProps) {
  const showTime = formatShowTime(event.showTime)
  const isCancelled = event.status === 'cancelled'
  const isPostponed = event.status === 'postponed'

  const priceChipText =
    event.ticketPriceMin != null
      ? `$${Math.round(parseFloat(event.ticketPriceMin))}`
      : null

  const sourceKind = resolveKind(event.priceSource)

  return (
    <div
      data-testid="event-card"
      className={cn('group flex items-center gap-2.5 py-2.5', className)}
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
            fontSize: '9.5px',
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
      </div>

      {/* Watch button */}
      <WatchShowButton eventId={event.id} initialWatching={isWatching} />

      {/* Price chip — links to event detail */}
      <Link
        href={`/events/${event.id}`}
        className="shrink-0 text-right"
        tabIndex={-1}
      >
        {!isCancelled && !isPostponed && priceChipText ? (
          <PriceChip price={priceChipText} kind={sourceKind} />
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
