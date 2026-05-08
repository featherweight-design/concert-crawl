import { Fragment } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { EventWithVenue, EventsListResponse } from '@concert-crawl/types'
import { publicApiClient } from '@/lib/api'
import { AppHeader } from '@/components/consumer/app-header'
import { EventImage } from '@/components/consumer/event-image'
import { SmallEventRow } from '@/components/consumer/small-event-row'
import { SectionHeader } from '@/components/consumer/section-header'
import { PriceDisplay } from '@/components/consumer/PriceDisplay'
import { PriceSubmissionForm } from '@/components/consumer/PriceSubmissionForm'
import {
  formatEventDate,
  formatShowTime,
  artistInitial,
  formatShortDate,
} from '@/components/consumer/definitions/lib'
import { copy } from '@/components/consumer/definitions/copy'

interface EventDetailPageProps {
  params: Promise<{ id: string }>
}

async function fetchEvent(id: string): Promise<EventWithVenue | null> {
  try {
    return await publicApiClient.get<EventWithVenue>(`/v1/events/${id}`)
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
  const event = await fetchEvent(id)
  if (!event) notFound()

  const related = await fetchRelated(event.venue.slug, event.id)

  const showTime = formatShowTime(event.showTime)
  const doorsTime = formatShowTime(event.doorsTime)
  const dateLabel = formatEventDate(event.date, event.venue.timezone)
  const isCancelled = event.status === 'cancelled'
  const isPostponed = event.status === 'postponed'

  const doorsShow =
    doorsTime && showTime
      ? `${doorsTime} / ${showTime}`
      : (showTime ?? doorsTime ?? '—')

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Desktop-only AppHeader */}
      <div className="hidden sm:block">
        <AppHeader />
      </div>

      {/* Hero — 320px, full-bleed */}
      <div className="relative w-full shrink-0" style={{ height: 320 }}>
        <EventImage
          src={event.imageUrl}
          alt={event.artist}
          artist={event.artist}
          fallbackInitial={artistInitial(event.artist)}
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
        {/* Mobile: floating back button */}
        <Link
          href="/events"
          aria-label="Back to browse"
          className="absolute left-3.5 top-14 z-10 flex h-9 w-9 items-center justify-center rounded-full sm:hidden"
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
        {/* Mobile: floating save button (stub) */}
        <button
          aria-label="Save show"
          className="absolute right-3.5 top-14 z-10 flex h-9 w-9 items-center justify-center rounded-full sm:hidden"
          style={{ background: 'var(--scrim)' }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden
          >
            <path
              d="M9 15l-6.5-6A3.5 3.5 0 019 4.5 3.5 3.5 0 0115.5 9L9 15z"
              stroke="var(--fg)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {/* Desktop: breadcrumb over hero */}
        <div className="absolute bottom-4 left-6 hidden items-center gap-1.5 text-[13px] sm:flex">
          <Link
            href="/events"
            className="flex items-center gap-1.5 text-fg-muted transition-colors hover:text-fg"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
            >
              <path
                d="M11 4L5 8l6 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Browse
          </Link>
          <span
            className="text-fg-subtle"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}
          >
            /
          </span>
          <span className="font-medium text-fg">{event.artist}</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="relative -mt-5 flex-1 px-[18px] pb-10">
        {/* Genre chips */}
        {event.genre && event.genre.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {event.genre.map((genre) => (
              <span
                key={genre}
                className="rounded-[4px] bg-surface-3 px-2 py-[3px] text-fg-muted"
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

        {/* Info block */}
        <div className="mt-4 border-y border-border py-1">
          <InfoRow
            icon={<IconPin />}
            label="Venue"
            value={event.venue.name}
            href={`/venues/${event.venue.slug}`}
            data-testid="event-venue-name"
          />
          <InfoRow icon={<IconCalendar />} label="Date" value={dateLabel} />
          <InfoRow
            icon={<IconClock />}
            label="Doors / Show"
            value={doorsShow}
          />
          <InfoRow icon={<IconUsers />} label="Ages" value="All Ages" />
        </div>

        {/* Price block — always rendered; collapses to quiet no-price state */}
        <PriceDisplay
          priceMin={event.ticketPriceMin}
          priceMax={event.ticketPriceMax}
          priceSource={event.priceSource}
          venueName={event.venue.name}
          ticketUrl={event.ticketUrl}
        />

        {/* Price submission form — shown when no authoritative price exists */}
        {!event.ticketPriceMin && (
          <div className="mt-4">
            <PriceSubmissionForm
              eventId={event.id}
              apiUrl={process.env.NEXT_PUBLIC_API_URL ?? ''}
              isAxsEvent={event.ticketUrl?.includes('axs.com') ?? false}
            />
          </div>
        )}

        {/* About */}
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
              About
            </p>
            <p
              className="text-[13px] leading-[1.55] text-fg-muted"
              style={{ textWrap: 'pretty' } as React.CSSProperties}
            >
              {event.description}
            </p>
          </div>
        )}

        {/* Status banner */}
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
              {isCancelled ? 'Cancelled' : 'Postponed'}
            </p>
            <p className="mt-1 text-[13px] leading-[1.55] text-fg-muted">
              {isCancelled
                ? 'This show has been cancelled.'
                : 'This show has been postponed. Check back for updates.'}
            </p>
          </div>
        )}

        {/* Get Tickets CTA */}
        {event.ticketUrl && !isCancelled && !isPostponed && (
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex h-12 w-full items-center justify-center rounded-[10px] text-fg-on-accent"
            style={{
              background: 'var(--accent)',
              fontFamily: 'var(--font-ui)',
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: '-0.01em',
            }}
          >
            {copy.ticketsCta} ↗
          </a>
        )}

        {/* Sign-up nudge */}
        <p
          className="mt-2.5 text-center text-fg-subtle"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.02em',
          }}
        >
          <Link href="/sign-up" className="text-signal">
            Sign up
          </Link>{' '}
          to save this show
        </p>

        {/* Related shows */}
        {related.length > 0 && (
          <div className="mt-6">
            <SectionHeader
              title={`More at ${event.venue.name}`}
              count={`${related.length} show${related.length !== 1 ? 's' : ''}`}
            />
            {related.map((rel, i) => (
              <Fragment key={rel.id}>
                {i > 0 && (
                  <div className="h-px bg-border" style={{ marginLeft: 50 }} />
                )}
                <SmallEventRow event={rel} date={formatShortDate(rel.date)} />
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Icon components (16×16, 1.5px stroke, --fg-subtle) ──────────

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
          className="mt-[1px] text-[14px] font-semibold tracking-[-0.01em]"
          style={{ color: signal ? 'var(--signal)' : 'var(--fg)' }}
        >
          {value}
        </p>
      </div>
      {href && (
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
      )}
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
