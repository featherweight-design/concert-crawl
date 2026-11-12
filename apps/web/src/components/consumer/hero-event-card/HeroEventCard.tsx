import Link from 'next/link';
import type { EventWithVenue } from '@concert-crawl/types';
import { Panel } from '@/components/consumer/image-slot';
import { WatchShowButton } from '../watch-show-button';
import { formatShowTime, venueShort } from '../definitions/lib';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { EventTitleBlock } from '../event-title-block';
import { bucketMembersFor } from '@concert-crawl/types';
import { MetaRow } from '../event-row/MetaRow';
import { orderGenres } from '../event-row/lib/order-genres';
import { genreRing } from '../event-row/lib/genre-ring';
import { genreColor, NEUTRAL_GENRE_COLOR } from '@/lib/genre-color';
import { HeroFollowingBadge } from '@/components/consumer/spotify/FollowHighlight';

const copy = CONSUMER_COPY;

/** The spotlight art per breakpoint (B+ boards): 97 below `sm`, 130 from it. */
const HERO_ART_SIZES = [
  { size: 97, className: 'block sm:hidden' },
  { size: 130, className: 'hidden sm:block' },
] as const;

/** The spotlight's outer glow in its lead genre's color; none when ungenred. */
export const spotlightGlow = (genre: string): string =>
  genre === NEUTRAL_GENRE_COLOR
    ? 'none'
    : `0 0 28px color-mix(in oklch, ${genre} 22%, transparent)`;

interface HeroEventCardProps {
  event: EventWithVenue;
  label?: string;
  isWatching?: boolean;
  /** The active Vibe filter, so the hero leads with the genre the rows do. */
  filterVibe?: string | undefined;
}

export function HeroEventCard({
  event,
  label = copy.heroTonight,
  isWatching = false,
  filterVibe,
}: HeroEventCardProps) {
  const showTime = formatShowTime(event.showTime);
  // Present only for connected viewers (#763 PR 6) — swaps the eyebrow badge.
  const isFollowed = (event.followedArtists?.length ?? 0) > 0;
  const priceDisplay =
    event.ticketPriceMin != null
      ? `$${parseFloat(event.ticketPriceMin).toFixed(0)}`
      : null;
  // B+ rule 2: the lead genre rings the art and starts the card's edge, which
  // runs into the accent. The pair shares one chip, as on a row, ordered the
  // way the rows order it so an active Vibe filter leads both.
  const [leadGenre, secondGenre] = orderGenres(
    event.genre ?? [],
    bucketMembersFor(filterVibe),
  );
  const genre = genreColor(leadGenre) ?? NEUTRAL_GENRE_COLOR;

  return (
    <div
      data-testid="hero-event-card"
      className="relative overflow-hidden rounded-[14px]"
      style={{
        border: '1.5px solid transparent',
        // The fill carries a genre wash off the image side, as a carded row
        // does (EventRow), stronger here because the spotlight is the one card
        // on the page meant to read warm. The light theme showed the old flat
        // fill most plainly.
        background: `linear-gradient(90deg, color-mix(in oklch, ${genre} 20%, var(--surface-1)), var(--surface-1) 55%) padding-box, linear-gradient(120deg, ${genre}, var(--accent)) border-box`,
        // An ungenred show gets no glow, the rule `genreRing` and `stageRing`
        // follow (addendum-2 item 23). The B5 boards draw only a genred
        // spotlight, so none shows a neutral one glowing.
        boxShadow: spotlightGlow(genre),
      }}
    >
      <Link
        href={`/events/${event.id}`}
        className="flex items-center gap-3.5 p-3.5"
      >
        {/* A square panel rather than the wide banner this slot used to crop
            to. The old shape stretched a square source across ≈4:1 and lost
            whatever made it recognisable (#1525). The B+ boards size it 97px
            at phone widths and 130 from `sm`. Each size is its own panel so
            each takes the detail density its own size derives (97 is tile,
            130 is hero); one panel at '100%' could only guess. The hidden one
            is display:none, so its lazy image is never fetched. */}
        <div
          data-testid="hero-image-ring"
          className="shrink-0 overflow-hidden rounded-[10px]"
          style={{
            boxShadow: genreRing(genre),
          }}
        >
          {HERO_ART_SIZES.map(({ size, className }) => (
            <span key={size} data-hero-art={size} className={className}>
              <Panel
                surface="event"
                name={event.artist}
                artworkUrl={event.imageUrl}
                photoUrl={event.artistPhotoUrl ?? null}
                size={size}
                radius={10}
              />
            </span>
          ))}
        </div>

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
            supportClassName="hidden sm:block"
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
          {/* MetaRow's measure pass collapses the pair to its lead when the
              column is narrow, as a row does, rather than overflowing at 320. */}
          {leadGenre && (
            <MetaRow
              chips={[
                {
                  key: `genre-${leadGenre}`,
                  label: leadGenre,
                  tone: 'neutral',
                  genreDot: leadGenre,
                  ...(secondGenre ? { secondaryLabel: secondGenre } : {}),
                },
              ]}
              budget={1}
              className="mt-2 pr-9"
            />
          )}
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
  );
}
