// The one row shape the shelf renders, whatever mode it is in.
//
// `FollowedArtist` and `ArtistSuggestion` are different API contracts; the
// shelf flattens both to this on the SERVER so the card component never has to
// ask which endpoint it came from. That is the "Spotify is a source prop, not
// a second information architecture" rule made structural.

export interface ShelfArtist {
  /**
   * Stable React key, and the one field whose source differs by mode: follows
   * key on `canonicalName`, suggestions on `slug`, because neither contract
   * carries the other's. Each is unique within its own list, which is all a
   * key needs — the two never populate the same shelf.
   */
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
  /**
   * Cheapest known ticket price for `dateLine`'s show, or null for "Price TBD".
   * Raw rather than preformatted because the card colours the row on the
   * null-vs-priced distinction, which a formatted string has already thrown away.
   */
  price: number | null
  /** Whether the viewer already follows this artist. */
  following: boolean
}

/**
 * There was a third `spotify` mode, differing from `some` in one eyebrow that
 * named the source. It went because a follow is a follow: how it got onto the
 * list is not something the shelf owes the person who built it.
 */
export type ShelfMode = 'zero' | 'some'
