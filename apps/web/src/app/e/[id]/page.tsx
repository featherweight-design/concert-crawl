// Public, read-only mirror of an event page (#72).
//
// This route deliberately sits OUTSIDE the (protected) route group: it is the
// landing surface for a poster link pasted into iMessage or Slack, so it must
// render for a visitor with no session. Middleware makes it reachable via
// `isPublicOnceLaunched`, i.e. it is invite-gated until the public launch and
// open after — the same terms as /events and /artists.
import { notFound, redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import type {
  EventDetailResponse,
  EventWithVenue,
  EventsRelatedResponse,
} from '@concert-crawl/types'

import { publicApiClient } from '@/lib/api'
import { PublicEventDetail } from '@/components/consumer/event-detail'

interface PublicEventPageProps {
  params: Promise<{ id: string }>
}

// GET /v1/events/:id validates the id as a UUID (z.string().uuid()) and 400s on
// anything else. Checking the shape here turns that into a branded 404 instead
// of a caught-and-swallowed API error, and stops a garbage id costing a
// Vercel→Render round-trip. A type guard rather than a cast — `zod` is not a
// dependency of apps/web, so this mirrors the UUID matcher already used by
// lib/pwa/route-cache.ts.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isUuid = (value: string): boolean => UUID_PATTERN.test(value)

const fetchEvent = async (id: string): Promise<EventDetailResponse | null> => {
  try {
    return await publicApiClient.get<EventDetailResponse>(`/v1/events/${id}`)
  } catch (err) {
    console.error('[public event] event fetch failed', { id, err })
    return null
  }
}

const fetchRelated = async (id: string): Promise<EventWithVenue[]> => {
  try {
    const result = await publicApiClient.get<EventsRelatedResponse>(
      `/v1/events/${id}/related`,
    )
    return result.data
  } catch (err) {
    console.error('[public event] related fetch failed', { id, err })
    return []
  }
}

const PublicEventPage = async ({ params }: PublicEventPageProps) => {
  const { id } = await params
  // Ahead of the redirect: a malformed id is a dead link for everyone, and
  // bouncing it to /events/:id would just hand the same garbage to a second
  // route rather than showing the branded 404 here.
  if (!isUuid(id)) notFound()

  const { userId } = await auth()

  // Middleware early-returns for authenticated users, so without this a
  // signed-in visitor clicking a shared link would land on the stripped-down
  // mirror of an event they can already see in full.
  if (userId) redirect(`/events/${id}`)

  // Same parallel shape as the protected page (#833), minus the reports fetch —
  // reports are auth-only and the mirror does not render them.
  const [event, related] = await Promise.all([fetchEvent(id), fetchRelated(id)])
  if (!event) notFound()

  return <PublicEventDetail event={event} related={related} />
}

export default PublicEventPage
