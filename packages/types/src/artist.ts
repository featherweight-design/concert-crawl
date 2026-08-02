// Artist page response contract (#1115, PR-D). Shared by the API handler and
// the web client so the route shell (PR-E) and the embed/follow surfaces
// (PR-F) consume exactly what `GET /v1/artists/:slug` emits.

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

/** Response body for POST/DELETE `/v1/artists/:slug/follow`. */
export interface ArtistFollowResponse {
  following: boolean
}
