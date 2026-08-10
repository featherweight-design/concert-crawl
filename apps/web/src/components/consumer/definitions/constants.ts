// The browse shelf card box, shared by the two shelves that compete for the
// single shelf slot on browse — the Spotify taste shelf (spotify/
// DiscoveryShelf.tsx) and the native follow shelf (following/FollowShelf.tsx) —
// and by the skeleton that reserves the slot before either paints
// (spotify/DiscoveryShelfSkeleton.tsx).

/** Card width, in px. Flat across viewports; 168 renders at the 320px baseline. */
export const SHELF_CARD_WIDTH = 168

/**
 * Card height, in px, and the reason it is a number rather than a consequence.
 *
 * Both cards used to size themselves from content: art was `flex-1` over a
 * `min-h` floor, which has no intrinsic height of its own, so the card was as
 * tall as its text plus whatever the tallest image in the row dragged it to.
 * That made the taste card's height a function of one hotlinked image's aspect
 * ratio (a portrait poster took the whole row to 362px, a square one to 279px)
 * and pinned the follow card to the 116px floor at 202px, because its art is
 * absolutely positioned and contributes nothing. Two cards meant to be
 * interchangeable in one slot were 77px apart, and neither matched the 210px
 * the skeleton reserved.
 *
 * A definite height fixes all three at once: with the column's height settled,
 * `flex-1` art resolves against it instead of against the image, so no source
 * asset can move the box. 280 is the square-art taste card rounded up — the
 * shape that was already intended.
 */
export const SHELF_CARD_HEIGHT = 280
