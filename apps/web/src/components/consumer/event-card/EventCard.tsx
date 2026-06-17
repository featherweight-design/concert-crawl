import Link from 'next/link'
import type { EventWithVenue } from '@concert-crawl/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { EventImage } from '../event-image'
import { WatchShowButton } from '../watch-show-button'
import { GenreChips } from '../GenreChips'
import { formatShowTime, venueShort } from '../definitions/lib'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY

interface EventCardProps {
  event: EventWithVenue
  className?: string
  isWatching?: boolean
}

type SourceKind = 'primary' | 'resale' | 'community' | 'boxoffice'

const GOLD = 'oklch(0.66 0.14 78)'
const CORAL = 'oklch(0.65 0.20 25)'
const COMMUNITY = 'var(--trust-community)'

function resolveKind(
  priceSource: EventWithVenue['priceSource'],
  priceVendor: string | null | undefined,
): SourceKind | null {
  if (!priceSource) return null
  if (priceSource === 'seatgeek') return 'resale'
  if (priceSource === 'community') {
    if (priceVendor === 'VenueBoxOffice') return 'boxoffice'
    if (priceVendor === 'SeatGeek') return 'resale'
    return 'community'
  }
  return 'primary'
}

// ── PriceChip — inline price with trust tell ─────────────────────
// No directional arrows: we lack historical data for delta detection.
// Trust tell: boxoffice → gold ★, "R" = resale, "C" = community.

function PriceChip({
  price,
  kind,
}: {
  price: string
  kind: SourceKind | null
}) {
  const trustTell =
    kind === 'boxoffice'
      ? { color: GOLD, bg: `color-mix(in oklab, ${GOLD} 22%, transparent)` }
      : kind === 'resale'
        ? {
            letter: 'R',
            color: CORAL,
            bg: `color-mix(in oklab, ${CORAL} 16%, transparent)`,
          }
        : kind === 'community'
          ? {
              letter: 'C',
              color: COMMUNITY,
              bg: `color-mix(in oklab, ${COMMUNITY} 14%, transparent)`,
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
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            color: trustTell.color,
            letterSpacing: '0.06em',
            marginLeft: 1,
            opacity: 0.85,
            padding: kind === 'boxoffice' ? '2px 3px' : '1px 3px',
            borderRadius: 3,
            background: trustTell.bg,
            lineHeight: 1,
          }}
        >
          {kind === 'boxoffice' ? (
            <svg width="7" height="7" viewBox="0 0 10 10" aria-hidden>
              <path
                d="M5 1l1.18 2.46L9 3.78l-2 1.92.55 2.8L5 7.2 2.45 8.5 3 5.7 1 3.78l2.82-.32L5 1z"
                fill={GOLD}
              />
            </svg>
          ) : (
            (trustTell as { letter: string }).letter
          )}
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

  const sourceKind = resolveKind(event.priceSource, event.priceVendor)

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
