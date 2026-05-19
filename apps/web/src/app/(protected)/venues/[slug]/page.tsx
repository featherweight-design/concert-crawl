import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import type { VenueWithEvents } from '@concert-crawl/types'
import { publicApiClient, apiClient } from '@/lib/api'
import { AppHeader } from '@/components/consumer/app-header'
import { SectionHeader } from '@/components/consumer/section-header'
import { MapPlaceholder } from '@/components/consumer/map-placeholder'
import { EmptyState } from '@/components/consumer/empty-state'
import { googleMapsUrl } from '@/components/consumer/definitions/lib'
import { copy } from '@/components/consumer/definitions/copy'
import { IdentityArt } from '@/components/consumer/identity-art/IdentityArt'
import { VenueEventList } from '@/components/consumer/venue-event-list/VenueEventList'

interface VenueProfilePageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ highlight?: string }>
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
  searchParams,
}: VenueProfilePageProps) {
  const { slug } = await params
  const { highlight } = await searchParams
  const { getToken } = await auth()
  const token = await getToken()
  const result = await fetchVenueWithEvents(slug, token)
  if (!result) notFound()

  const { venue, upcomingEvents } = result

  const mapSearchQuery = `${venue.name}, ${venue.city}`

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
        {/* Floating back button */}
        <Link
          href="/events"
          aria-label="Back to browse"
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

      {/* Content */}
      <div className="relative -mt-5 flex-1 pb-10">
        <div className="mx-auto w-full max-w-[880px] px-[18px] sm:px-8">
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
              href={googleMapsUrl(venue.address ?? mapSearchQuery)}
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

          {/* Map */}
          <div className="mt-5">
            <MapPlaceholder
              venueAddress={venue.address}
              searchQuery={mapSearchQuery}
            />
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
              <VenueEventList
                events={upcomingEvents}
                {...(highlight ? { highlightId: highlight } : {})}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
