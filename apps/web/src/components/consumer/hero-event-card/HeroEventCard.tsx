import Link from 'next/link'
import type { EventWithVenue } from '@concert-crawl/types'
import { buttonVariants } from '@/components/ui/button'
import { EventImage } from '../event-image'
import { formatShowTime, formatPrice, artistInitial } from '../definitions/lib'
import { copy } from '../definitions/copy'

interface HeroEventCardProps {
  event: EventWithVenue
  // Phase 6+: pass label="Community Pick" when engagement-driven hero is active
  label?: string
}

export function HeroEventCard({
  event,
  label = copy.heroTonight,
}: HeroEventCardProps) {
  const showTime = formatShowTime(event.showTime)
  const doorsTime = formatShowTime(event.doorsTime)
  const price = formatPrice(event.ticketPriceMin, event.ticketPriceMax)

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border-strong bg-bg-elevated">
      {/* Full-bleed image */}
      <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
        <EventImage
          src={event.imageUrl}
          alt={event.artist}
          fallbackInitial={artistInitial(event.artist)}
          className="h-full w-full"
          fill
          sizes="(max-width: 1024px) 100vw, 1024px"
        />
        {/* Bottom gradient for text legibility */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, var(--bg-elevated) 0%, transparent 60%)',
          }}
          aria-hidden
        />

        {/* Tonight badge */}
        <div className="absolute left-4 top-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-signal px-3 py-1 text-xs font-semibold text-bg">
            <span className="size-1.5 rounded-full bg-bg/60 animate-pulse" />
            {label}
          </span>
        </div>
      </div>

      {/* Content overlay at bottom of image */}
      <div className="px-4 pb-4 pt-3 sm:px-6">
        <p className="text-xl font-bold text-fg sm:text-2xl">{event.artist}</p>
        {event.title !== event.artist && (
          <p className="mt-0.5 text-sm text-fg-muted">{event.title}</p>
        )}
        <p className="mt-1 text-sm text-fg-subtle">{event.venue.name}</p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
            {showTime && (
              <span>
                {copy.showLabel} {showTime}
              </span>
            )}
            {doorsTime && (
              <span className="text-fg-subtle">
                {copy.doorsLabel} {doorsTime}
              </span>
            )}
            {price && (
              <span className="font-semibold text-signal">{price}</span>
            )}
          </div>

          {event.ticketUrl && (
            <Link
              href={event.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'default', size: 'sm' })}
              onClick={(e) => e.stopPropagation()}
            >
              {copy.ticketsCta}
            </Link>
          )}
          <Link
            href={`/events/${event.id}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Details
          </Link>
        </div>
      </div>
    </div>
  )
}
