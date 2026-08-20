import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { ReviewPageClient } from '@/components/admin/review/ReviewPageClient'
import { type ReviewCounts } from '@/lib/queries/use-admin-review'
import { type PriceSubmissionHistoryRow } from '@/lib/queries/use-admin-price-submissions'
import { FETCH_PAGE_SIZE } from '@/lib/queries/admin-price-submissions.constants'

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

interface CountedSubmissions {
  rows: PriceSubmissionHistoryRow[]
  total: number
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
  // Every seed below degrades to an empty fallback rather than throwing: each
  // one is only a first paint, and the client query that owns the surface
  // refetches on mount regardless. Failing the whole page over a seed would
  // take down five tabs to save one from a flash of its loading state — but a
  // silent fallback is indistinguishable from genuinely empty data, so each
  // logs before degrading.
  const [events, submissions, counts] = await Promise.all([
    apiClient
      // SSR fetch returns a raw row array (no count=true); the client
      // useQuery hits a different URL shape (count=true&offset=...) and
      // expects { rows, total }, so this is not hydration. It only seeds
      // `initialEvents` as a first-paint fallback for the row list while
      // the client query loads.
      .get<EventFlag[]>('/v1/admin/events?verified=false&limit=20', token)
      .catch((err: unknown): EventFlag[] => {
        console.error('admin review: event-flags SSR seed failed', err)
        return []
      }),
    // The Submissions tab walks the full set client-side; this first page is
    // only what it paints before that resolves. Shares FETCH_PAGE_SIZE with
    // the walker so the seed and its offset steps can't drift.
    apiClient
      .get<CountedSubmissions>(
        `/v1/admin/prices/submissions?status=all&count=true&limit=${FETCH_PAGE_SIZE}&offset=0`,
        token,
      )
      .catch((err: unknown): CountedSubmissions => {
        console.error('admin review: submissions SSR seed failed', err)
        return { rows: [], total: 0 }
      }),
    apiClient
      .get<ReviewCounts>('/v1/admin/review/counts', token)
      .catch((err: unknown): ReviewCounts => {
        console.error('admin review: counts SSR seed failed', err)
        return { eventFlags: 0, prices: 0, missing: 0, priceContests: 0 }
      }),
  ])

  return (
    <ReviewPageClient
      initialEvents={events}
      initialSubmissions={submissions.rows}
      initialSubmissionsTotal={submissions.total}
      initialCounts={counts}
    />
  )
}
