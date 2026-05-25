import { auth } from '@clerk/nextjs/server'
import type { VenuePublic } from '@concert-crawl/types'
import { publicApiClient, apiClient } from '@/lib/api'
import { EmptyState } from '@/components/consumer/empty-state'
import { VenuesIndexClient } from '@/components/consumer/venues-index'
import { copy } from './definitions/copy'

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
    <div className="mx-auto w-full max-w-[1120px] px-[18px] pb-24 pt-4 sm:px-8 sm:pt-[48px]">
      {venues.length === 0 ? (
        <>
          <div
            className="mb-[18px] flex flex-wrap items-baseline"
            style={{ gap: '14px' }}
          >
            <h1
              className="m-0 text-[28px] font-extrabold text-fg sm:text-[40px]"
              style={{ letterSpacing: '-0.035em' }}
            >
              {copy.pageTitle}
            </h1>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--fg-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {copy.zeroCountLabel}
            </span>
          </div>
          <EmptyState
            state="no-data"
            density="dense"
            eyebrow={copy.emptyEyebrow}
            title={copy.emptyTitle}
            body={copy.emptyBody}
          />
        </>
      ) : (
        <VenuesIndexClient venues={venues} />
      )}
    </div>
  )
}
