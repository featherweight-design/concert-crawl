import type {
  EventWithVenue,
  EventStatus,
  SourceCategory,
} from '@concert-crawl/types'
import { pickBrowseHeadline } from '@/components/consumer/price-region/lib/pick-headline'
import {
  formatEventDate,
  formatShowTime,
  venueShort,
} from '@/components/consumer/definitions/lib'

/**
 * The one shape every surface's row renders from. Adapters normalize an API
 * response into this; the row never reads an API type directly.
 *
 * No display copy lives here. `"from $68"` is row-side formatting, and baking
 * it into the data is how the surfaces drifted apart in the first place.
 */

export interface RowPrice {
  amount: number
  /** The cheapest tier, not the only one — the row prefixes "from". */
  isFloor: boolean
  /** null is a crawled price with no corroborated submission: no chip. */
  source: SourceCategory | null
  observedAt: string | null
}

export interface RowSavedPrice {
  at: string
  price: number
}

export interface EventRowShow {
  id: string
  headliner: string
  /** The API's `title`, used only when the headliner split never ran. */
  fallbackTitle: string
  supports: string[]
  tourName: string | null
  imageUrl: string | null
  venueName: string
  venueSlug: string
  /** "Sat, Aug 15". Line 3 shortens it in place rather than reformatting. */
  dateLabel: string
  timeLabel: string | null
  price: RowPrice | null
  /** Watching only. */
  saved: RowSavedPrice | null
  genres: string[]
  isFollowed: boolean
  isWatching: boolean
  /**
   * The price's own state. Separate from `lifecycle` because they are
   * different axes: a cancelled show can also be sold out, and only the
   * lifecycle is a property of the event itself.
   */
  status: 'live' | 'soldout' | 'presale'
  lifecycle: EventStatus
}

export function fromEventWithVenue(
  event: EventWithVenue,
  options: { isWatching?: boolean } = {},
): EventRowShow {
  const headline = pickBrowseHeadline(event.priceByTier)
  // The legacy scalar is the fallback for rows whose payload omits priceByTier.
  // It carries no provenance and no observation time, so it renders bare.
  const legacyAmount =
    event.ticketPriceMin != null ? parseFloat(event.ticketPriceMin) : null

  const price: RowPrice | null =
    headline !== null
      ? {
          amount: Math.round(headline.price),
          isFloor: true,
          source: headline.sourceCategory,
          observedAt: headline.observedAt,
        }
      : legacyAmount !== null && Number.isFinite(legacyAmount)
        ? {
            amount: Math.round(legacyAmount),
            isFloor: true,
            source: null,
            observedAt: null,
          }
        : null

  return {
    id: event.id,
    headliner: event.artist,
    fallbackTitle: event.title,
    supports: event.supportingArtists ?? [],
    tourName: event.tourName ?? null,
    imageUrl: event.imageUrl ?? null,
    venueName: venueShort(event.venue.name),
    venueSlug: event.venue.slug,
    dateLabel: formatEventDate(event.date, event.venue.timezone ?? undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    timeLabel: formatShowTime(event.showTime),
    price,
    saved: null,
    genres: event.genre ?? [],
    // followedArtists is absent for anonymous viewers and empty for signed-in
    // viewers with no match; both mean "not theirs".
    isFollowed: (event.followedArtists?.length ?? 0) > 0,
    isWatching: options.isWatching ?? false,
    // The browse payload carries no sold-out signal, so every row is live
    // until a surface that knows better says otherwise.
    status: 'live',
    lifecycle: event.status,
  }
}
