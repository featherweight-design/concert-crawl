export type SlotScale = 'hero' | 'tile' | 'micro'

/**
 * The source chain, discriminated by surface. An `artist` slot has no
 * `artworkUrl` field at all, so "artist surfaces never borrow event artwork"
 * (#1525) is a compile error rather than a code review.
 */
export type SlotSource =
  | { surface: 'event'; artworkUrl: string | null; photoUrl: string | null }
  | { surface: 'artist'; photoUrl: string | null }
