import type {
  EventWithVenue,
  EventStatus,
  SourceCategory,
  WatchingShow,
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

export function fromWatchingShow(show: WatchingShow): EventRowShow {
  return {
    id: show.eventId,
    headliner: show.artist,
    fallbackTitle: show.artist,
    // The watching payload carries no billing, tour or genre, so the row's
    // support line and genre chip simply never appear on this surface.
    supports: [],
    tourName: null,
    imageUrl: show.imageUrl,
    venueName: venueShort(show.venueName),
    venueSlug: show.venueSlug,
    dateLabel: formatEventDate(show.date, undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    timeLabel: formatShowTime(show.showTime),
    price:
      show.currentPrice !== null
        ? {
            amount: Math.round(show.currentPrice),
            isFloor: true,
            source: show.priceSourceCategory,
            // A crawled price carries no submission timestamp; the last crawl
            // is what last confirmed the number (#1366).
            observedAt: show.priceObservedAt ?? show.updatedAt,
          }
        : null,
    // Rounded on the same terms as `amount`, because the row subtracts one
    // from the other. A fractional saved price leaves a delta that is non-zero
    // but formats to "$0", so the row would show a movement arrow next to no
    // movement at all.
    saved:
      show.savedPrice !== null
        ? { at: show.savedAt, price: Math.round(show.savedPrice) }
        : null,
    genres: [],
    isFollowed: false,
    // Every row on this list is watched by definition, so the tick would be on
    // all of them and tell the reader nothing.
    isWatching: false,
    status: show.watchStatus,
    lifecycle: show.eventStatus,
  }
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
