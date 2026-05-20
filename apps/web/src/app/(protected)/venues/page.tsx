import { auth } from '@clerk/nextjs/server'
import type { VenuePublic } from '@concert-crawl/types'
import { publicApiClient, apiClient } from '@/lib/api'
import { AppHeader } from '@/components/consumer/app-header'
import { SectionHeader } from '@/components/consumer/section-header'
import { EmptyState } from '@/components/consumer/empty-state'
import { VenuesIndexClient } from '@/components/consumer/venues-index'

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
      <div className="hidden sm:block">
        <AppHeader />
      </div>

      <div className="mx-auto w-full max-w-[1120px] px-[18px] pb-24 pt-6 sm:px-8">
        <div className="mb-4 sm:mb-[18px]">
          <SectionHeader title="Venues" count={`${venues.length} in Denver`} />
        </div>

        {venues.length === 0 ? (
          <EmptyState
            state="no-data"
            density="dense"
            eyebrow="No venues"
            title="Nothing here yet"
            body="Venues will appear here once they're added."
          />
        ) : (
          <VenuesIndexClient venues={venues} />
        )}
      </div>
    </div>
  )
}
