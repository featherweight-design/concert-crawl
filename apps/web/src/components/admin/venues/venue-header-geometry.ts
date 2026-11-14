// The venue page header's geometry (`VenueHeader`), in a module free of
// client code so the route's loading skeleton (a server component) sizes its
// header from the same numbers and nothing jumps when the page arrives.
import { VENUE_STATUS_CHIP_HEIGHT } from '@/components/admin/primitives/geometry';

/** The venue glyph tile: 56 on desktop, 48 on a phone. */
export const VENUE_HEADER_TILE = { desktop: 56, phone: 48 } as const;
/** The venue name (the page's h1). */
export const VENUE_HEADER_NAME_SIZE = { desktop: 26, phone: 22 } as const;
/** The name's and the phone neighbourhood's line height (the app's 1.5). */
export const VENUE_HEADER_LINE_HEIGHT = 1.5;
/** The phone neighbourhood line under the name, and its top margin. */
export const VENUE_HEADER_NEIGHBORHOOD_SIZE = 12.5;
export const VENUE_HEADER_NEIGHBORHOOD_GAP = 2;
/** The space above the status chips' row. */
export const VENUE_HEADER_CHIPS_GAP = 6;
/** Re-crawl, View on site and the ⋯ trigger. */
export const VENUE_HEADER_BUTTON_HEIGHT = 36;
/** The phone stacks the buttons under the name block, this far below. */
export const VENUE_HEADER_PHONE_STACK_GAP = 12;

const nameBlock = (phone: boolean): number => {
  const name =
    VENUE_HEADER_NAME_SIZE[phone ? 'phone' : 'desktop'] *
    VENUE_HEADER_LINE_HEIGHT;
  const neighborhood = phone
    ? VENUE_HEADER_NEIGHBORHOOD_GAP +
      VENUE_HEADER_NEIGHBORHOOD_SIZE * VENUE_HEADER_LINE_HEIGHT
    : 0;
  return (
    name + neighborhood + VENUE_HEADER_CHIPS_GAP + VENUE_STATUS_CHIP_HEIGHT
  );
};

/**
 * The header's height with no toast or notice under it, the state it loads
 * in. Desktop is one row: tile, name block, buttons (67). The phone stacks
 * the tile and name block over one row of buttons, and assumes a venue with a
 * neighbourhood, as nearly all have (129.75).
 */
export const VENUE_HEADER_HEIGHT = {
  desktop: Math.max(
    VENUE_HEADER_TILE.desktop,
    nameBlock(false),
    VENUE_HEADER_BUTTON_HEIGHT,
  ),
  phone:
    Math.max(VENUE_HEADER_TILE.phone, nameBlock(true)) +
    VENUE_HEADER_PHONE_STACK_GAP +
    VENUE_HEADER_BUTTON_HEIGHT,
} as const;
