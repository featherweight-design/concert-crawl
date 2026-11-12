import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import type { VenueWithEvents, EventWithVenue } from '@concert-crawl/types';
import { resolveGuideViewerMode } from '@concert-crawl/types';
import { publicApiClient, apiClient } from '@/lib/api';
import { fetchWatching } from '@/lib/watching';
import { SectionHeader } from '@/components/consumer/section-header';
import {
  FirstTimerCallout,
  GuideSection,
} from '@/components/consumer/venue-guide';
import { EmptyState } from '@/components/consumer/empty-state';
import { googleMapsUrl } from '@/components/consumer/definitions/lib';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { VenueHero } from '@/components/consumer/venue-profile/VenueHero';
import { VenueEventList } from '@/components/consumer/venue-event-list/VenueEventList';
import { StatPill } from '@/components/consumer/venue-profile/StatPill';

const copy = CONSUMER_COPY;

interface VenueProfilePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ highlight?: string }>;
}

async function fetchVenueWithEvents(
  slug: string,
  token: string | null,
): Promise<VenueWithEvents | null> {
  try {
    if (token) {
      return await apiClient.get<VenueWithEvents>(`/v1/venues/${slug}`, token);
    }
    return await publicApiClient.get<VenueWithEvents>(`/v1/venues/${slug}`);
  } catch {
    return null;
  }
}

export default async function VenueProfilePage({
  params,
  searchParams,
}: VenueProfilePageProps) {
  const { slug } = await params;
  const { highlight } = await searchParams;
  const { getToken } = await auth();
  const token = await getToken();

  const [result, watchedShows] = await Promise.all([
    fetchVenueWithEvents(slug, token),
    token ? fetchWatching(token).catch(() => []) : Promise.resolve([]),
  ]);
  if (!result) notFound();

  const { venue, upcomingEvents } = result;
  const watchedIds = watchedShows.map((show) => show.eventId);

  // Enrich events with venue data so EventCard can render venue links
  const enrichedEvents: EventWithVenue[] = upcomingEvents.map((ev) => ({
    ...ev,
    venue: {
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      city: venue.city,
      websiteUrl: venue.websiteUrl,
      timezone: venue.timezone,
    },
  }));

  const guideViewerMode = resolveGuideViewerMode({
    isSignedIn: token !== null,
    hasAttendedVenue: result.viewerHasAttended,
  });

  const mapSearchQuery = `${venue.name}, ${venue.city}`;
  const hasStats = venue.capacity != null || venue.venueType != null;
  const capacityFormatted =
    venue.capacity != null ? venue.capacity.toLocaleString('en-US') : '—';

  return (
    <>
      <VenueHero slug={venue.slug} name={venue.name} />

      {/* Content */}
      <div className="relative -mt-10 flex-1 pb-24 sm:pb-10">
        <div className="mx-auto w-full max-w-[880px] px-[18px] sm:px-8">
          {/* Type chip */}
          {venue.venueType && (
            <div className="mb-3">
              <span
                className="inline-block rounded-[6px] border border-border-strong bg-surface-2 px-2.5 py-1 uppercase text-fg"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  lineHeight: 1,
                  letterSpacing: '0.12em',
                }}
              >
                {venue.venueType}
              </span>
            </div>
          )}

          {/* Tile + venue name */}
          <div className="flex items-center gap-3.5 sm:gap-5">
            <span className="shrink-0 sm:hidden">
              <VenueTile slug={venue.slug} name={venue.name} size={64} />
            </span>
            <span className="hidden shrink-0 sm:inline-flex">
              <VenueTile slug={venue.slug} name={venue.name} size={72} />
            </span>
            <h1
              data-testid="venue-name"
              className="min-w-0 text-[30px] text-fg sm:text-[44px]"
              style={{
                fontFamily: 'var(--font-ui)',
                fontWeight: 900,
                letterSpacing: '-0.035em',
                lineHeight: 1.05,
                margin: 0,
              }}
            >
              {venue.name}
            </h1>
          </div>

          {/* City + Directions */}
          <div className="mt-2.5 flex items-center gap-2">
            <span
              className="text-fg-muted"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
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
                fontSize: '11px',
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
              {copy.venueProfile.directionsLink}
            </a>
          </div>

          {/* Stats row */}
          {hasStats && (
            <div className="mt-5">
              <div className="h-px bg-border" />
              {/* Three equal columns (addendum 2 item 17). */}
              <div
                data-testid="venue-stats"
                className="grid grid-cols-3 gap-4 py-4"
              >
                <StatPill label="Capacity" value={capacityFormatted} />
                <StatPill
                  label="Upcoming"
                  value={String(venue.upcomingCount)}
                  signal
                />
                <StatPill label="Type" value={venue.venueType ?? '—'} />
              </div>
              <div className="h-px bg-border" />
            </div>
          )}

          {/* About */}
          {venue.about && (
            <div className="mt-5">
              <p
                className="mb-1.5 text-fg-subtle"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                {copy.venueProfile.aboutEyebrow}
              </p>
              <p
                className="text-fg-muted"
                style={{ fontSize: '15px', lineHeight: 1.6 }}
              >
                {venue.about}
              </p>
            </div>
          )}

          {/* First-timer guide (#764) — callout leads, guide follows. Both are
              suppressed entirely when the venue has not published a guide. */}
          {venue.guide !== null && guideViewerMode === 'first_timer' && (
            <div style={{ marginTop: 22 }}>
              <FirstTimerCallout venueName={venue.name} guide={venue.guide} />
            </div>
          )}
          <GuideSection
            venueName={venue.name}
            guide={venue.guide}
            followsCallout={guideViewerMode === 'first_timer'}
            mode={guideViewerMode}
          />

          {/* Upcoming shows */}
          <div className="mt-8">
            <SectionHeader
              title="Upcoming"
              count={`${venue.upcomingCount} show${venue.upcomingCount !== 1 ? 's' : ''}`}
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
                events={enrichedEvents}
                watchedIds={watchedIds}
                {...(highlight ? { highlightId: highlight } : {})}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
