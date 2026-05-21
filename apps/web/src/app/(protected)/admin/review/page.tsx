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

interface PriceEvent {
  eventId: string
  eventTitle: string
  artist: string | null
  venueName: string | null
  date: string
  ticketUrl: string | null
  priceMin: string | null
  priceMax: string | null
  priceSource: string | null
  lastRetrievedAt: string | null
  lastOutcome: string | null
}

export default async function ReviewPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const [events, submissions, priceEvents] = await Promise.all([
    apiClient
      .get<EventFlag[]>('/v1/admin/events?verified=false&limit=100', token)
      .catch(() => [] as EventFlag[]),
    apiClient
      .get<PriceSubmission[]>('/v1/admin/prices/submissions', token)
      .catch(() => [] as PriceSubmission[]),
    apiClient
      .get<PriceEvent[]>('/v1/admin/prices/events', token)
      .catch(() => [] as PriceEvent[]),
  ])

  return (
    <ReviewPageClient
      initialEvents={events}
      initialSubmissions={submissions}
      priceEvents={priceEvents}
    />
  )
}
