import Link from 'next/link'
import type { EventWithVenue } from '@concert-crawl/types'
import { EventImage } from '../event-image'
import { WatchShowButton } from '../watch-show-button'
import { formatShowTime, venueShort } from '../definitions/lib'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { EventTitleBlock } from '../event-title-block'
import { GenreChips } from '../GenreChips'

const copy = CONSUMER_COPY

interface HeroEventCardProps {
  event: EventWithVenue
  label?: string
  isWatching?: boolean
}

export function HeroEventCard({
  event,
  label = copy.heroTonight,
  isWatching = false,
}: HeroEventCardProps) {
  const showTime = formatShowTime(event.showTime)
  const priceDisplay =
    event.ticketPriceMin != null
      ? `$${parseFloat(event.ticketPriceMin).toFixed(0)}`
      : null

  return (
    <div className="relative overflow-hidden rounded-[12px] border border-border-strong bg-surface-1">
      <Link href={`/events/${event.id}`} className="block">
        {/* Hero image — fixed 180px height */}
        <div className="relative h-[180px] w-full">
          <EventImage
            src={event.imageUrl}
            alt={event.artist}
            artist={event.artist}
            identityScale="hero"
            className="h-full w-full"
            fill
            sizes="(max-width: 1024px) 100vw, 720px"
          />
          {/* Bottom scrim */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, transparent 30%, var(--bg) 100%)',
            }}
            aria-hidden
          />
          {/* Tonight's pick badge */}
          <div className="absolute left-2.5 top-2.5">
            <span
              className="rounded-[4px] bg-accent px-2 py-[3px] text-fg-on-accent"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              ★ {label}
            </span>
          </div>
        </div>

        {/* Content — overlaps image by 40px */}
        <div className="relative -mt-10 px-3.5 pb-3.5 pt-3">
          <EventTitleBlock
            headliner={event.artist}
            supportingArtists={event.supportingArtists}
            tourName={event.tourName}
            fallbackTitle={event.title}
            status={event.status}
            surface="hero"
            maxInline={3}
          />
          <div
            className="mt-2 flex items-center gap-1.5 text-fg-muted"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.02em',
            }}
          >
            <span className="text-signal">{venueShort(event.venue.name)}</span>
            {showTime && (
              <>
                <span className="opacity-40">·</span>
                <span>{showTime}</span>
              </>
            )}
            {priceDisplay && (
              <>
                <span className="opacity-40">·</span>
                <span className="text-signal">{priceDisplay}</span>
              </>
            )}
          </div>
          <GenreChips genres={event.genre} className="mt-2" />
        </div>
      </Link>

      {/* Watch button — outside Link so clicks don't navigate */}
      <div className="absolute bottom-3.5 right-3.5 z-10">
        <WatchShowButton eventId={event.id} initialWatching={isWatching} />
      </div>
    </div>
  )
}
