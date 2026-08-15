import Link from 'next/link'
import type { EventWithVenue } from '@concert-crawl/types'
import { Panel } from '@/components/consumer/image-slot'
import { WatchShowButton } from '../watch-show-button'
import { formatShowTime, venueShort } from '../definitions/lib'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { EventTitleBlock } from '../event-title-block'
import { GenreChips } from '../GenreChips'
import { HeroFollowingBadge } from '@/components/consumer/spotify/FollowHighlight'

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
  // Present only for connected viewers (#763 PR 6) — swaps the eyebrow badge.
  const isFollowed = (event.followedArtists?.length ?? 0) > 0
  const priceDisplay =
    event.ticketPriceMin != null
      ? `$${parseFloat(event.ticketPriceMin).toFixed(0)}`
      : null

  return (
    <div className="relative overflow-hidden rounded-[14px] border border-border-strong bg-surface-1">
      <Link
        href={`/events/${event.id}`}
        className="flex items-center gap-3.5 p-3.5"
      >
        {/* A square panel rather than the wide banner this slot used to crop
            to. The old shape stretched a square source across ≈4:1 and lost
            whatever made it recognisable (#1525). */}
        <Panel
          surface="event"
          name={event.artist}
          artworkUrl={event.imageUrl}
          photoUrl={event.artistPhotoUrl ?? null}
          size={112}
        />

        <div className="min-w-0 flex-1">
          {/* Eyebrow badge slot — the Spotify "Following" badge replaces the
              accent "★ Tonight's pick" badge when the bill matches a followed
              artist (#763 PR 6, follow-highlight mock). */}
          <div className="mb-1.5">
            {isFollowed ? (
              <HeroFollowingBadge />
            ) : (
              <span
                className="inline-block rounded-[4px] bg-accent px-2 py-[3px] text-fg-on-accent"
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
            )}
          </div>
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
            {/* The venue is the only elastic part of the line: the time and
                the price are short and always worth reading in full, so the
                name is what gives when the column is narrow. */}
            <span className="min-w-0 truncate text-signal">
              {venueShort(event.venue.name)}
            </span>
            {showTime && (
              <>
                <span className="shrink-0 opacity-40">·</span>
                <span className="shrink-0">{showTime}</span>
              </>
            )}
            {priceDisplay && (
              <>
                <span className="shrink-0 opacity-40">·</span>
                <span className="shrink-0 text-signal">{priceDisplay}</span>
              </>
            )}
          </div>
          {/* Right padding clears the watch button, which sits over this
              corner and is deliberately outside the Link. */}
          <GenreChips genres={event.genre} className="mt-2 pr-9" />
        </div>
      </Link>

      {/* Watch button — outside Link so clicks don't navigate */}
      <div className="absolute bottom-3.5 right-3.5 z-10">
        <WatchShowButton
          eventId={event.id}
          initialWatching={isWatching}
          artist={event.artist}
        />
      </div>
    </div>
  )
}
