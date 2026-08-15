import { Fragment } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import type {
  EventDetailResponse,
  EventReport,
  EventsRelatedResponse,
  RelatedEvent,
} from '@concert-crawl/types'
import { resolveGuideViewerMode } from '@concert-crawl/types'
import { EventFirstTimerChip } from '@/components/consumer/venue-guide'
import { publicApiClient, apiClient } from '@/lib/api'
import { seedFollowedArtists } from '@/lib/following'
import { isSafeHttpUrl } from '@/lib/is-safe-http-url'
import { isScaRegion } from '@/lib/sca-region'
import { fetchEventReports } from '@/lib/events'
import { HeroBand } from '@/components/consumer/image-slot'
import { BackChip } from '@/components/consumer/back-chip/BackChip'
import { ShareButton } from '@/components/consumer/event-detail/ShareButton'
import { EventRow, fromEventWithVenue } from '@/components/consumer/event-row'
import { SectionHeader } from '@/components/consumer/section-header'
import { WatchZone } from '@/components/consumer/watchers'
import { EventDetailCtaBlock } from '@/components/consumer/going'
import { CrewGoingZone } from '@/components/consumer/crews'
import { SetlistPreview } from '@/components/consumer/setlist-preview'
import { GenreChips } from '@/components/consumer/GenreChips'
import {
  EventDetailBanners,
  EventDetailPriceBlock,
  EventDetailFooter,
} from '@/components/consumer/EventDetailClient'
import {
  formatEventDate,
  formatShowTime,
} from '@/components/consumer/definitions/lib'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { EventTitleBlock } from '@/components/consumer/event-title-block'
import { DetailFollowStrip } from '@/components/consumer/spotify/FollowHighlight'
import {
  BillFollowBlock,
  billArtists,
  followedSlugSet,
} from '@/components/consumer/following/bill'
import {
  InfoRow,
  IconPin,
  IconCalendar,
  IconClock,
  IconUsers,
  EventTicketCta,
} from '@/components/consumer/event-detail'

const copy = CONSUMER_COPY.eventDetail

interface EventDetailPageProps {
  params: Promise<{ id: string }>
}

async function fetchEvent(
  id: string,
  token: string | null,
): Promise<EventDetailResponse | null> {
  try {
    if (token) {
      return await apiClient.get<EventDetailResponse>(`/v1/events/${id}`, token)
    }
    return await publicApiClient.get<EventDetailResponse>(`/v1/events/${id}`)
  } catch (err) {
    console.error('[event detail] event fetch failed', { id, err })
    return null
  }
}

async function fetchReports(
  eventId: string,
  token: string | null,
): Promise<EventReport[]> {
  try {
    return await fetchEventReports(eventId, token ?? undefined)
  } catch (err) {
    console.error('[event detail] reports fetch failed', { eventId, err })
    return []
  }
}

// fetchRelatedById hits the id-keyed related endpoint so the call can run in
// parallel with fetchEvent / fetchReports — it no longer has to wait for
// fetchEvent to return event.venue.slug first. Closes #833 (event detail >30s
// loads on Red Rocks). The API endpoint resolves event id → venue id and
// returns a slim payload (no priceByTier aggregation) so it stays fast even
// on Red Rocks-sized venues.
async function fetchRelatedById(
  eventId: string,
  token: string | null,
): Promise<RelatedEvent[]> {
  try {
    const result = token
      ? await apiClient.get<EventsRelatedResponse>(
          `/v1/events/${eventId}/related`,
          token,
        )
      : await publicApiClient.get<EventsRelatedResponse>(
          `/v1/events/${eventId}/related`,
        )
    return result.data
  } catch (err) {
    console.error('[event detail] related fetch failed', { eventId, err })
    return []
  }
}

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const { id } = await params
  const { getToken, userId, sessionClaims } = await auth()
  const token = await getToken()

  // The `@handle` signed onto a shared poster. Clerk's username is the only
  // public-facing name this product has — there is no handle column of our own
  // — and it is optional, so most posters go out unsigned, which the card
  // handles by drawing no signature line at all.
  const claimUsername = sessionClaims?.['username']
  const shareHandle =
    typeof claimUsername === 'string' && claimUsername !== ''
      ? claimUsername
      : null

  // Parallel fetch — closes #833. Previously fetchRelated ran serially after
  // fetchEvent because it needed event.venue.slug to query the list endpoint.
  // The new id-keyed /v1/events/:id/related resolves the venue server-side, so
  // all three round-trips run concurrently and the page load drops by one
  // full Vercel→Render hop (~400-700ms warm, much more on cold start).
  const [event, reports, related, follows, requestHeaders] = await Promise.all([
    fetchEvent(id, token),
    fetchReports(id, token),
    fetchRelatedById(id, token),
    // Resolves `undefined` on failure, which `followedSlugSet` reads as an
    // empty set — so a failed seed draws every act as not-yet-followed.
    // Deliberate rather than ideal: the optimistic write takes the SERVER's
    // answer, so tapping Follow on an act already followed settles as
    // Following and duplicates nothing. Withholding the whole block over a
    // transient prefetch failure would cost more than the wrong glyph does.
    seedFollowedArtists(token),
    headers(),
  ])
  if (!event) notFound()

  // Monetization spec §1.7: SCA notice gating for the tier picker a locked
  // "I'm going!" tap can open. Unknown (local dev, header absent) fails safe.
  const scaRegion = isScaRegion(requestHeaders.get('x-vercel-ip-country'))

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
  // #764 — wired now even though `hasAttendedVenue` is always null until PR-4
  // reads it from user_events, so the returner state becomes a data change.
  const guideViewerMode = resolveGuideViewerMode({
    isSignedIn: token !== null,
    hasAttendedVenue: null,
  })

  // Headliner plus billed support, minus any name the artists projection has
  // no row for. Empty for a legacy row with no slugs, which renders no block.
  const bill = billArtists(event, followedSlugSet(follows))

  const safeTicketUrl = isSafeHttpUrl(event.ticketUrl) ? event.ticketUrl : null
  const safeEventUrl = isSafeHttpUrl(event.eventUrl) ? event.eventUrl : null
  const ctaHref =
    safeTicketUrl ??
    safeEventUrl ??
    (isSafeHttpUrl(event.venue.websiteUrl) ? event.venue.websiteUrl : null)

  return (
    // overflow-x-clip guarantees the 320px mobile baseline never scrolls
    // horizontally: the full-bleed hero plus data-dependent status/price cards
    // can otherwise push a few px past the viewport. Prefer `clip` over
    // `hidden` here to avoid turning the wrapper into a vertical scroll
    // container. #973
    <div className="flex flex-1 flex-col overflow-x-clip">
      {/* The band: a square panel and the title as a column beside it. It
          replaces 300px of full-bleed image, so there is no scrim to fade type
          into and no negative margin pulling the title back over art (#1525). */}
      <HeroBand
        name={event.artist}
        surface="event"
        artworkUrl={event.imageUrl}
        photoUrl={event.artistPhotoUrl ?? null}
        back={<BackChip inline fallbackHref="/events" />}
        actions={
          <ShareButton event={event} handle={shareHandle} authed inline />
        }
      >
        <GenreChips genres={event.genre} className="mb-2" />
        <EventTitleBlock
          headliner={event.artist}
          supportingArtists={event.supportingArtists}
          tourName={event.tourName}
          fallbackTitle={event.title}
          status={event.status}
          surface="detail"
          headlinerAs="h1"
          artistSlug={event.artistSlug}
          supportingArtistSlugs={event.supportingArtistSlugs}
          linkArtists
        />
      </HeroBand>

      <div className="flex-1">
        <div className="mx-auto w-full max-w-[880px] box-border px-[18px] sm:px-8 pb-24 sm:pb-16 pt-5">
          {/* Commit block — directly under title (#70). One card, per the
              handoff's CommitBlockV2: the commitment and the watch strip are
              two halves of the same decision, so they share a border rather
              than reading as two unrelated blocks. */}
          <div className="mt-3">
            <EventDetailCtaBlock event={event} scaRegion={scaRegion}>
              {/* Crew presence rides with Going, not with the eye: they are
                  different populations, and a status line belongs to the
                  control it describes. Watching follows it, unchanged. */}
              <CrewGoingZone eventId={event.id} />
              <WatchZone
                eventId={event.id}
                initialWatching={event.isWatching}
                artist={event.artist}
                scaRegion={scaRegion}
              />
            </EventDetailCtaBlock>
          </div>

          {/* The bill follow block, directly under the Watch CTA (native
              following, PR 7). Following an act here does not touch the
              event's watch state above it — they are separate relationships
              that happen to share a card edge. */}
          {bill.length > 0 && (
            <div className="mt-3">
              <BillFollowBlock artists={bill} scaRegion={scaRegion} />
            </div>
          )}

          {/* Spotify attribution strip — directly under the Watching pill
              (#763 PR 6). followedArtists only exists for signed-in viewers
              with a Spotify connection, and is non-empty only when the bill
              matches their followed artists. */}
          {event.followedArtists && event.followedArtists.length > 0 && (
            <div className="mt-3">
              <DetailFollowStrip artists={event.followedArtists} />
            </div>
          )}

          {/* Info block */}
          <div className="mt-4 border-y border-border py-1">
            {/* The venue row and its guide chip are siblings, not nested —
                InfoRow wraps its whole row in a link when `href` is set, and an
                anchor inside an anchor is invalid HTML. */}
            <div>
              <InfoRow
                icon={<IconPin />}
                label={copy.venueLabel}
                value={event.venue.name}
                href={`/venues/${event.venue.slug}`}
                data-testid="event-venue-name"
              />
              <div className="flex justify-end">
                <EventFirstTimerChip
                  venueName={event.venue.name}
                  venueSlug={event.venue.slug}
                  venueGuidePublished={event.venueGuidePublished}
                  mode={guideViewerMode}
                />
              </div>
            </div>
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

          {/* Phase 8.5 — live/pending report banners render below the info block */}
          <EventDetailBanners
            event={event}
            reports={reports}
            currentUserId={userId ?? null}
          />

          {/* Phase 8.5 — price slot. Renders the appropriate card based on event
              and community report state. Falls back to the standard PriceDisplay
              when no Phase 8.5 override applies. */}
          <div className="mt-4">
            <EventDetailPriceBlock
              event={event}
              reports={reports}
              currentUserId={userId ?? null}
            />
          </div>

          {/* Setlist preview — owns its own card surface (bg, border, radius) */}
          {event.setlist && (
            <div className="mt-5">
              <SetlistPreview setlist={event.setlist} />
            </div>
          )}

          {/* Primary CTA — always renders on all events including cancelled/postponed,
              per spec ("PrimaryCTA always renders with no cancelled carve-out").
              Fans may still want to visit the venue site even for cancelled shows.
              Sold out → disabled button. ticketUrl or eventUrl → "Get Tickets ↗"
              (eventUrl deep-links the venue's specific event page when there's
              no direct ticket link, #1152). Fallback → venue website. No URL →
              disabled "No tickets available". */}
          <div className="mt-5">
            <EventTicketCta
              soldOut={event.priceStatus === 'soldout'}
              href={ctaHref}
              hasDirectLink={Boolean(safeTicketUrl || safeEventUrl)}
            />
          </div>

          {/* About — after CTA, per design */}
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
                style={{ textWrap: 'pretty' }}
              >
                {event.description}
              </p>
            </div>
          )}

          {/* Related shows */}
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
                  <EventRow
                    show={fromEventWithVenue(rel, {
                      isWatching: rel.isWatching,
                    })}
                    surface="related"
                  />
                </Fragment>
              ))}
            </div>
          )}

          {/* Phase 8.5 — report footer link + sheet */}
          <EventDetailFooter event={event} reports={reports} />
        </div>
      </div>
    </div>
  )
}
