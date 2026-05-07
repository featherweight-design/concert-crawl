import { auth } from '@clerk/nextjs/server'
import { apiClient } from '@/lib/api'
import { EventReviewTable } from '@/components/admin/event-review-table/EventReviewTable'

type UnverifiedEvent = {
  id: string
  venueId: string
  title: string
  artist: string
  date: string
  confidenceScore: string | null
  extractionStrategy: string | null
  sourceUrl: string | null
  verified: boolean
}

async function getUnverifiedEvents(): Promise<UnverifiedEvent[]> {
  const { getToken } = await auth()
  const token = await getToken()
  return apiClient.get<UnverifiedEvent[]>(
    '/v1/admin/events?verified=false&limit=50',
    token!,
  )
}

export default async function EventReviewPage() {
  const events = await getUnverifiedEvents()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-fg">Event Review</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Review and approve or reject events extracted with low confidence.
          Approved events are marked verified and appear in the calendar.
          Rejected events are deleted.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <p className="text-sm text-fg-muted">
          {events.length} event{events.length !== 1 ? 's' : ''} pending review
        </p>
      </div>

      <EventReviewTable initialEvents={events} />
    </div>
  )
}
