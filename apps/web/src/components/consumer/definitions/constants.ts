// The browse shelf card box, shared by the two shelves that compete for the
// single shelf slot on browse — the Spotify taste shelf (spotify/
// DiscoveryShelf.tsx) and the native follow shelf (following/FollowShelf.tsx) —
// and by the skeleton that reserves the slot before either paints
// (spotify/DiscoveryShelfSkeleton.tsx).

import { slotScaleFor } from '@/components/consumer/image-slot/lib/slot-metrics';

/**
 * The card box at phone widths (below `sm`), in px. Sized to the B+ board
 * (bp-m-browse_m): 148 x 271 at 390, which leaves the Browse spotlight above
 * the fold. The old flat 168 x 309 pushed it below.
 */
export const SHELF_CARD_PHONE = { width: 148, height: 271 } as const;

/** The card box from `sm` up, in px. The B+ desktop board (bp-browse). */
export const SHELF_CARD_WIDE = { width: 180, height: 288 } as const;

/**
 * Both boxes as one class string, because the switch is a breakpoint and an
 * inline style cannot carry one. Written out literally so Tailwind's scanner
 * sees every class; a test pins it to the two objects above.
 *
 * The height is still a number rather than a consequence, for the reason it
 * always was: both cards used to size themselves from content, so one
 * hotlinked portrait poster could drag the whole row to 362px. With the box
 * settled, the art is a fill region that takes whatever the body leaves, and no
 * source asset can move the card.
 */
export const SHELF_CARD_BOX_CLASS =
  'w-[148px] h-[271px] sm:w-[180px] sm:h-[288px]';

/** Gap between cards: the boards' 11 at phone widths and 15 from `sm` up. */
export const SHELF_RAIL_GAP_CLASS = 'gap-[11px] sm:gap-[15px]';

/**
 * The card rails scroll sideways and only sideways. `overflow-x: auto` alone
 * computes `overflow-y` to `auto` as well (CSS never lets one axis stay
 * `visible` beside a scrolling one), so any fraction of a pixel of vertical
 * overflow, a rounded card height or the scrollbar's own track, drew a second,
 * vertical scrollbar on the row. The vertical axis is pinned to `hidden`; the
 * rails' own padding already leaves room for the cards' glow.
 */
export const SHELF_RAIL_SCROLL_CLASS = 'overflow-x-auto overflow-y-hidden';

/**
 * The identity mark's detail density for both cards' art. Each card's art is a
 * fill region whose smallest side, at the smallest box, is the card width (the
 * art is taller than it is wide in both cards), so the scale is what the slot
 * metrics derive for that width. One answer for both cards keeps the follow
 * card and the taste card drawing the same mark in the same slot.
 */
export const SHELF_CARD_ART_SCALE = slotScaleFor(SHELF_CARD_PHONE.width);
