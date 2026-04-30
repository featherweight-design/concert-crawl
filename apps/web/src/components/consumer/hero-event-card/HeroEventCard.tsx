import Link from 'next/link'
import type { EventWithVenue } from '@concert-crawl/types'
import { EventImage } from '../event-image'
import { formatShowTime, venueShort, artistInitial } from '../definitions/lib'
import { copy } from '../definitions/copy'

interface HeroEventCardProps {
  event: EventWithVenue
  label?: string
}

export function HeroEventCard({
  event,
  label = copy.heroTonight,
}: HeroEventCardProps) {
  const showTime = formatShowTime(event.showTime)
  const priceDisplay =
    event.ticketPriceMin != null
      ? `$${parseFloat(event.ticketPriceMin).toFixed(0)}`
      : null

  return (
    <Link
      href={`/events/${event.id}`}
      className="relative block overflow-hidden rounded-[12px] border border-border-strong bg-surface-1"
    >
      {/* Hero image — fixed 180px height */}
      <div className="relative h-[180px] w-full">
        <EventImage
          src={event.imageUrl}
          alt={event.artist}
          fallbackInitial={artistInitial(event.artist)}
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
        <p
          className="text-[20px] text-fg"
          style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
          }}
        >
          {event.artist}
        </p>
        {event.title !== event.artist && (
          <p
            className="mt-0.5 text-[12px] font-medium text-fg-muted"
            style={{ lineHeight: 1.3 }}
          >
            {event.title}
          </p>
        )}
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
        {event.genre && event.genre.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {event.genre.map((genre) => (
              <span
                key={genre}
                className="rounded-[4px] bg-surface-3 px-[7px] py-[2px] text-fg-muted"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.03em',
                }}
              >
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
