// The read-only public mirror of an event page, rendered at /e/:id (#72).
//
// This is what someone sees when they tap a shared poster link out of iMessage
// or Slack with no Concert Crawl account. It is the protected event detail page
// with every account-shaped affordance removed:
//
//   NOT rendered — WatchZone / WatchShowButton, the "I'm going!" commitment
//   strip, DetailFollowStrip, price submission, community reports, the
//   first-timer guide chip, and the report footer.
//
// Related shows DO render: they go through the same EventCard the public browse
// list uses, so nothing account-shaped rides along with them.
//
// In their place there is exactly one sign-in CTA. The Watching affordance on
// the authed page is the lucide Eye; the mirror simply omits it rather than
// substituting another glyph — there is no second show-tracking concept.
import { Fragment } from 'react'
import Link from 'next/link'
import type { EventDetailResponse, EventWithVenue } from '@concert-crawl/types'

import { EventCard } from '@/components/consumer/event-card/EventCard'
import { SectionHeader } from '@/components/consumer/section-header'

import { EventImage } from '@/components/consumer/event-image'
import { GenreChips } from '@/components/consumer/GenreChips'
import { EventTitleBlock } from '@/components/consumer/event-title-block'
import { SetlistPreview } from '@/components/consumer/setlist-preview'
import { EventDetailPriceBlock } from '@/components/consumer/EventDetailClient'
import {
  formatEventDate,
  formatShowTime,
  isEventPast,
} from '@/components/consumer/definitions/lib'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { isSafeHttpUrl } from '@/lib/is-safe-http-url'

import { InfoRow, IconPin, IconCalendar, IconClock, IconUsers } from './InfoRow'
import { EventTicketCta } from './EventTicketCta'

const copy = CONSUMER_COPY.eventDetail
const publicCopy = CONSUMER_COPY.publicEvent

interface PublicEventDetailProps {
  event: EventDetailResponse
  /** Other upcoming shows at the same venue. Empty when the fetch failed. */
  related: EventWithVenue[]
}

export const PublicEventDetail = ({
  event,
  related,
}: PublicEventDetailProps) => {
  const showTime = formatShowTime(event.showTime)
  const doorsTime = formatShowTime(event.doorsTime)
  const dateLabel = formatEventDate(event.date, event.venue.timezone)
  const doorsShow =
    doorsTime && showTime
      ? `${doorsTime} / ${showTime}`
      : (showTime ?? doorsTime ?? '—')

  // ticketUrl/eventUrl are crawler-derived and untrusted — filter the CTA
  // target to http(s) so a compromised venue page can't inject a
  // javascript:/data: href into the rendered link (#1152).
  const safeTicketUrl = isSafeHttpUrl(event.ticketUrl) ? event.ticketUrl : null
  const safeEventUrl = isSafeHttpUrl(event.eventUrl) ? event.eventUrl : null
  const ctaHref =
    safeTicketUrl ??
    safeEventUrl ??
    (isSafeHttpUrl(event.venue.websiteUrl) ? event.venue.websiteUrl : null)

  // A poster link is often opened days after the gig. The protected page keeps
  // its CTA on past shows because a signed-in browser navigated there
  // deliberately; here the whole CTA is dropped, since a "Get tickets" button
  // pointing at a dead vendor page is the first thing a new visitor would tap.
  const past = isEventPast(event.date, event.venue.timezone)

  // EventDetailPriceBlock is reused for display, but every interactive
  // submission path inside it is unreachable without an account, so the fields
  // that route into those branches are dropped before it sees the event. What
  // survives is the corroborated headline price; pending, counter and per-tier
  // submission cards (which carry confirm / dispute / add-tier actions) do not
  // render at all. `reports` is empty for the same reason — the mirror never
  // fetches them.
  const displayEvent: EventDetailResponse = {
    ...event,
    pendingSubmissions: null,
    counterSubmission: null,
    priceByTier: null,
  }

  return (
    // overflow-x-clip guarantees the 320px mobile baseline never scrolls
    // horizontally, exactly as on the protected page (#973).
    <div className="flex flex-1 flex-col overflow-x-clip">
      {/* Hero — 300px, full-bleed */}
      <div className="relative w-full shrink-0" style={{ height: 300 }}>
        <EventImage
          src={event.imageUrl}
          alt={event.artist}
          artist={event.artist}
          identityScale="hero"
          className="h-full w-full"
          fill
          sizes="(max-width: 1024px) 100vw, 720px"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
          style={{ background: 'linear-gradient(transparent, var(--bg))' }}
          aria-hidden
        />
      </div>

      <div className="relative -mt-5 sm:-mt-[60px] sm:z-[1] flex-1">
        <div className="mx-auto w-full max-w-[880px] box-border px-[18px] sm:px-8 pb-24 sm:pb-16 sm:pt-5">
          <GenreChips genres={event.genre} className="mb-2" />

          {/* Artist names stay plain text here: /artists is itself gated
              before launch, so linking them from the mirror would hand a
              signed-out visitor a second dead end. */}
          <EventTitleBlock
            headliner={event.artist}
            supportingArtists={event.supportingArtists}
            tourName={event.tourName}
            fallbackTitle={event.title}
            status={event.status}
            surface="detail"
            headlinerAs="h1"
          />

          {/* Info block. The venue row is not a link for the same reason the
              artist names aren't. */}
          <div className="mt-4 border-y border-border py-1">
            <InfoRow
              icon={<IconPin />}
              label={copy.venueLabel}
              value={event.venue.name}
              data-testid="event-venue-name"
            />
            <InfoRow
              icon={<IconCalendar />}
              label={copy.dateLabel}
              value={dateLabel}
            />
            <InfoRow
              icon={<IconClock />}
              label={copy.doorsShowLabel}
              value={doorsShow}
            />
            <InfoRow
              icon={<IconUsers />}
              label={copy.agesLabel}
              value={copy.allAges}
            />
          </div>

          <div className="mt-4">
            <EventDetailPriceBlock
              event={displayEvent}
              reports={[]}
              currentUserId={null}
            />
          </div>

          {event.setlist && (
            <div className="mt-5">
              <SetlistPreview setlist={event.setlist} />
            </div>
          )}

          {!past && (
            <div className="mt-5">
              <EventTicketCta
                soldOut={event.priceStatus === 'soldout'}
                href={ctaHref}
                hasDirectLink={Boolean(safeTicketUrl || safeEventUrl)}
              />
            </div>
          )}

          {/* The one account-shaped thing on the page. /sign-in, never
              /sign-up: before launch sign-up bounces to the invite wall at
              /auth/code, which is a dead end for someone with no code. */}
          <div
            className="mt-5 flex flex-col items-center gap-3 rounded-xl px-5 py-6 text-center"
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
            }}
          >
            <p
              className="text-[13px] leading-[1.5] text-fg-muted"
              style={{ maxWidth: 320 }}
            >
              {publicCopy.signInPrompt}
            </p>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center rounded-[10px] px-5 text-fg-on-accent"
              style={{
                minHeight: 44,
                background: 'var(--accent)',
                fontFamily: 'var(--font-ui)',
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: '-0.01em',
                textDecoration: 'none',
              }}
            >
              {publicCopy.signInButton}
            </Link>
          </div>

          {event.description && (
            <div className="mt-4">
              <p
                className="mb-1.5 uppercase text-fg-subtle"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.06em',
                }}
              >
                {copy.aboutLabel}
              </p>
              <p
                className="text-[13px] leading-[1.55] text-fg-muted"
                style={{ textWrap: 'pretty' } as React.CSSProperties}
              >
                {event.description}
              </p>
            </div>
          )}

          {/* Related shows use the same EventCard the public browse list does,
              so nothing account-shaped rides along. */}
          {related.length > 0 && (
            <div className="mt-6">
              <SectionHeader
                title={`${copy.moreAtVenuePrefix} ${event.venue.name}`}
                count={`${related.length} ${related.length !== 1 ? copy.showPlural : copy.showSingular}`}
              />
              {related.map((rel, idx) => (
                <Fragment key={rel.id}>
                  {idx > 0 && (
                    <div
                      className="h-px bg-border"
                      style={{ marginLeft: 60 }}
                    />
                  )}
                  <EventCard event={rel} />
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
