import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { ReviewPageClient } from '@/components/admin/review/ReviewPageClient'

interface EventFlag {
  id: string
  title: string
  artist: string | null
  date: string
  doorsTime: string | null
  showTime: string | null
  ticketPriceMin: string | null
  ticketPriceMax: string | null
  confidenceScore: number | null
  extractionStrategy: string | null
  sourceUrl: string | null
  genre: string[] | null
  createdAt: string
  venueId: string
  venueName: string | null
}

interface PriceSubmission {
  id: string
  eventId: string
  userId: string
  priceMin: string | null
  priceMax: string | null
  source: string | null
  note: string | null
  status: string
  createdAt: string
}

export default async function ReviewPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  // Only fetch the two above-the-fold panels on the server.
  // PriceCoverageTable (below the fold) fetches its own data client-side.
  const [events, submissions] = await Promise.all([
    apiClient
      .get<EventFlag[]>('/v1/admin/events?verified=false&limit=100', token)
      .catch(() => [] as EventFlag[]),
    apiClient
      .get<PriceSubmission[]>('/v1/admin/prices/submissions', token)
      .catch(() => [] as PriceSubmission[]),
  ])

  return (
    <ReviewPageClient initialEvents={events} initialSubmissions={submissions} />
  )
}
