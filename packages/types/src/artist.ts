// Artist page response contract (#1115, PR-D). Shared by the API handler and
// the web client so the route shell (PR-E) and the embed/follow surfaces
// (PR-F) consume exactly what `GET /v1/artists/:slug` emits.

import type { EventStatus } from './event-status.js'

/** An upcoming show for this artist, ascending by date. */
export interface ArtistShow {
  eventId: string
  /** `YYYY-MM-DD`, straight from `events.date` — no timezone conversion. */
  iso: string
  /** `HH:MM:SS` local to the venue, or null when the crawl found no show time. */
  showTime: string | null
  venue: string
  venueSlug: string
  city: string | null
  /** Cheapest known ticket price, or null when unknown ("Price TBD"). */
  price: number | null
  /**
   * Cancelled and postponed shows stay in the upcoming list — a show the
   * visitor is watching must not disappear at the moment it is cancelled,
   * which is the moment they most need to see it. The row carries its status
   * so the card renders the same treatment the events list does.
   */
  status: EventStatus
}

/** A past show for this artist, descending by date. Prices are not surfaced. */
export interface ArtistPastShow {
  eventId: string
  iso: string
  venue: string
  venueSlug: string
  city: string | null
}

/**
 * `count` MUST equal `past.length` and `venues` MUST be drawn from `past` —
 * the history line ("N shows on our map — X, Y and Z") is rendered from this
 * object while the list below it is rendered from `past`, so any drift makes
 * the page contradict itself. Both are computed from one query.
 */
export interface ArtistHistory {
  count: number
  /** Deduped venue names in first-seen (most-recent-first) order. */
  venues: string[]
}

export interface ArtistDetailResponse {
  artist: {
    name: string
    slug: string
    spotifyArtistId: string | null
    photoUrl: string | null
  }
  /** Upcoming shows, ascending. */
  shows: ArtistShow[]
  /** Past shows, descending. */
  past: ArtistPastShow[]
  history: ArtistHistory
  /** Present only when the request carries a session. Null when anonymous. */
  following: boolean | null
}

/**
 * One row of `GET /v1/search/artists` (#1115 PR-G) — an artist who has a page
 * worth landing on. Structurally distinct from the event-derived artist rows
 * the search palette already renders: these carry a `slug` and route to
 * `/artists/{slug}`, not to a filtered browse query.
 */
export interface ArtistSearchResult {
  name: string
  slug: string
  /** Cached Spotify image, or null — the row renders a glyph either way. */
  photoUrl: string | null
  /** Consumer-visible upcoming shows. May be 0 for an artist with only past shows. */
  upcomingShowCount: number
  /**
   * Whether the requesting viewer follows this artist, from ANY source. Always
   * `false` for an anonymous request — the search route stays public, so there
   * is no session to read.
   */
  following: boolean
}

/** Response body for POST/DELETE `/v1/artists/:slug/follow`. */
export interface ArtistFollowResponse {
  following: boolean
}

/**
 * Every way a `user_artist_follows` row can come into existence. Ground truth
 * for `artistFollowSourceEnum` (`packages/db/src/schema/social.ts`), which is
 * declared from this tuple so the DB enum and the API contract cannot drift.
 * There is no bare `'spotify'` value — a Spotify-sourced follow is one of the
 * two `spotify_*` members.
 */
export const ARTIST_FOLLOW_SOURCES = [
  'manual',
  'spotify_followed',
  'spotify_top',
] as const

export type ArtistFollowSource = (typeof ARTIST_FOLLOW_SOURCES)[number]

/**
 * The artist's next consumer-visible Denver date. Null on a `FollowedArtist`
 * is a normal, common case — "played Denver before, nothing upcoming" — not an
 * error, and the row still renders a live follow affordance (eng spec §5.1).
 */
export interface FollowedArtistNextShow {
  eventId: string
  /** `YYYY-MM-DD`, straight from `events.date` — no timezone conversion. */
  iso: string
  venue: string
  venueSlug: string
  /**
   * Cheapest corroborated tier, falling back to `events.ticketPriceMin`. Null
   * renders "Price TBD". Resolved through the price-aggregation helpers rather
   * than read off the event scalar, which holds whatever price was written last
   * and made every surface that reached for it disagree with Event Detail
   * (#1364/#1365/#1366).
   */
  price: number | null
}

/** One row of `GET /v1/me/artist-follows`. */
export interface FollowedArtist {
  /** Display name from the follow row, not the projection. */
  name: string
  /**
   * Null when no `artists` projection row matches (or it is hidden) — a
   * Spotify-synced follow for an act that has never been billed in Denver has
   * no page to route to. The UI renders the name without a link.
   */
  slug: string | null
  canonicalName: string
  photoUrl: string | null
  source: ArtistFollowSource
  /** ISO-8601 timestamp of `user_artist_follows.created_at`. */
  followedAt: string
  nextShow: FollowedArtistNextShow | null
}

/**
 * One row of `GET /v1/artists/suggestions` — a followable artist with at least
 * one upcoming consumer-visible Denver date. Every row is followable by
 * construction (it has a `slug`, so it has a projection row), which is why
 * `slug` is non-nullable here and nullable on `FollowedArtist`.
 */
export interface ArtistSuggestion {
  name: string
  slug: string
  photoUrl: string | null
  /** Consumer-visible upcoming Denver shows. Always >= 1. */
  upcomingShowCount: number
  /** Never null — a suggestion exists because it has an upcoming date. */
  nextShow: FollowedArtistNextShow
  /**
   * Whether the requesting viewer already follows this artist. `null` when the
   * request is anonymous — there is no session to read, and `false` would be a
   * claim we cannot make.
   */
  following: boolean | null
}

/** Default and hard cap on `GET /v1/artists/suggestions?limit=`. */
export const ARTIST_SUGGESTIONS_DEFAULT_LIMIT = 12
export const ARTIST_SUGGESTIONS_MAX_LIMIT = 24

/**
 * Per-slug outcome of `POST /v1/me/artist-follows/bulk`. `already_following`
 * is a SUCCESS — the endpoint is idempotent, so re-committing a selection that
 * partially landed is never a conflict.
 */
export type BulkFollowStatus =
  'followed' | 'already_following' | 'artist_not_found'

export interface BulkFollowResult {
  slug: string
  status: BulkFollowStatus
}

export interface BulkFollowResponse {
  results: BulkFollowResult[]
  /** Slugs newly followed by this call — the count of `status: 'followed'`. */
  followedCount: number
}

/** Hard cap on `POST /v1/me/artist-follows/bulk` body length. */
export const BULK_FOLLOW_MAX_SLUGS = 50
