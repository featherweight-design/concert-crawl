// The browse shelf card box, shared by the two shelves that compete for the
// single shelf slot on browse — the Spotify taste shelf (spotify/
// DiscoveryShelf.tsx) and the native follow shelf (following/FollowShelf.tsx) —
// and by the skeleton that reserves the slot before either paints
// (spotify/DiscoveryShelfSkeleton.tsx).

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
 * How many whole cards the desktop rail shows. The B+ desktop column (1040)
 * holds five 180px cards and their gaps exactly; a sixth was drawn hard-clipped
 * at the column edge. From `lg` the rail stops at five, so every card on screen
 * is a whole one. Below `lg` the rail scrolls and the peek is the affordance.
 */
export const SHELF_RAIL_DESKTOP_CARDS = 5;

/** Hides every card past `SHELF_RAIL_DESKTOP_CARDS` from `lg` up. */
export const SHELF_RAIL_CAP_CLASS = 'lg:[&>li:nth-child(n+6)]:hidden';
