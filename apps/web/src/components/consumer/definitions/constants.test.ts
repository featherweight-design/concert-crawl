import { describe, expect, it } from 'vitest';
import { slotScaleFor } from '@/components/consumer/image-slot/lib/slot-metrics';
import {
  SHELF_CARD_ART_SCALE,
  SHELF_CARD_BOX_CLASS,
  SHELF_CARD_PHONE,
  SHELF_CARD_WIDE,
  SHELF_RAIL_SCROLL_CLASS,
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

  // Both cards share one box, so they derive one detail density from it.
  it('derives the art scale from the smallest box width', () => {
    expect(SHELF_CARD_ART_SCALE).toBe(slotScaleFor(SHELF_CARD_PHONE.width));
    expect(SHELF_CARD_ART_SCALE).toBe('hero');
  });
});

describe('browse shelf rail scroll', () => {
  it('scrolls sideways and pins the vertical axis', () => {
    expect(SHELF_RAIL_SCROLL_CLASS).toContain('overflow-x-auto');
    expect(SHELF_RAIL_SCROLL_CLASS).toContain('overflow-y-hidden');
  });
});
