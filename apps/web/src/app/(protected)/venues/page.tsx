import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import type { VenuePublic } from '@concert-crawl/types'
import { publicApiClient, apiClient } from '@/lib/api'
import { AppHeader } from '@/components/consumer/app-header'
import { SectionHeader } from '@/components/consumer/section-header'
import { EmptyState } from '@/components/consumer/empty-state'

export const metadata = { title: 'Venues — Concert Crawl' }

async function fetchVenues(token: string | null): Promise<VenuePublic[]> {
  try {
    if (token) {
      return await apiClient.get<VenuePublic[]>('/v1/venues', token)
    }
    return await publicApiClient.get<VenuePublic[]>('/v1/venues')
  } catch {
    return []
  }
}

export default async function VenuesPage() {
  const { getToken } = await auth()
  const token = await getToken()
  const venues = await fetchVenues(token)

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Desktop-only AppHeader */}
      <div className="hidden sm:block">
        <AppHeader />
      </div>

      <div className="mx-auto w-full max-w-[880px] px-[18px] pb-10 pt-6 sm:px-8">
        <SectionHeader
          title="Venues"
          count={`${venues.length} venue${venues.length !== 1 ? 's' : ''}`}
        />

        {venues.length === 0 ? (
          <EmptyState
            state="no-data"
            density="dense"
            eyebrow="No venues"
            title="Nothing here yet"
            body="Venues will appear here once they're added."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
            {venues.map((venue, idx) => (
              <div key={venue.id}>
                {idx > 0 && <div className="mx-4 h-px bg-border" />}
                <Link
                  href={`/venues/${venue.slug}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors"
                >
                  <span className="flex-1 text-[14px] font-medium text-fg">
                    {venue.name}
                  </span>
                  {venue.venueType && (
                    <span
                      className="shrink-0 rounded-[4px] bg-surface-3 px-[7px] py-[2px] text-fg-muted"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {venue.venueType}
                    </span>
                  )}
                  <span
                    className="shrink-0 text-fg-subtle"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {venue.city}
                  </span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
