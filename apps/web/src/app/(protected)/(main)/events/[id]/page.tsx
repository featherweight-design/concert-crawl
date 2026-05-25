import { Fragment } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import type {
  EventDetailResponse,
  EventWithVenue,
  EventsListResponse,
} from '@concert-crawl/types'
import { publicApiClient, apiClient } from '@/lib/api'
import { EventImage } from '@/components/consumer/event-image'
import { EventCard } from '@/components/consumer/event-card/EventCard'
import { SectionHeader } from '@/components/consumer/section-header'
import { PriceDisplay } from '@/components/consumer/PriceDisplay'
import { WatchShowButton } from '@/components/consumer/watch-show-button'
import { SetlistPreview } from '@/components/consumer/setlist-preview'
import { SoldOutCta } from '@/components/consumer/SoldOutCta'
import { SubmitPriceCardCta } from '@/components/consumer/SubmitPriceCardCta'
import { GenreChips } from '@/components/consumer/GenreChips'
import {
  formatEventDate,
  formatShowTime,
} from '@/components/consumer/definitions/lib'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

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
  } catch {
    return null
  }
}

async function fetchRelated(
  venueSlug: string,
  excludeId: string,
): Promise<EventWithVenue[]> {
  try {
    const result = await publicApiClient.get<EventsListResponse>(
      `/v1/events?venueSlug=${encodeURIComponent(venueSlug)}&limit=4&offset=0`,
    )
    return result.data.filter((ev) => ev.id !== excludeId).slice(0, 3)
  } catch {
    return []
  }
}

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const { id } = await params
  const { getToken } = await auth()
  const token = await getToken()

  const event = await fetchEvent(id, token)
  if (!event) notFound()

  const related = await fetchRelated(event.venue.slug, event.id)

  const showTime = formatShowTime(event.showTime)
  const doorsTime = formatShowTime(event.doorsTime)
  const dateLabel = formatEventDate(event.date, event.venue.timezone)
  const isCancelled = event.status === 'cancelled'
  const isPostponed = event.status === 'postponed'
  // Sold-out is a community claim surfaced via the API priceStatus field.
  // The field is null until a corroborated sold-out submission exists.
  const isSoldOut = event.priceStatus === 'soldout'

  const doorsShow =
    doorsTime && showTime
      ? `${doorsTime} / ${showTime}`
      : (showTime ?? doorsTime ?? '—')

  return (
    <>
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
        {/* Bottom scrim */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
          style={{ background: 'linear-gradient(transparent, var(--bg))' }}
          aria-hidden
        />
        {/* Floating back button */}
        <Link
          href="/events"
          aria-label={copy.backAriaLabel}
          className="absolute left-3.5 top-14 z-10 flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: 'var(--scrim)' }}
        >
          <svg
            width="10"
            height="16"
            viewBox="0 0 10 16"
            fill="none"
            aria-hidden
          >
            <path
              d="M8 2L2 8l6 6"
              stroke="var(--fg)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      {/* Scrollable content — 880px max-width centered column, -60px hero overlap on desktop */}
      <div className="relative -mt-5 sm:-mt-[60px] sm:z-[1] flex-1">
        <div className="mx-auto w-full max-w-[880px] box-border px-[18px] sm:px-8 pb-24 sm:pb-16 sm:pt-5">
          {/* Genre chips */}
          <GenreChips genres={event.genre} className="mb-2" />

          {/* Title */}
          <h1
            className="text-fg"
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 900,
              fontSize: 26,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {event.artist}
          </h1>
          {event.title !== event.artist && (
            <p className="mt-1 text-[14px] font-medium text-fg-muted">
              {event.title}
            </p>
          )}

          {/* Watch strip — directly under title */}
          <div className="mt-3">
            <WatchShowButton
              eventId={event.id}
              initialWatching={event.isWatching}
              watchingCount={event.watching}
            />
          </div>

          {/* Info block */}
          <div className="mt-4 border-y border-border py-1">
            <InfoRow
              icon={<IconPin />}
              label={copy.venueLabel}
              value={event.venue.name}
              href={`/venues/${event.venue.slug}`}
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

          {/* Price card — PriceBlockB. Renders community-handoff card when no price. */}
          <PriceDisplay
            priceMin={event.ticketPriceMin}
            priceMax={event.ticketPriceMax}
            priceSource={event.priceSource}
            venueName={event.venue.name}
            ticketUrl={event.ticketUrl}
            eventId={event.id}
            artist={event.artist}
            date={event.date}
            priceStatus={event.priceStatus ?? null}
            ticketPriceOpenedAt={event.ticketPriceOpenedAt ?? null}
            ticketFees={event.ticketFees ?? null}
            priceVendor={event.priceVendor ?? null}
            priceSubmitterHandle={event.priceSubmitterHandle ?? null}
            priceObservedAt={event.priceObservedAt ?? null}
            priceApprovalKind={event.priceApprovalKind ?? null}
            priceApprovedAt={event.priceApprovedAt ?? null}
            priceAlternates={event.priceAlternates ?? null}
          />

          {/* Submit-a-price card CTA — only when a price exists to revise */}
          {event.ticketPriceMin != null && (
            <div className="mt-3">
              <SubmitPriceCardCta
                eventId={event.id}
                artist={event.artist}
                venueName={event.venue.name}
                date={event.date}
              />
            </div>
          )}

          {/* Status banner — renders above SetlistPreview so the setlist and CTA
              remain adjacent regardless of event status. Per spec, the banner
              is still visible; it just doesn't split the setlist from the CTA. */}
          {(isCancelled || isPostponed) && (
            <div
              className="mt-5 rounded-[10px] border border-border px-4 py-3"
              style={{ background: 'var(--surface-1)' }}
            >
              <p
                className="uppercase text-signal"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.06em',
                }}
              >
                {isCancelled ? copy.cancelledLabel : copy.postponedLabel}
              </p>
              <p className="mt-1 text-[13px] leading-[1.55] text-fg-muted">
                {isCancelled ? copy.cancelledBody : copy.postponedBody}
              </p>
            </div>
          )}

          {/* Setlist preview — owns its own card surface (bg, border, radius) */}
          {event.setlist && (
            <div className="mt-5">
              <SetlistPreview setlist={event.setlist} />
            </div>
          )}

          {/* Primary CTA — always renders on all events including cancelled/postponed,
              per spec ("PrimaryCTA always renders with no cancelled carve-out").
              Fans may still want to visit the venue site even for cancelled shows.
              Sold out → disabled button. ticketUrl → "Get Tickets ↗".
              Fallback → venue website. No URL → disabled "No tickets available". */}
          <div className="mt-5">
            {isSoldOut ? (
              <SoldOutCta />
            ) : event.ticketUrl || event.venue.websiteUrl ? (
              <a
                href={event.ticketUrl ?? event.venue.websiteUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-full items-center justify-center gap-1.5 rounded-[10px] text-fg-on-accent"
                style={{
                  background: 'var(--accent)',
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 800,
                  fontSize: 15,
                  letterSpacing: '-0.01em',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {event.ticketUrl ? copy.getTickets : copy.visitVenueWebsite}
                <ExternalLinkIcon />
              </a>
            ) : (
              <button
                type="button"
                disabled
                aria-label={copy.noTicketsAriaLabel}
                style={{
                  all: 'unset',
                  boxSizing: 'border-box',
                  cursor: 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: 48,
                  borderRadius: 10,
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg-subtle)',
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: '-0.005em',
                }}
              >
                {copy.noTicketsAvailable}
              </button>
            )}
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
                style={{ textWrap: 'pretty' } as React.CSSProperties}
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
                  <EventCard event={rel} />
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Icon components ──────────────────────────────────────────────

function IconPin() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 1.5C5.24 1.5 3 3.74 3 6.5C3 10.25 8 14.5 8 14.5C8 14.5 13 10.25 13 6.5C13 3.74 10.76 1.5 8 1.5Z"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle
        cx="8"
        cy="6.5"
        r="2"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2"
        y="3"
        width="12"
        height="11"
        rx="2"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
      />
      <path d="M2 7h12" stroke="var(--fg-subtle)" strokeWidth="1.5" />
      <path
        d="M5.5 1.5v3M10.5 1.5v3"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle
        cx="8"
        cy="8"
        r="6.5"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
      />
      <path
        d="M8 4.5V8l3 1.5"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle
        cx="6"
        cy="5"
        r="2.5"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
      />
      <path
        d="M1 14c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5"
        stroke="var(--fg-subtle)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="11.5"
        cy="5.5"
        r="2"
        stroke="var(--fg-subtle)"
        strokeWidth="1.2"
      />
      <path
        d="M12.5 9.5c1.8.4 3 1.6 3 3.5"
        stroke="var(--fg-subtle)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M7 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 3h-4m4 0v4m0-4L7 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── InfoRow ──────────────────────────────────────────────────────

interface InfoRowProps {
  icon: React.ReactNode
  label: string
  value: string
  signal?: boolean
  href?: string
  'data-testid'?: string
}

function InfoRow({
  icon,
  label,
  value,
  signal = false,
  href,
  'data-testid': dataTestId,
}: InfoRowProps) {
  const inner = (
    <>
      <div className="h-4 w-4 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p
          className="uppercase text-fg-subtle"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </p>
        <p
          className="mt-[1px] flex min-w-0 items-center gap-0.5 text-[14px] font-semibold tracking-[-0.01em]"
          style={{ color: signal ? 'var(--signal)' : 'var(--fg)' }}
        >
          {href ? (
            <>
              <span className="min-w-0 truncate">{value}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                className="shrink-0 text-fg-subtle"
                aria-hidden
              >
                <path
                  d="M6 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          ) : (
            value
          )}
        </p>
      </div>
    </>
  )

  const baseClass = 'flex items-center gap-2.5 py-2'

  if (href) {
    return (
      <Link
        href={href}
        data-testid={dataTestId}
        className={`${baseClass} transition-colors hover:text-signal`}
      >
        {inner}
      </Link>
    )
  }
  return (
    <div data-testid={dataTestId} className={baseClass}>
      {inner}
    </div>
  )
}
