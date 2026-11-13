// The read-only public mirror of an event page, rendered at /e/:id (#72).
//
// This is what someone sees when they tap a shared poster link out of iMessage
// or Slack with no Concert Crawl account. It is the protected event detail page
// with every account-shaped affordance removed:
//
//   NOT rendered — WatchZone / WatchShowButton, the "I'm going!" commitment
//   strip, DetailFollowStrip, EventDetailPriceBlock and every price-submission
//   path inside it, community reports, the first-timer guide chip, and the
//   report footer. The price appears as a flat read-only row instead.
//
// Related shows DO render, through the same EventRow the public browse list
// uses. The row no longer carries a watch control on any surface, so the
// `logged-out-watch` funnel entry #794 opened from here now starts from the
// related show's own detail page instead. The mirror still does not diverge
// from browse.
//
// In their place there is one account card: Create an account, with a quiet
// "Already in? Sign in" under it (B+ B8, bp-s-public_m). Its Eye is the
// Watching glyph as decoration, naming what an account adds; there is no
// watch control here and no second show-tracking concept.
import { Fragment } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import type { EventDetailResponse, EventWithVenue } from '@concert-crawl/types';

import { EventRow, fromEventWithVenue } from '@/components/consumer/event-row';
import { SectionHeader } from '@/components/consumer/section-header';

import { Eye } from 'lucide-react';
import {
  EventStage,
  EventStageMeta,
  eventCountdown,
} from '@/components/consumer/event-stage';
import { GenreChips } from '@/components/consumer/GenreChips';
import { EventTitleBlock } from '@/components/consumer/event-title-block';
import {
  formatEventDate,
  formatPrice,
  formatShowTime,
  isEventPast,
} from '@/components/consumer/definitions/lib';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';
import { ShareButton } from './ShareButton';
import { EventAbout } from './EventAbout';
import { PublicEventView } from './PublicEventView';

import {
  InfoRow,
  IconPin,
  IconCalendar,
  IconClock,
  IconUsers,
} from './InfoRow';
import { EventTicketCta } from './EventTicketCta';

const copy = CONSUMER_COPY.eventDetail;
const publicCopy = CONSUMER_COPY.publicEvent;

export interface PublicEventDetailProps {
  event: EventDetailResponse;
  /** Other upcoming shows at the same venue. Empty when the fetch failed. */
  related: EventWithVenue[];
  /**
   * The bill follow block (native following, PR 7), rendered directly under
   * the primary CTA. A SLOT rather than data: the block is a client component
   * that resolves entitlement and owns its own writes, and passing it in is
   * what keeps this screen from being forked to carry it (design table ED-06).
   *
   * Optional, and every caller predating PR 7 omits it — nothing renders in
   * its place when it is absent. It is the one account-shaped affordance the
   * mirror carries, and it earns the exception: a visitor who arrived from
   * someone else's poster is exactly the person worth recruiting, and the
   * signed-out follow control is a sign-up route by construction (#794 §3.10).
   */
  billBlock?: ReactNode;
}

export const PublicEventDetail = ({
  event,
  related,
  billBlock,
}: PublicEventDetailProps) => {
  const showTime = formatShowTime(event.showTime);
  const doorsTime = formatShowTime(event.doorsTime);
  const dateLabel = formatEventDate(event.date, event.venue.timezone);
  const doorsShow =
    doorsTime && showTime
      ? `${doorsTime} / ${showTime}`
      : (showTime ?? doorsTime ?? '—');

  // ticketUrl/eventUrl are crawler-derived and untrusted — filter the CTA
  // target to http(s) so a compromised venue page can't inject a
  // javascript:/data: href into the rendered link (#1152).
  const safeTicketUrl = isSafeHttpUrl(event.ticketUrl) ? event.ticketUrl : null;
  const safeEventUrl = isSafeHttpUrl(event.eventUrl) ? event.eventUrl : null;
  const ctaHref =
    safeTicketUrl ??
    safeEventUrl ??
    (isSafeHttpUrl(event.venue.websiteUrl) ? event.venue.websiteUrl : null);

  // A poster link is often opened days after the gig. The protected page keeps
  // its CTA on past shows because a signed-in browser navigated there
  // deliberately; here the whole CTA is dropped, since a "Get tickets" button
  // pointing at a dead vendor page is the first thing a new visitor would tap.
  const past = isEventPast(event.date, event.venue.timezone);

  // Sold out beats a stale number: a shared link is often opened after the
  // show sold out, and a price next to a gone show reads as availability.
  const priceLabel =
    event.priceStatus === 'soldout'
      ? copy.soldOut
      : formatPrice(event.ticketPriceMin, event.ticketPriceMax);

  return (
    // overflow-x-clip guarantees the 320px mobile baseline never scrolls
    // horizontally, exactly as on the protected page (#973).
    <div className="flex flex-1 flex-col overflow-x-clip">
      {/* The same stage as the protected page. The mirror does not diverge
          from the page it mirrors, so this moved with it (#1525, B+ B8). */}
      <EventStage
        name={event.artist}
        leadGenre={event.genre?.[0] ?? null}
        countdown={eventCountdown(
          event.date,
          event.venue.timezone,
          event.status,
        )}
        status={event.status}
        surface="event"
        artworkUrl={event.imageUrl}
        photoUrl={event.artistPhotoUrl ?? null}
        actions={
          /* The mirror has no BackChip — there is nowhere to go back to — but
             it does share. A visitor who landed here from someone else's post
             is exactly the person most likely to pass it on, and the poster is
             Free for everyone including the logged out. Anonymous, so it
             renders no signature line. */
          <ShareButton event={event} authed={false} inline />
        }
      >
        {/* Artist names stay plain text here: /artists is itself gated
            before launch, so linking them from the mirror would hand a
            signed-out visitor a second dead end. */}
        <EventTitleBlock
          headliner={event.artist}
          supportingArtists={event.supportingArtists}
          tourName={event.tourName}
          fallbackTitle={event.title}
          status={event.status}
          delistedAt={event.delistedAt}
          surface="detail"
          headlinerAs="h1"
          headSize="var(--stage-head)"
          centered
          beforePill={
            <GenreChips
              genres={event.genre}
              className="mt-3 justify-center sm:justify-start"
            />
          }
        />
        <EventStageMeta
          date={event.date}
          timezone={event.venue.timezone}
          venueName={event.venue.name}
          status={event.status}
        />
      </EventStage>
      <PublicEventView eventId={event.id} />

      <div className="flex-1">
        <div className="mx-auto w-full max-w-[824px] box-border px-[18px] sm:px-8 pb-24 sm:pb-16 pt-5">
          {/* The board's order (bp-s-public_m, _d): what it costs, the way to
              buy it, then the account. Side by side from `sm` up, the account
              card in the right column. */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-4">
            {(priceLabel || !past || billBlock) && (
              <div className="flex min-w-0 flex-col gap-5 sm:flex-1">
                {/* A flat, read-only price card rather than
                    EventDetailPriceBlock. That block is a client component
                    that wires up price submission, tier-add and report modals
                    behind `useAuth`; on a signed-out mirror its community
                    handoff card would invite a visitor with no account to
                    submit a price. With no price there is no card at all,
                    because the only honest thing to put there is that same
                    invitation. */}
                {priceLabel && (
                  <div
                    data-testid="public-event-price"
                    className="rounded-[14px] px-5 py-4"
                    style={{
                      background: 'var(--surface-1)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <p
                      className="m-0 font-mono uppercase text-fg-subtle"
                      style={{ fontSize: 10, letterSpacing: '0.2em' }}
                    >
                      {copy.priceRowLabel}
                    </p>
                    <p
                      className="m-0 mt-1 text-fg"
                      style={{
                        fontSize: 30,
                        fontWeight: 900,
                        letterSpacing: '-0.03em',
                        lineHeight: 1.1,
                      }}
                    >
                      {priceLabel}
                    </p>
                  </div>
                )}

                {!past && (
                  <EventTicketCta
                    status={event.status}
                    delistedAt={event.delistedAt}
                    ticketHref={safeTicketUrl}
                    soldOut={event.priceStatus === 'soldout'}
                    href={ctaHref}
                    hasDirectLink={Boolean(safeTicketUrl || safeEventUrl)}
                  />
                )}

                {/* Under the CTA, in the same column at every width.
                    Truthy rather than a nullish check on purpose: the wrapper
                    exists only to hold the slot, so a falsy slot draws no
                    wrapper at all. */}
                {billBlock && <div>{billBlock}</div>}
              </div>
            )}

            {/* The one account-shaped thing on the page, and it points at
                /sign-up. This used to point at /sign-in on the grounds that
                /sign-up bounced to the invite wall at /auth/code — but
                middleware lists `/sign-up(.*)` and `/e/(.*)` in the same
                `isPublicOnceLaunched` matcher, so they open in the same deploy.
                A signed-out visitor can therefore never be standing here while
                /sign-up is still walled (#1359). The board adds the quiet
                "Already in? Sign in" line under it for the visitor who does
                have an account.

                Both carry `redirect_url` so the visitor lands back on the show
                that was shared with them. Without it /auth/complete falls
                through to /events and the link they were sent is gone. */}
            <div
              data-testid="public-account-card"
              className="flex flex-col gap-4 rounded-[16px] p-5 sm:w-[340px] sm:shrink-0"
              style={{
                border: '1.5px solid transparent',
                background:
                  'linear-gradient(var(--surface-1), var(--surface-1)) padding-box, linear-gradient(120deg, var(--signal), var(--accent)) border-box',
              }}
            >
              <div className="flex items-center gap-3">
                {/* Decoration: the Watching glyph names what an account adds.
                    The prompt beside it says it in words. */}
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-[12px]"
                  style={{
                    background:
                      'color-mix(in oklch, var(--signal) 14%, var(--surface-1))',
                    border:
                      '1px solid color-mix(in oklch, var(--signal) 34%, var(--border))',
                    color: 'var(--signal)',
                  }}
                >
                  <Eye size={20} aria-hidden />
                </span>
                <p
                  className="m-0 text-fg"
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    lineHeight: 1.35,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {publicCopy.signUpPrompt}
                </p>
              </div>
              <Link
                href={`/sign-up?redirect_url=${encodeURIComponent(`/e/${event.id}`)}`}
                className="inline-flex w-full items-center justify-center rounded-[12px] px-5 text-fg-on-accent"
                style={{
                  minHeight: 48,
                  background:
                    'linear-gradient(90deg, var(--signal), var(--cta-end))',
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 800,
                  fontSize: 15,
                  letterSpacing: '-0.01em',
                  textDecoration: 'none',
                }}
              >
                {publicCopy.signUpButton}
              </Link>
              <p className="m-0 text-center text-[13px] text-fg-muted">
                {publicCopy.alreadyIn}{' '}
                <Link
                  href={`/sign-in?redirect_url=${encodeURIComponent(`/e/${event.id}`)}`}
                  className="font-bold text-signal underline-offset-2 hover:underline"
                >
                  {publicCopy.signInLink}
                </Link>
              </p>
            </div>
          </div>

          {/* Info block. The venue row is not a link for the same reason the
              artist names aren't. */}
          <div className="mt-5 border-y border-border py-1">
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

          <EventAbout description={event.description} status={event.status} />

          {/* Same EventRow as the public browse list. */}
          {related.length > 0 && (
            <div className="mt-6">
              <SectionHeader
                large
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
                  <EventRow show={fromEventWithVenue(rel)} surface="related" />
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
