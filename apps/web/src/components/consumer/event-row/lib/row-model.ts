import type {
  ArtistShow,
  EventWithVenue,
  EventStatus,
  CrewShow,
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
  /**
   * A submitted price nobody has corroborated yet, shown because a number the
   * reader can sanity-check beats "tba". The row marks it; it never renders
   * bare alongside confirmed prices in the same column.
   */
  isPending: boolean
}

export interface RowSavedPrice {
  at: string
  price: number
}

/**
 * Crew presence on a row. The chip states the count; the names ride along for
 * assistive tech only, because naming people on a list row is event detail's
 * job (locked decision 5). Handle-less members are counted and never named.
 */
export interface RowCrewGoing {
  count: number
  names: string[]
}

export interface EventRowShow {
  id: string
  headliner: string
  /** The API's `title`, used only when the headliner split never ran. */
  fallbackTitle: string
  supports: string[]
  tourName: string | null
  imageUrl: string | null
  /** Second choice behind `imageUrl`. Null on payloads that omit the join. */
  artistPhotoUrl: string | null
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
  /** null on every surface that has no crew context to state. */
  crewGoing: RowCrewGoing | null
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
    artistPhotoUrl: show.artistPhotoUrl,
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
            // This payload only ever carries resolved prices.
            isPending: false,
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
    crewGoing: null,
    // Every row on this list is watched by definition, so the tick would be on
    // all of them and tell the reader nothing.
    isWatching: false,
    status: show.watchStatus,
    lifecycle: show.eventStatus,
  }
}

export function fromEventWithVenue(
  event: EventWithVenue,
  options: { isWatching?: boolean; crewGoing?: RowCrewGoing | null } = {},
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
          isPending: headline.isPending,
        }
      : legacyAmount !== null && Number.isFinite(legacyAmount)
        ? {
            amount: Math.round(legacyAmount),
            isFloor: true,
            source: null,
            observedAt: null,
            isPending: false,
          }
        : null

  return {
    id: event.id,
    headliner: event.artist,
    fallbackTitle: event.title,
    supports: event.supportingArtists ?? [],
    tourName: event.tourName ?? null,
    imageUrl: event.imageUrl ?? null,
    artistPhotoUrl: event.artistPhotoUrl ?? null,
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
    crewGoing: options.crewGoing ?? null,
    // The browse payload carries no sold-out signal, so every row is live
    // until a surface that knows better says otherwise.
    status: 'live',
    lifecycle: event.status,
  }
}

/**
 * An upcoming show on an artist page. The artist is the page, so it arrives as
 * an argument rather than off the show: `ArtistShow` never repeats it.
 */
export function fromArtistShow(show: ArtistShow, artist: string): EventRowShow {
  return {
    id: show.eventId,
    headliner: artist,
    fallbackTitle: artist,
    // The payload carries no billing, and the surface declares as much, so
    // line 2 never appears here.
    supports: [],
    tourName: show.tourName,
    imageUrl: show.imageUrl,
    // Every row on this page is the same act, so the artist portrait would be
    // the same face repeated down the list. The identity glyph says as much
    // with less.
    artistPhotoUrl: null,
    venueName: venueShort(show.venue),
    venueSlug: show.venueSlug,
    dateLabel: formatEventDate(show.iso, undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    timeLabel: formatShowTime(show.showTime),
    price:
      show.price !== null
        ? {
            amount: Math.round(show.price),
            isFloor: true,
            // The API resolves the cheapest tier before it reaches here, but
            // sends the amount alone — no provenance and no observation time —
            // so the price renders bare.
            source: null,
            observedAt: null,
            isPending: false,
          }
        : null,
    saved: null,
    genres: show.genres,
    // The page has its own follow control, and `following` is not in this
    // surface's chip priority — a chip here would repeat the header.
    isFollowed: false,
    crewGoing: null,
    // The row's action is the watch button, which states the same thing louder
    // and one gutter away. A tick beside it is the fact twice.
    isWatching: false,
    status: 'live',
    lifecycle: show.status,
  }
}

/**
 * A crew show. `CrewShow` is deliberately thin — it carries no billing, no
 * artwork and no price — so most of the row's four lines simply never appear.
 * The going cluster is not folded in here: it is a surface concern, and the
 * crew home passes it through `footer`.
 */
export function fromCrewShow(show: CrewShow): EventRowShow {
  return {
    id: show.eventId,
    headliner: show.title,
    fallbackTitle: show.title,
    supports: [],
    tourName: null,
    imageUrl: null,
    artistPhotoUrl: null,
    venueName: venueShort(show.venue),
    venueSlug: show.venueSlug,
    dateLabel: formatEventDate(show.iso, undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    timeLabel: formatShowTime(show.showTime),
    price: null,
    saved: null,
    genres: [],
    isFollowed: false,
    crewGoing: {
      count: show.goingCount,
      names: show.going.flatMap((member) =>
        member.handle === null || member.handle === '' ? [] : [member.handle],
      ),
    },
    // Whether *you* watch it is not what this list is about; the going count
    // beneath the row is.
    isWatching: false,
    status: 'live',
    lifecycle: 'upcoming',
  }
}
