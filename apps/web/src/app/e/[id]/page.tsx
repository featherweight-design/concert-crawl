// Public, read-only mirror of an event page (#72).
//
// This route deliberately sits OUTSIDE the (protected) route group: it is the
// landing surface for a poster link pasted into iMessage or Slack, so it must
// render for a visitor with no session. Middleware makes it reachable via
// `isPublicOnceLaunched`, i.e. it is invite-gated until the public launch and
// open after — the same terms as /events and /artists.
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import type {
  EventDetailResponse,
  EventWithVenue,
  EventsRelatedResponse,
} from '@concert-crawl/types'

import { publicApiClient } from '@/lib/api'
import { PublicEventDetail } from '@/components/consumer/event-detail'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { absoluteUrl } from '@/lib/share/site-origin'
import { toPosterEvent } from '@/lib/share/poster-event'
import { SC_RATIOS } from '@/components/consumer/share/definitions/ratios'
import { posterImageUrl } from '@/lib/share/destinations'

interface PublicEventPageProps {
  params: Promise<{ id: string }>
}

// GET /v1/events/:id validates the id as a UUID (z.string().uuid()) and 400s on
// anything else. Checking the shape here turns that into a branded 404 instead
// of a caught-and-swallowed API error, and stops a garbage id costing a
// Vercel→Render round-trip. A type guard rather than a cast — `zod` is not a
// dependency of apps/web, so this mirrors the UUID matcher already used by
// lib/pwa/route-cache.ts.
// Matches `z.string().uuid()` — version nibble 1–5 and an RFC4122 variant —
// rather than the bare 8-4-4-4-12 hex shape, so the guard rejects exactly what
// the API would 400 on. A looser shape would let some malformed ids through to
// a round-trip that then logs as a fetch failure. (lib/pwa/route-cache.ts keeps
// the loose shape on purpose: it only picks a cache bucket, it gates nothing.)
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

const fill = (template: string, values: Record<string, string>): string =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  )

/**
 * What a pasted poster link unfurls into.
 *
 * The card image is the same `link` render the share sheet hands out, so the
 * unfurl and the saved image are the same artwork. Returning bare metadata for
 * an id we can't resolve is deliberate: `generateMetadata` runs before the
 * page, and 404-ing here would cost a second fetch to reach the same 404 the
 * page already renders.
 */
export const generateMetadata = async ({
  params,
}: PublicEventPageProps): Promise<Metadata> => {
  const { id } = await params
  if (!isUuid(id)) return {}

  const event = await fetchEvent(id)
  if (event === null) return {}

  const poster = toPosterEvent(event)
  const values = {
    artist: poster.artist,
    venue: poster.venue,
    city: poster.city,
    date: poster.dateShort,
  }
  const { og } = CONSUMER_COPY.share
  const title = fill(og.titleTemplate, values)
  const description = fill(og.descriptionTemplate, values)
  // Absolute, because a relative OG image is ignored by every crawler — they
  // fetch it with no page context to resolve it against.
  const image = absoluteUrl(posterImageUrl({ eventId: id, ratio: 'link' }))

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: absoluteUrl(`/e/${id}`),
      images: [
        {
          url: image,
          width: SC_RATIOS.link.width,
          height: SC_RATIOS.link.height,
          alt: fill(og.imageAltTemplate, values),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
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
