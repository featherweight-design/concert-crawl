import { describe, expect, it } from 'vitest';
import { slotScaleFor } from '@/components/consumer/image-slot/lib/slot-metrics';
import {
  SHELF_CARD_ART_SCALE,
  SHELF_CARD_BOX_CLASS,
  SHELF_CARD_PHONE,
  SHELF_CARD_WIDE,
  SHELF_RAIL_CAP_CLASS,
  SHELF_RAIL_DESKTOP_CARDS,
  SHELF_RAIL_DESKTOP_GAP,
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

  // The board lays five cards on 15px gaps in the 1040 column with room to
  // spare, and a sixth would overrun it: that is what the cap encodes.
  it('caps the desktop rail at the cards the column holds whole', () => {
    const column = 1040;
    const railOf = (cards: number) =>
      cards * SHELF_CARD_WIDE.width + (cards - 1) * SHELF_RAIL_DESKTOP_GAP;
    expect(railOf(SHELF_RAIL_DESKTOP_CARDS)).toBe(960);
    expect(railOf(SHELF_RAIL_DESKTOP_CARDS)).toBeLessThanOrEqual(column);
    expect(railOf(SHELF_RAIL_DESKTOP_CARDS + 1)).toBeGreaterThan(column);
    expect(SHELF_RAIL_CAP_CLASS).toContain(
      `nth-child(n+${SHELF_RAIL_DESKTOP_CARDS + 1})`,
    );
  });

  // Both cards share one box, so they derive one detail density from it.
  it('derives the art scale from the smallest box width', () => {
    expect(SHELF_CARD_ART_SCALE).toBe(slotScaleFor(SHELF_CARD_PHONE.width));
    expect(SHELF_CARD_ART_SCALE).toBe('hero');
  });
});
