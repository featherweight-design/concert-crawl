import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { ReviewPageClient } from '@/components/admin/review/ReviewPageClient'
import { type ReviewCounts } from '@/lib/queries/use-admin-review'

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
  status: string
  createdAt: string
  eventTitle: string | null
  eventDate: string | null
  ticketUrl: string | null
  venueName: string | null
}

export default async function ReviewPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  // Above-the-fold SSR: event flags + price submissions for the first paint,
  // plus aggregate counts so the tab pills render with their numbers without
  // waiting on each tab to activate. PriceCoverageTable fetches client-side
  // (below the fold).
  const [events, submissions, counts] = await Promise.all([
    apiClient
      // SSR fetch returns a raw row array (no count=true); the client
      // useQuery hits a different URL shape (count=true&offset=...) and
      // expects { rows, total }, so this is not hydration. It only seeds
      // `initialEvents` as a first-paint fallback for the row list while
      // the client query loads.
      .get<EventFlag[]>('/v1/admin/events?verified=false&limit=20', token)
      .catch(() => [] as EventFlag[]),
    apiClient
      .get<PriceSubmission[]>('/v1/admin/prices/submissions', token)
      .catch(() => [] as PriceSubmission[]),
    apiClient
      .get<ReviewCounts>('/v1/admin/review/counts', token)
      .catch(() => ({ eventFlags: 0, prices: 0, missing: 0 }) as ReviewCounts),
  ])

  return (
    <ReviewPageClient
      initialEvents={events}
      initialSubmissions={submissions}
      initialCounts={counts}
    />
  )
}
