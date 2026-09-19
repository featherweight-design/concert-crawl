import type { Metadata } from 'next'
import type { EventDetailResponse } from '@concert-crawl/types'

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { SC_RATIOS } from '@/components/consumer/share/definitions/ratios'
import { posterImageUrl } from '@/lib/share/destinations'
import { toPosterEvent } from '@/lib/share/poster-event'
import { absoluteUrl } from '@/lib/share/site-origin'

/** Substitute `{name}` placeholders in a copy template. */
export const fill = (
  template: string,
  values: Record<string, string>,
): string =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  )

/**
 * The URL a search engine should treat as *the* page for an event.
 *
 * Two public routes render the same show once the product is launched:
 * `/events/:id` (the real page, where every internal link points and where
 * `/e/:id` sends a signed-in visitor) and `/e/:id` (the read-only share mirror
 * from #72). Left alone that is two indexable URLs with identical content and
 * no stated preference, so the engine picks — and if it picks the mirror, the
 * indexed result is the thin page that bounces a signed-in reader somewhere
 * else.
 */
export const eventCanonicalPath = (id: string): string => `/events/${id}`

/**
 * Open Graph, Twitter and canonical metadata for one event, shared by both
 * routes that render it.
 *
 * `rel=canonical` points at `/events/:id` from both. `og:url` deliberately does
 * NOT: it stays the URL of the page being rendered, because several clients
 * treat it as the destination for the card they draw, and repointing the share
 * mirror's card at `/events/:id` would send an unfurl click away from the
 * surface built to receive it. The two tags answer different questions — which
 * URL to index, and where this card leads — so they are allowed to disagree.
 */
export const eventShareMetadata = (
  event: EventDetailResponse,
  ownPath: string,
): Metadata => {
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
  const image = absoluteUrl(
    posterImageUrl({ eventId: event.id, ratio: 'link' }),
  )

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(eventCanonicalPath(event.id)) },
    openGraph: {
      title,
      description,
      type: 'website',
      url: absoluteUrl(ownPath),
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
