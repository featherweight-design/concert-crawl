// The one row shape the shelf renders, whatever mode it is in.
//
// `FollowedArtist` and `ArtistSuggestion` are different API contracts; the
// shelf flattens both to this on the SERVER so the card component never has to
// ask which endpoint it came from. That is the "Spotify is a source prop, not
// a second information architecture" rule made structural.

export interface ShelfArtist {
  /** Stable React key. Canonical name, which both sources carry. */
  key: string
  name: string
  /**
   * Null is NORMAL, not an error: a Spotify-synced act never billed in Denver
   * has no projection row and so no page. The card renders the name unlinked
   * and drops the follow badge, since the follow endpoint is keyed by slug.
   */
  slug: string | null
  photoUrl: string | null
  /** "Venue · Sep 12", or null when nothing is on the books. */
  dateLine: string | null
  /** Whether the viewer already follows this artist. */
  following: boolean
}

/**
 * `spotify` differs from `some` in exactly one string. It is kept as a mode
 * rather than a boolean so the difference stays visible at every call site
 * that has to decide which heading to render.
 */
export type ShelfMode = 'zero' | 'some' | 'spotify'
