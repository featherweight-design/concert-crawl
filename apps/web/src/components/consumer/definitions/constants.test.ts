import { describe, expect, it } from 'vitest';
import {
  SHELF_CARD_BOX_CLASS,
  SHELF_CARD_PHONE,
  SHELF_CARD_WIDE,
  SHELF_RAIL_CAP_CLASS,
  SHELF_RAIL_DESKTOP_CARDS,
} from './constants';

// The box has to be a literal class string for Tailwind's scanner, so these
// pin the string to the numbers the boards give.
describe('browse shelf card box', () => {
  it('matches the B+ phone board (148 x 271) below sm', () => {
    expect(SHELF_CARD_PHONE).toEqual({ width: 148, height: 271 });
    expect(SHELF_CARD_BOX_CLASS).toContain(`w-[${SHELF_CARD_PHONE.width}px]`);
    expect(SHELF_CARD_BOX_CLASS).toContain(`h-[${SHELF_CARD_PHONE.height}px]`);
  });

  it('matches the B+ desktop board (180 x 288) from sm', () => {
    expect(SHELF_CARD_WIDE).toEqual({ width: 180, height: 288 });
    expect(SHELF_CARD_BOX_CLASS).toContain(`sm:w-[${SHELF_CARD_WIDE.width}px]`);
    expect(SHELF_CARD_BOX_CLASS).toContain(
      `sm:h-[${SHELF_CARD_WIDE.height}px]`,
    );
  });

  // The 1040 desktop column holds five 180px cards and four 15px gaps whole.
  it('caps the desktop rail at the cards the column holds whole', () => {
    const column = 1040;
    const rail =
      SHELF_RAIL_DESKTOP_CARDS * SHELF_CARD_WIDE.width +
      (SHELF_RAIL_DESKTOP_CARDS - 1) * 15;
    expect(rail).toBeLessThanOrEqual(column);
    expect(rail + 15 + SHELF_CARD_WIDE.width).toBeGreaterThan(column);
    expect(SHELF_RAIL_CAP_CLASS).toContain(
      `nth-child(n+${SHELF_RAIL_DESKTOP_CARDS + 1})`,
    );
  });
});
