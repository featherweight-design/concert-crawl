import { Fragment } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import type { VenueWithEvents, Event } from '@concert-crawl/types'
import { publicApiClient, apiClient } from '@/lib/api'
import { AppHeader } from '@/components/consumer/app-header'
import { SmallEventRow } from '@/components/consumer/small-event-row'
import { SectionHeader } from '@/components/consumer/section-header'
import { MapPlaceholder } from '@/components/consumer/map-placeholder'
import { EmptyState } from '@/components/consumer/empty-state'
import {
  formatShortDate,
  googleMapsUrl,
} from '@/components/consumer/definitions/lib'
import { copy } from '@/components/consumer/definitions/copy'
import { IdentityArt } from '@/components/consumer/identity-art/IdentityArt'

interface VenueProfilePageProps {
  params: Promise<{ slug: string }>
}

async function fetchVenueWithEvents(
  slug: string,
  token: string | null,
): Promise<VenueWithEvents | null> {
  try {
    if (token) {
      return await apiClient.get<VenueWithEvents>(`/v1/venues/${slug}`, token)
    }
    return await publicApiClient.get<VenueWithEvents>(`/v1/venues/${slug}`)
  } catch {
    return null
  }
}

export default async function VenueProfilePage({
  params,
}: VenueProfilePageProps) {
  const { slug } = await params
  const { getToken } = await auth()
  const token = await getToken()
  const result = await fetchVenueWithEvents(slug, token)
  if (!result) notFound()

  const { venue, upcomingEvents } = result

  const mapsAddress = `${venue.name}, ${venue.city}`

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Desktop-only AppHeader */}
      <div className="hidden sm:block">
        <AppHeader />
      </div>

      {/* Hero — 320px */}
      <div className="relative w-full shrink-0" style={{ height: 320 }}>
        <IdentityArt
          kind="venue"
          name={venue.name}
          scale="hero"
          style={{ position: 'absolute', inset: 0 }}
        />
        {/* Image tint */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'var(--image-tint)' }}
          aria-hidden
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
        {/* Desktop: breadcrumb */}
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
          <span className="font-medium text-fg">{venue.name}</span>
        </div>
      </div>

      {/* Content */}
      <div className="relative -mt-5 flex-1 px-[18px] pb-10">
        {/* Venue name */}
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
          {venue.name}
        </h1>

        {/* City + Directions */}
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className="text-fg-muted"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.04em',
            }}
          >
            {venue.city}
          </span>
          <span className="opacity-40 text-fg-subtle">·</span>
          <a
            href={googleMapsUrl(mapsAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-signal"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.03em',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
            >
              <path
                d="M7 1l5.5 5.5L7 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12.5 6.5H5a3.5 3.5 0 00-3.5 3.5v1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Directions
          </a>
        </div>

        {/* Stats row */}
        <div className="mt-3.5 flex gap-3 border-y border-border py-3">
          <StatPill
            label="Upcoming"
            value={`${upcomingEvents.length} show${upcomingEvents.length !== 1 ? 's' : ''}`}
            signal
          />
          <StatPill label="City" value={venue.city} />
          <StatPill label="Website">
            <a
              href={venue.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-signal hover:underline"
            >
              ↗
            </a>
          </StatPill>
        </div>

        {/* Upcoming shows */}
        <div className="mt-5">
          <SectionHeader
            title="Upcoming"
            count={`${upcomingEvents.length} show${upcomingEvents.length !== 1 ? 's' : ''}`}
          />

          {upcomingEvents.length === 0 ? (
            <EmptyState
              state="no-data"
              density="dense"
              eyebrow={copy.venueEmptyEyebrow}
              title={copy.venueEmptyTitle}
              body={copy.venueNoShows}
            />
          ) : (
            <div>
              {upcomingEvents.map((event: Event, i: number) => (
                <Fragment key={event.id}>
                  {i > 0 && (
                    <div
                      className="h-px bg-border"
                      style={{ marginLeft: 50 }}
                    />
                  )}
                  <SmallEventRow
                    event={event}
                    date={formatShortDate(event.date)}
                    showVenue={false}
                  />
                </Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Map placeholder */}
        <div className="mb-6 mt-5">
          <MapPlaceholder address={mapsAddress} />
        </div>
      </div>
    </div>
  )
}

function StatPill({
  label,
  value,
  signal = false,
  children,
}: {
  label: string
  value?: string
  signal?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col gap-0.5">
      <span
        className="uppercase text-fg-subtle"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '8px',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
      {children ?? (
        <span
          className="text-[12px] font-bold tracking-[-0.01em]"
          style={{ color: signal ? 'var(--signal)' : 'var(--fg)' }}
        >
          {value}
        </span>
      )}
    </div>
  )
}
