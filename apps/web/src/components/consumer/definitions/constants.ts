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
 * asset can move the box.
 *
 * The number itself is now derived rather than chosen. #1525 pins the follow
 * card's art to 3:4, which at 168 wide is 224px, and its three-row body renders
 * at 84.17px in Chromium (16.67 name + 15 date + 16.5 price, two 7px gaps, 22px
 * of padding). Rounded up so nothing clips, that is the height below. The ratio
 * is the fixed side of this equation — if the body ever grows, this constant
 * moves and the 3:4 does not.
 */
const SHELF_CARD_ART_H = (SHELF_CARD_WIDTH * 4) / 3
const SHELF_CARD_BODY_H = 85

export const SHELF_CARD_HEIGHT = SHELF_CARD_ART_H + SHELF_CARD_BODY_H
