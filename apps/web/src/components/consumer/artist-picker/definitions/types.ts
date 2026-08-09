/**
 * One tile in the picker. Deliberately NOT `ArtistSuggestion`: the picker does
 * not care about show counts or the server's `following` flag, and the date is
 * already formatted by the time it gets here so the tile has no date logic of
 * its own.
 */
export interface PickArtist {
  slug: string
  name: string
  photoUrl: string | null
  /**
   * "Sep 12", or null when nothing is on the books. The DATE only, unlike the
   * shelf card's "Venue · Sep 12" (PK-12): a picker tile is half the width of a
   * shelf card and a venue name is the half that gets truncated to nothing.
   */
  dateLabel: string | null
}
